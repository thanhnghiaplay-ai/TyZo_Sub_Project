/**
 * RE3-003 trên PostgreSQL thật riêng (TYZO_TEST_PG_URL): dòng lease bị khóa từ kết nối khác (CSDL «treo»).
 * Nhịp phải bị CSDL hủy theo statement_timeout (không giữ kết nối mãi), không chồng nhịp, và báo mất lease theo hạn.
 * Thời gian thu nhỏ (nhịp 40 ms, hạn 600 ms, timeout 150 ms) thay cho 30 s / 150 s / 10 s; cùng một logic.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Sql } from "../db.ts";
import { realPgSql } from "../test-sql.ts";
import { boundedBeat, leaseMetrics, startBeat } from "./work-lease.ts";
import { beginWork, acquireWork } from "./work-admission.ts";

const pgTest = process.env.TYZO_TEST_PG_URL ? test : test.skip;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let sql: Sql;
let end: (() => Promise<void>) | undefined;
before(async () => {
  const db = await realPgSql();
  if (db) ({ sql, end } = db);
});
after(async () => {
  await end?.();
});

pgTest("RE3-003: CSDL treo (khóa dòng) → nhịp bị hủy ở máy chủ, không chồng, mất lease theo hạn", async () => {
  await sql`insert into work_admissions (id, user_id, provider, model, lane) values ('stall', 'u', 'p', 'm', 'batch')`;
  let holdRelease!: () => void;
  const held = new Promise<void>((r) => (holdRelease = r));
  let locked!: () => void;
  const isLocked = new Promise<void>((r) => (locked = r));
  // Kết nối khác giữ khóa dòng 900 ms.
  const blocker = sql.begin!(async (tx) => {
    await tx`select id from work_admissions where id = 'stall' for update`;
    locked();
    await held;
  });
  await isLocked;
  const lost: string[] = [];
  let running = 0,
    peak = 0,
    calls = 0;
  const failuresBefore = leaseMetrics().failures;
  const t0 = Date.now();
  const stop = startBeat(
    async (signal) => {
      calls += 1;
      running += 1;
      peak = Math.max(peak, running);
      try {
        return await boundedBeat(
          sql,
          (tx) => tx`update work_admissions set heartbeat_at = clock_timestamp() where id = 'stall' returning id`,
          { timeoutMs: 150, signal },
        );
      } finally {
        running -= 1;
      }
    },
    { everyMs: 40, staleMs: 600, onLost: (why) => lost.push(why) },
  );
  await wait(900);
  holdRelease();
  await blocker;
  await stop();
  assert.equal(peak, 1, "chồng nhịp khi CSDL treo");
  assert.ok(calls >= 3 && calls <= 8, `số nhịp ${calls}`);
  assert.ok(leaseMetrics().failures - failuresBefore >= 3, "lỗi timeout không được đếm");
  assert.deepEqual(lost, ["deadline"]);
  assert.ok(Date.now() - t0 < 2000);
});

pgTest("RE3-003: lease đã bị quét thành unknown → nhịp 0 dòng (fenced); hoàn tất muộn ghi done một lần", async () => {
  await sql`delete from work_admissions`;
  const release = await beginWork(sql, { userId: "late", provider: "p", model: "m", lane: "batch" });
  assert.ok(release);
  const id = (await sql<{ id: string }>`select id from work_admissions where user_id = 'late'`)[0].id;
  // Giả lập nhịp quá hạn rồi một bản khác vào cửa: lần nhận việc quét lease cũ thành unknown.
  await sql`update work_admissions set heartbeat_at = clock_timestamp() - interval '1 hour' where id = ${id}`;
  await acquireWork(sql, { userId: "other", provider: "p", model: "m", lane: "batch" });
  assert.equal((await sql<{ status: string }>`select status from work_admissions where id = ${id}`)[0].status, "unknown");
  const beat = await boundedBeat(
    sql,
    (tx) => tx`update work_admissions set heartbeat_at = clock_timestamp()
      where id = ${id} and status = 'running' and heartbeat_at > clock_timestamp() - interval '150 seconds' returning id`,
  );
  assert.deepEqual(beat, [], "lease đã mất mà nhịp vẫn cập nhật");
  await release!("done");
  await release!("done");
  assert.equal((await sql<{ status: string }>`select status from work_admissions where id = ${id}`)[0].status, "done");
});
