/**
 * RE6-007: tyzo_admit (0057) trên PostgreSQL thật riêng (TYZO_TEST_PG_URL, CSDL đã chạy migrate). Dữ liệu tổng hợp.
 * Đúng đắn: 1k/5k khách chờ, ký tự lạ trong khóa JSON, điều kiện được xét, trần dùng chung, phần dành cho live,
 * burst 300 không vượt trần. Đo: độ trễ theo số khách chờ, đồng thời 25/50/100/200, burst 300.
 * RE6_BENCH_OUT=<tệp> để ghi kết quả đo dạng JSON.
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import pg from "pg";

const URL_ = process.env.TYZO_TEST_PG_URL;
const pgTest = URL_ ? test : test.skip;
const DEF = { enabled: true, batch: 48, modal: 8, live: 48, perUser: 2, perUserModal: 3, perProvider: 40, perModel: 24, liveReserve: 0 };
let pool;
const bench = {};
before(() => { if (URL_) pool = new pg.Pool({ connectionString: URL_, max: 320 }); });
after(async () => {
  if (process.env.RE6_BENCH_OUT && Object.keys(bench).length) writeFileSync(process.env.RE6_BENCH_OUT, JSON.stringify(bench, null, 1));
  await pool?.end();
});
const q = (text, values) => pool.query(text, values);
beforeEach(async () => {
  if (!pool) return;
  await q("delete from work_admissions"); await q("delete from run_async_asr_jobs"); await q("delete from work_waiters");
  await q("delete from room_settings where key = 'work_admission'");
});
const limits = (v) => q(`insert into room_settings (key, value) values ('work_admission', $1)
  on conflict (key) do update set value = excluded.value`, [JSON.stringify({ ...DEF, ...v })]);
let seq = 0;
async function admit(user, provider, model, lane, client = pool) {
  const id = `a${++seq}`;
  const t = performance.now();
  const r = (await client.query("select tyzo_admit($1,$2,$3,$4,$5,$6::jsonb,60,null) r", [id, user, provider, model, lane, JSON.stringify(DEF)])).rows[0].r;
  return { ok: r === id, r, ms: performance.now() - t };
}
/** Khách chờ: eligible = đã chờ ≥ 3 s và còn hiện diện; stale = bỏ đi quá 6 s; fresh = mới chờ < 3 s. */
async function seedWaiters(n, { kind = "eligible", provider = "p2", model = "m2", lane = "batch", prefix = "w" } = {}) {
  const since = kind === "fresh" ? "clock_timestamp()" : "clock_timestamp() - interval '20 seconds'";
  const seen = kind === "stale" ? "clock_timestamp() - interval '10 seconds'" : "clock_timestamp()";
  await q(`insert into work_waiters (user_id, provider, model, lane, since, seen_at)
    select $1 || g, $2, $3, $4, ${since} + g * interval '1 microsecond', ${seen} from generate_series(1, $5) g`, [prefix, provider, model, lane, n]);
}
async function running(provider, model, lane, n, prefix = "r") {
  await q(`insert into work_admissions (id, user_id, provider, model, lane) select $1 || g, $1 || g, $2, $3, $4 from generate_series(1, $5) g`, [prefix + provider + lane, provider, model, lane, n]);
}
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? +s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)].toFixed(2) : null; };
const dist = (xs) => ({ n: xs.length, p50: pct(xs, 50), p95: pct(xs, 95), p99: pct(xs, 99), max: pct(xs, 100) });

pgTest("RE6-007: ký tự lạ trong mã khách/nhà/model không làm lẫn khóa JSON", async () => {
  await limits({ perUser: 1 });
  const odd = ['u1","batch', 'u1', 'a\\"b', "[]", "{,}", "Nguyễn\u0000x".replace("\u0000", ""), "😀", " ", "a'b;--"];
  for (const u of odd) assert.equal((await admit(u, 'p"[1]', 'm,"x', "batch")).ok, true, `lượt đầu ${JSON.stringify(u)}`);
  for (const u of odd) assert.equal((await admit(u, 'p"[1]', 'm,"x', "batch")).r, "busy", `suất riêng ${JSON.stringify(u)}`);
  // Nhà/model khác nhau chỉ ở dấu nháy và phẩy: trần model đếm riêng.
  await limits({ perUser: 5, perModel: 1 });
  assert.equal((await admit("x1", "p", 'a","b', "batch")).ok, true);
  assert.equal((await admit("x2", 'p","a', "b", "batch")).ok, true);
  assert.equal((await admit("x3", "p", 'a","b', "batch")).r.startsWith("busy:"), true);
});

pgTest("RE6-007: 5k khách chờ cũ/mới/không chung tài nguyên không chặn khách mới", async () => {
  await seedWaiters(5000, { kind: "stale", provider: "p1", lane: "batch", prefix: "s" });
  await seedWaiters(5000, { kind: "fresh", provider: "p1", lane: "batch", prefix: "f" });
  await seedWaiters(5000, { kind: "eligible", provider: "p9", lane: "modal", prefix: "o" });
  const r = await admit("new", "p1", "m1", "batch");
  assert.equal(r.ok, true, r.r);
});

pgTest("RE6-007: 1k khách chờ đủ điều kiện, chung lane, được nhường theo thứ tự đến; vị trí đúng", async () => {
  await limits({ batch: 10, perProvider: 100, perModel: 100 });
  await seedWaiters(1000, { provider: "p2", lane: "batch" });
  const r = await admit("new", "p1", "m1", "batch");
  assert.equal(r.ok, false);
  assert.equal(r.r, "busy:11", "10 suất trống nhường 10 người đầu, khách mới đứng thứ 11");
  // Khách chờ thứ nhất đến lượt thì nhận được.
  assert.equal((await admit("w1", "p2", "m2", "batch")).ok, true);
});

pgTest("RE6-007: khách chờ không nhận được suất trên tài nguyên của chính họ thì không giữ chỗ", async () => {
  await limits({ batch: 10, perProvider: 100, perModel: 2 });
  await running("p2", "m2", "batch", 2);
  await seedWaiters(1000, { provider: "p2", model: "m2", lane: "batch" });
  assert.equal((await admit("new", "p1", "m1", "batch")).ok, true);
});

pgTest("RE6-007: phần dành cho live: batch không lấy, khách chờ batch không giữ phần dành riêng", async () => {
  await limits({ perProvider: 10, liveReserve: 4, perModel: 50, perUser: 50 });
  let ok = 0;
  for (let i = 0; i < 12; i++) ok += (await admit(`b${i}`, "ali", "asr", "batch")).ok;
  assert.equal(ok, 6);
  await seedWaiters(1000, { provider: "ali", model: "asr", lane: "batch", prefix: "bw" });
  let live = 0;
  for (let i = 0; i < 6; i++) live += (await admit(`l${i}`, "ali", "lt", "live")).ok;
  assert.equal(live, 4);
});

function counts(rows) {
  const by = (f) => rows.reduce((m, r) => m.set(f(r), (m.get(f(r)) ?? 0) + 1), new Map());
  return { lane: by((r) => r.lane), prov: by((r) => r.provider), model: by((r) => `${r.provider}|${r.model}`), user: by((r) => `${r.user_id}|${r.lane}`), nonlive: by((r) => (r.lane === "live" ? "-" : r.provider)) };
}

pgTest("RE6-007: burst 300 đồng thời, trộn lane/nhà/model, không vượt trần nào", async () => {
  const L = { batch: 20, modal: 6, live: 30, perUser: 2, perUserModal: 3, perProvider: 25, perModel: 12, liveReserve: 5 };
  await limits(L);
  await seedWaiters(1000, { provider: "ali", lane: "batch", prefix: "bw" });
  const lanes = ["batch", "modal", "live"]; const provs = ["ali", "groq", "modal"];
  const t0 = performance.now();
  const res = await Promise.all(Array.from({ length: 300 }, (_, i) => admit(`u${i % 120}`, provs[i % 3], `m${i % 4}`, lanes[(i >> 1) % 3])));
  const wall = performance.now() - t0;
  const rows = (await q("select user_id, provider, model, lane from work_admissions where status = 'running'")).rows;
  assert.equal(rows.length, res.filter((r) => r.ok).length);
  const c = counts(rows);
  for (const [k, n] of c.lane) assert.ok(n <= L[k], `lane ${k}=${n}`);
  for (const [k, n] of c.prov) assert.ok(n <= L.perProvider, `nhà ${k}=${n}`);
  for (const [k, n] of c.model) assert.ok(n <= L.perModel, `model ${k}=${n}`);
  for (const [k, n] of c.user) assert.ok(n <= (k.endsWith("|modal") ? L.perUserModal : L.perUser), `khách ${k}=${n}`);
  for (const [k, n] of c.nonlive) if (k !== "-") assert.ok(n <= L.perProvider - L.liveReserve, `không-live ${k}=${n}`);
  bench.burst300 = { admitted: rows.length, wall_ms: +wall.toFixed(1), latency_ms: dist(res.map((r) => r.ms)), waiters: 1000 };
});

pgTest("RE6-007: đo độ trễ theo số khách chờ (0/1k/5k) và đồng thời 25/50/100/200", { timeout: 600_000 }, async () => {
  bench.env = (await q("select version() v")).rows[0].v;
  bench.byWaiters = {};
  for (const w of [0, 1000, 5000]) {
    await q("delete from work_waiters"); await q("delete from work_admissions");
    await limits({ perModel: 0 > 1 ? 1 : 24 });
    // Khách chờ chung lane batch, nhà p2 đã đầy model → duyệt hết vòng lặp mà không ai giữ chỗ (trường hợp xấu nhất).
    await running("p2", "m2", "batch", 24);
    if (w) await seedWaiters(w, { provider: "p2", model: "m2", lane: "batch" });
    const xs = [];
    for (let i = 0; i < 60; i++) {
      const r = await admit(`n${i}`, "p1", "m1", "batch");
      assert.equal(r.ok, true);
      await q("delete from work_admissions where user_id = $1", [`n${i}`]);
      if (i >= 10) xs.push(r.ms);
    }
    bench.byWaiters[w] = dist(xs);
  }
  bench.burst300ByWaiters = {};
  // Mở sẵn 300 kết nối để burst chỉ đo tyzo_admit, không đo bắt tay kết nối.
  const warm = await Promise.all(Array.from({ length: 300 }, () => pool.connect())); warm.forEach((c) => c.release());
  for (const w of [0, 1000, 5000]) {
    await q("delete from work_waiters"); await q("delete from work_admissions");
    await running("p2", "m2", "batch", 24);
    if (w) await seedWaiters(w, { provider: "p2", model: "m2", lane: "batch" });
    const t0 = performance.now();
    const res = await Promise.all(Array.from({ length: 300 }, (_, i) => admit(`b${w}_${i}`, `p${i % 3}`, `m${i % 5}`, i % 4 === 0 ? "live" : "batch")));
    bench.burst300ByWaiters[w] = { admitted: res.filter((r) => r.ok).length, wall_ms: +(performance.now() - t0).toFixed(0), latency_ms: dist(res.map((r) => r.ms)) };
  }
  bench.concurrency = {};
  await q("delete from work_waiters"); await q("delete from work_admissions");
  await seedWaiters(1000, { provider: "p2", model: "m2", lane: "batch" });
  await running("p2", "m2", "batch", 24);
  for (const c of [25, 50, 100, 200]) {
    const xs = []; let ok = 0; const each = 10;
    const t0 = performance.now();
    await Promise.all(Array.from({ length: c }, async (_, k) => {
      const cl = await pool.connect();
      try {
        for (let i = 0; i < each; i++) {
          const u = `c${c}_${k}_${i}`;
          const r = await admit(u, `p${k % 3}`, `m${k % 5}`, k % 4 === 0 ? "live" : "batch", cl);
          xs.push(r.ms); ok += r.ok;
          if (r.ok) await cl.query("delete from work_admissions where user_id = $1", [u]);
        }
      } finally { cl.release(); }
    }));
    const wall = performance.now() - t0;
    bench.concurrency[c] = { calls: c * each, admitted: ok, wall_ms: +wall.toFixed(0), calls_per_s: +((c * each) / (wall / 1000)).toFixed(0), latency_ms: dist(xs), waiters: 1000 };
  }
});
