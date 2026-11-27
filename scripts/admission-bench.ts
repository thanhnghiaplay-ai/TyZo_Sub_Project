/**
 * RE3-004/005: benchmark cửa nhận việc trên PostgreSQL thật RIÊNG (chỉ 127.0.0.1:55439), nhiều «máy ứng dụng» (pool).
 * Upstream giả (giữ suất 50–200 ms). Đo độ trễ vào cửa p50/p95/p99, tỉ lệ 429, vượt giới hạn (lấy mẫu từ CSDL), lỗi/deadlock.
 * Không gọi nhà cung cấp; không phải số đo GPU/ASR. Ra JSON ở stdout, từng nhóm ở stderr.
 *   node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/admission-bench.ts [seconds=8]
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import pg from "pg";
import type { Sql } from "../src/lib/db.ts";
import {
  withWorkAdmission,
  AdmissionBusy,
  DEFAULT_ADMISSION,
  type WorkKey,
} from "../src/lib/billing/work-admission.ts";

const url = new URL(process.env.TYZO_TEST_PG_URL ?? "postgresql://invalid");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55439");
const seconds = Number(process.argv[2] ?? 8);
const INSTANCES = 4;
const schema = `bench_${process.pid}`;
pg.types.setTypeParser(20, Number);

function wrap(run: (text: string, params: unknown[]) => Promise<unknown[]>): Sql {
  return (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run(text, values);
  }) as unknown as Sql;
}
function sqlOf(pool: pg.Pool): Sql {
  const sql = wrap(async (t, p) => (await pool.query(t, p)).rows);
  sql.begin = async (fn) => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const tx = wrap(async (t, p) => (await c.query(t, p)).rows);
      tx.begin = (inner) => inner(tx);
      const out = await fn(tx);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  };
  return sql;
}

const admin = new pg.Pool({ connectionString: url.toString(), max: 2 });
await admin.query(`create schema ${schema}`);
const migrations = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(migrations)
  .filter((n) => n.endsWith(".sql"))
  .sort())
  await admin.query(`set search_path=${schema}; ${readFileSync(new URL(f, migrations), "utf8")}`);
const pools = Array.from(
  { length: INSTANCES },
  () => new pg.Pool({ connectionString: url.toString(), max: 10, options: `-c search_path=${schema}` }),
);
const sqls = pools.map(sqlOf);
const monitor = new pg.Pool({ connectionString: url.toString(), max: 1, options: `-c search_path=${schema}` });

const pct = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)].toFixed(2);
};
const keyFor = (i: number): WorkKey => {
  const r = i % 10;
  if (r < 6) return { userId: `u${i}`, provider: "groq", model: "whisper-large-v3-turbo", lane: "batch" };
  if (r < 7) return { userId: `u${i}`, provider: "alibaba", model: "qwen3-asr-flash-filetrans", lane: "batch" };
  if (r < 9)
    return { userId: `u${i}`, provider: "alibaba", model: "qwen3-livetranslate-flash-realtime", lane: "live" };
  return { userId: `u${i}`, provider: "tyzo", model: "tyzo-gpu", lane: "modal" };
};

type Row = { lane: string; provider: string; model: string; user_id: string };
async function sampleViolations(stopAt: number) {
  const limits = DEFAULT_ADMISSION as Record<string, number>;
  const worst = { lane: 0, provider: 0, model: 0, samples: 0 };
  const peaks: Record<string, number> = {};
  while (performance.now() < stopAt) {
    const rows = (
      await monitor.query(
        `select lane, provider, model, user_id from work_admissions where status in ('running','unknown')`,
      )
    ).rows as Row[];
    const count = (f: (r: Row) => string) => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(f(r), (m.get(f(r)) ?? 0) + 1);
      return m;
    };
    for (const [lane, n] of count((r) => r.lane)) {
      peaks[`lane:${lane}`] = Math.max(peaks[`lane:${lane}`] ?? 0, n);
      if (n > limits[lane]) worst.lane += 1;
    }
    for (const [p, n] of count((r) => r.provider)) {
      peaks[`provider:${p}`] = Math.max(peaks[`provider:${p}`] ?? 0, n);
      if (n > limits.perProvider) worst.provider += 1;
    }
    for (const [m, n] of count((r) => `${r.provider}/${r.model}`)) {
      peaks[`model:${m}`] = Math.max(peaks[`model:${m}`] ?? 0, n);
      if (n > limits.perModel) worst.model += 1;
    }
    worst.samples += 1;
    await new Promise((r) => setTimeout(r, 15));
  }
  return { violations: worst, peaks };
}

type Tally = { ok: number; busy: number; uncertain: number; error: number };
function classify(e: unknown, out: Tally, errors: string[]) {
  if (e instanceof AdmissionBusy && e.status === 409) out.uncertain += 1;
  else if (e instanceof AdmissionBusy) out.busy += 1;
  else {
    out.error += 1;
    if (errors.length < 5) errors.push(String((e as Error)?.message ?? e).slice(0, 160));
  }
}

async function cohort(clients: number, durationMs: number) {
  const lat: number[] = [];
  const out: Tally = { ok: 0, busy: 0, uncertain: 0, error: 0 };
  const errors: string[] = [];
  const stopAt = performance.now() + durationMs;
  const sampler = sampleViolations(stopAt + 300);
  const perClient = new Array<number>(clients).fill(0);
  // RE5-005: theo lane, và thời gian dài nhất một khách không được nhận (không phụ thuộc độ dài cửa sổ).
  const byLane = new Map<string, { lat: number[]; ok: number; busy: number }>();
  const laneOf = (i: number) => keyFor(i).lane;
  const lastOk = new Array<number>(clients).fill(0);
  const maxGap = new Array<number>(clients).fill(0);
  const t0 = performance.now();
  lastOk.fill(t0);
  await Promise.all(
    Array.from({ length: clients }, async (_, i) => {
      const sql = sqls[i % INSTANCES];
      while (performance.now() < stopAt) {
        const t = performance.now();
        let entered = 0;
        try {
          await withWorkAdmission(sql, keyFor(i), async () => {
            entered = performance.now();
            await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));
          });
          lat.push(entered - t);
          out.ok += 1;
          perClient[i] += 1;
          const L = byLane.get(laneOf(i)) ?? { lat: [], ok: 0, busy: 0 };
          L.lat.push(entered - t); L.ok += 1; byLane.set(laneOf(i), L);
          maxGap[i] = Math.max(maxGap[i], entered - lastOk[i]);
          lastOk[i] = performance.now();
        } catch (e) {
          classify(e, out, errors);
          lat.push(performance.now() - t);
          const L = byLane.get(laneOf(i)) ?? { lat: [], ok: 0, busy: 0 };
          L.busy += 1; byLane.set(laneOf(i), L);
          await new Promise((r) => setTimeout(r, 100 + Math.random() * 100)); // Retry-After thu nhỏ
        }
      }
    }),
  );
  const s = await sampler;
  const end = performance.now();
  const seconds = (end - t0) / 1000;
  // Khách chưa được nhận lần nào: khoảng chờ tính tới cuối đợt.
  for (let i = 0; i < clients; i++) maxGap[i] = Math.max(maxGap[i], end - lastOk[i]);
  const lanes = Object.fromEntries([...byLane].map(([lane, v]) => {
    const gaps = maxGap.filter((_, i) => laneOf(i) === lane);
    return [lane, { clients: gaps.length, ok: v.ok, busy: v.busy, p50: pct(v.lat, 50), p95: pct(v.lat, 95), p99: pct(v.lat, 99),
      maxGapMs: { p50: pct(gaps, 50), p95: pct(gaps, 95), max: pct(gaps, 100) } }];
  }));
  // RE2-004: công bằng — mỗi khách được nhận bao nhiêu lượt; 0 lượt = bị «đói».
  const fairness = {
    starved: perClient.filter((n) => n === 0).length,
    min: Math.min(...perClient),
    p10: pct(perClient, 10),
    median: pct(perClient, 50),
    admissionsPerSecond: +(out.ok / seconds).toFixed(1),
    attemptsPerSecond: +((out.ok + out.busy + out.uncertain + out.error) / seconds).toFixed(1),
  };
  return { clients, ...out, p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99), max: pct(lat, 100), fairness, lanes, errors, ...s };
}

async function burst(n: number) {
  const lat: number[] = [];
  const out: Tally = { ok: 0, busy: 0, uncertain: 0, error: 0 };
  const errors: string[] = [];
  let open!: () => void;
  const gate = new Promise<void>((r) => (open = r));
  const sampler = sampleViolations(performance.now() + 1500);
  setTimeout(() => open(), 1200);
  await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      const t = performance.now();
      try {
        await withWorkAdmission(sqls[i % INSTANCES], keyFor(i), async () => {
          lat.push(performance.now() - t);
          await gate;
        });
        out.ok += 1;
      } catch (e) {
        lat.push(performance.now() - t);
        classify(e, out, errors);
      }
    }),
  );
  const s = await sampler;
  return { burst: n, ...out, p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99), max: pct(lat, 100), errors, ...s };
}

const reset = () =>
  admin.query(
    `update ${schema}.work_admissions set status='done', finished_at=clock_timestamp() where status in ('running','unknown')`,
  );
const results: unknown[] = [];
try {
  for (const c of [25, 50, 100, 200]) {
    await reset();
    const r = await cohort(c, seconds * 1000);
    results.push(r);
    console.error(JSON.stringify(r));
  }
  await reset();
  const b = await burst(300);
  results.push(b);
  console.error(JSON.stringify(b));
  const history = (await admin.query(`select count(*)::int n from ${schema}.work_admissions`)).rows[0].n;
  console.log(
    JSON.stringify(
      {
        scope: "admission only; 4 pools x 10 connections; synthetic upstream hold 50-200 ms; local PostgreSQL 16",
        seconds,
        limits: DEFAULT_ADMISSION,
        historyRows: history,
        results,
      },
      null,
      1,
    ),
  );
} finally {
  await Promise.all([...pools, monitor].map((p) => p.end()));
  // Schema thử tạm của chính lần chạy này (bench_<pid>) trong CSDL thử riêng.
  await admin.query(`drop schema if exists ${schema} cascade`);
  await admin.end();
}
