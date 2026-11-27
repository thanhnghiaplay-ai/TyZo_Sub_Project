/**
 * RE3-005 / RE3-006 trên PostgreSQL thật riêng (TYZO_TEST_PG_URL). Dữ liệu tổng hợp.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import type { Sql } from "../db.ts";
import { realPgSql } from "../test-sql.ts";
import { acquireWork, acquireWorkInfo, releaseWork, sweepAdmissions, tagWork, AdmissionUncertain } from "./work-admission.ts";

const pgTest = process.env.TYZO_TEST_PG_URL ? test : test.skip;
let sql: Sql;
let end: (() => Promise<void>) | undefined;
before(async () => {
  const db = await realPgSql();
  if (db) ({ sql, end } = db);
});
after(async () => {
  await end?.();
});
beforeEach(async () => {
  if (!sql) return;
  await sql`delete from work_admissions`;
  await sql`delete from run_async_asr_jobs`;
  // Yêu cầu bị từ chối ở test trước vẫn «đang chờ» 6 giây và được xếp trước (đúng thiết kế RE2-004): dọn giữa các test.
  await sql`delete from work_waiters`;
  await sql`delete from room_settings where key = 'work_admission'`;
});
const limits = (v: Record<string, unknown>) =>
  sql`insert into room_settings (key, value) values ('work_admission', ${JSON.stringify(v)})
      on conflict (key) do update set value = excluded.value`;

pgTest("RE3-005: cap mỗi nhà đếm trên mọi lane — batch + live đồng thời không vượt", async () => {
  await limits({ perProvider: 10, perModel: 50, batch: 50, live: 50, perUser: 5 });
  const tries = await Promise.all(
    Array.from({ length: 40 }, (_, i) =>
      acquireWork(sql, {
        userId: `u${i}`,
        provider: "alibaba",
        model: i % 2 ? "live-m" : "asr-m",
        lane: i % 2 ? "live" : "batch",
      }),
    ),
  );
  assert.equal(tries.filter(Boolean).length, 10);
  const n = await sql<{ n: number }>`select count(*)::int n from work_admissions where provider='alibaba' and status='running'`;
  assert.equal(n[0].n, 10);
});

pgTest("RE3-005: cap mỗi model đếm trên mọi lane", async () => {
  await limits({ perProvider: 50, perModel: 3, batch: 50, live: 50, perUser: 5 });
  const got = [];
  for (const lane of ["batch", "live", "batch", "live"] as const)
    got.push(await acquireWork(sql, { userId: `m${got.length}`, provider: "p", model: "same", lane }));
  assert.deepEqual(got.map(Boolean), [true, true, true, false]);
});

pgTest("RE3-005: suất dành cho live — batch không chiếm được phần dành riêng", async () => {
  await limits({ perProvider: 10, perModel: 50, batch: 50, live: 50, perUser: 5, liveReserve: 4 });
  const batch = await Promise.all(
    Array.from({ length: 20 }, (_, i) => acquireWork(sql, { userId: `b${i}`, provider: "alibaba", model: "asr", lane: "batch" })),
  );
  assert.equal(batch.filter(Boolean).length, 6);
  const live = await Promise.all(
    Array.from({ length: 10 }, (_, i) => acquireWork(sql, { userId: `l${i}`, provider: "alibaba", model: "live", lane: "live" })),
  );
  assert.equal(live.filter(Boolean).length, 4);
});

pgTest("RE3-005: job async đang gửi (suất cùng mã lệnh) không bị đếm hai lần; sau khi nhả suất thì job vẫn chiếm chỗ", async () => {
  await limits({ perProvider: 2, perModel: 50, batch: 50, live: 50, perUser: 5 });
  await sql`insert into room_accounts (user_id, balance) values ('aj', 0) on conflict do nothing`;
  await sql`insert into run_tickets (id, user_id, file_name, seconds, rate, held, status) values ('tk-aj', 'aj', 'f', 60, 1, 100, 'dang-giu')`;
  await sql`insert into run_gate_calls (id, ticket_id, reserved, status) values ('call-aj', 'tk-aj', 10, 'dang-chay')`;
  const a = await acquireWork(sql, { userId: "aj", provider: "alibaba", model: "asr", lane: "batch" });
  assert.ok(a);
  await sql`insert into run_async_asr_jobs (id, user_id, ticket_id, request_hash, call_id, provider, model, price_book, unit_book)
    values ('job-aj', 'aj', 'tk-aj', 'h', 'call-aj', 'alibaba', 'asr', '{}', '{}')`;
  await tagWork(sql, a!, "call-aj");
  // Đang gửi: suất + job cùng mã = 1. Còn 1 chỗ cho người khác.
  assert.ok(await acquireWork(sql, { userId: "x1", provider: "alibaba", model: "asr", lane: "batch" }));
  await sql`delete from work_admissions where user_id = 'x1'`;
  await releaseWork(sql, a!);
  // Đã nhả suất, job vẫn chạy: job chiếm 1.
  assert.ok(await acquireWork(sql, { userId: "x2", provider: "alibaba", model: "asr", lane: "batch" }));
  assert.equal(await acquireWork(sql, { userId: "x3", provider: "alibaba", model: "asr", lane: "batch" }), null);
});

async function staleUnknown(ref: string | null) {
  const id = await acquireWork(sql, { userId: `s-${ref}`, provider: "groq", model: "m", lane: "batch" });
  if (ref) await tagWork(sql, id!, ref);
  await sql`update work_admissions set heartbeat_at = clock_timestamp() - interval '1 hour' where id = ${id}`;
  // Lần vào cửa kế tiếp đánh lease quá hạn thành unknown (không đối soát ở đây).
  await acquireWork(sql, { userId: `probe-${ref}`, provider: "other", model: "o", lane: "modal" });
  assert.equal((await sql<{ status: string }>`select status from work_admissions where id = ${id}`)[0].status, "unknown");
  return id!;
}

pgTest("RE3-006: unknown KHÔNG tự giải phóng theo thời gian; chỉ khi có bằng chứng định đoạt, có nhật ký", async () => {
  await sql`insert into run_tickets (id, user_id, file_name, seconds, rate, held, status) values ('tk6', 'u6', 'f', 60, 1, 100, 'dang-giu') on conflict do nothing`;
  for (const [id, status] of [
    ["c-xong", "xong"],
    ["c-loi", "loi"],
    ["c-mat", "mat-phan-hoi"],
    ["c-soat", "can-doi-soat"],
    ["c-chay", "dang-chay"],
  ])
    await sql`insert into run_gate_calls (id, ticket_id, reserved, status) values (${id}, 'tk6', 0, ${status})`;
  const ids: Record<string, string> = {};
  for (const ref of ["c-xong", "c-loi", "c-mat", "c-soat", "c-chay", null]) ids[String(ref)] = await staleUnknown(ref);
  // Chạy đua: ba bản cùng đối soát.
  const runs = await Promise.all([sweepAdmissions(sql), sweepAdmissions(sql), sweepAdmissions(sql)]);
  assert.equal(runs.reduce((n, r) => n + r.resolved, 0), 2, "đúng hai suất có bằng chứng được mở, mỗi suất một lần");
  const status = async (k: string) =>
    (await sql<{ status: string }>`select status from work_admissions where id = ${ids[k]}`)[0].status;
  assert.equal(await status("c-xong"), "resolved");
  assert.equal(await status("c-loi"), "resolved");
  for (const k of ["c-mat", "c-soat", "c-chay", "null"]) assert.equal(await status(k), "unknown", k);
  const audit = await sql<{ note: string }>`select note from room_audit where action = 'tu-doi-soat-suat' order by note`;
  assert.equal(audit.length, 2);
  assert.ok(audit.every((a) => JSON.parse(a.note).evidence.startsWith("run_gate_calls:")));
  // Người dùng có unknown không bằng chứng vẫn bị chặn gửi trùng (409).
  await assert.rejects(
    acquireWork(sql, { userId: "s-null", provider: "groq", model: "m", lane: "batch" }),
    (e) => e instanceof AdmissionUncertain,
  );
});

pgTest("RE3-006: sự cố diện rộng — 30 suất unknown có bằng chứng được mở dần theo lô, cửa nhận việc hồi phục", async () => {
  await limits({ perProvider: 30, perModel: 30, batch: 30, live: 30, perUser: 5 });
  await sql`insert into run_tickets (id, user_id, file_name, seconds, rate, held, status) values ('tkw', 'uw', 'f', 60, 1, 100, 'dang-giu') on conflict do nothing`;
  for (let i = 0; i < 30; i++) {
    await sql`insert into run_gate_calls (id, ticket_id, reserved, status) values (${`w${i}`}, 'tkw', 0, 'xong')`;
    const id = await acquireWork(sql, { userId: `w${i}`, provider: "groq", model: "m", lane: "batch", ref: `w${i}` });
    assert.ok(id);
  }
  await sql`update work_admissions set heartbeat_at = clock_timestamp() - interval '1 hour'`;
  assert.equal(await acquireWork(sql, { userId: "new", provider: "groq", model: "m", lane: "batch" }), null, "đủ suất khi sự cố");
  const first = await sweepAdmissions(sql, 20);
  const second = await sweepAdmissions(sql, 20);
  assert.deepEqual([first.resolved, second.resolved], [20, 10]);
  assert.ok(await acquireWork(sql, { userId: "new", provider: "groq", model: "m", lane: "batch" }));
});

pgTest("RE2-004: hàng chờ công bằng — suất trống trao cho người xếp trước, người đến sau thấy vị trí", async () => {
  await sql`delete from work_waiters`;
  await limits({ perProvider: 50, perModel: 1, batch: 50, live: 50, perUser: 5 });
  const key = (u: string) => ({ userId: u, provider: "groq", model: "q", lane: "batch" as const });
  const a = await acquireWorkInfo(sql, key("A"));
  assert.ok(a.id);
  const b = await acquireWorkInfo(sql, key("B"));
  const c = await acquireWorkInfo(sql, key("C"));
  assert.deepEqual([b.id, b.position, c.id, c.position], [null, 1, null, 2]);
  await releaseWork(sql, a.id!);
  // B và C đã chờ quá ngưỡng chống đói (3 giây): suất trống giữ theo thứ tự xếp.
  await sql`update work_waiters set since = since - interval '10 seconds'`;
  // C thử lại trước B: vẫn phải nhường B (B đang chờ, xếp trước).
  const c2 = await acquireWorkInfo(sql, key("C"));
  assert.deepEqual([c2.id, c2.position], [null, 2]);
  const b2 = await acquireWorkInfo(sql, key("B"));
  assert.ok(b2.id, "người xếp trước phải nhận suất");
  await releaseWork(sql, b2.id!);
  const c3 = await acquireWorkInfo(sql, key("C"));
  assert.ok(c3.id);
  await releaseWork(sql, c3.id!);
});

pgTest("RE2-004: người xếp trước đã bỏ đi (quá 6 giây không thử lại) không giữ suất trống", async () => {
  await sql`delete from work_waiters`;
  await limits({ perProvider: 50, perModel: 1, batch: 50, live: 50, perUser: 5 });
  const key = (u: string) => ({ userId: u, provider: "groq", model: "g", lane: "batch" as const });
  const a = await acquireWorkInfo(sql, key("A"));
  await acquireWorkInfo(sql, key("GONE"));
  await releaseWork(sql, a.id!);
  await sql`update work_waiters set since = since - interval '10 seconds'`;
  await sql`update work_waiters set seen_at = clock_timestamp() - interval '7 seconds' where user_id = 'GONE'`;
  const d = await acquireWorkInfo(sql, key("D"));
  assert.ok(d.id, "suất trống không được giữ cho người đã bỏ đi");
  await releaseWork(sql, d.id!);
});

pgTest("RE2-004: khách đã dùng đủ suất riêng không xếp hàng chặn người khác; hàng chờ không vượt cap khi chạy đua", async () => {
  await sql`delete from work_waiters`;
  await limits({ perProvider: 50, perModel: 3, batch: 50, live: 50, perUser: 1 });
  const key = (u: string) => ({ userId: u, provider: "groq", model: "r", lane: "batch" as const });
  const own = await acquireWorkInfo(sql, key("U"));
  const again = await acquireWorkInfo(sql, key("U"));
  assert.deepEqual([again.id, again.position], [null, 0]);
  assert.equal((await sql`select 1 from work_waiters where user_id = 'U'`).length, 0);
  const many = await Promise.all(Array.from({ length: 30 }, (_, i) => acquireWorkInfo(sql, key(`m${i}`))));
  assert.equal(many.filter((x) => x.id).length, 2);
  const running = await sql<{ n: number }>`select count(*)::int n from work_admissions where model = 'r' and status = 'running'`;
  assert.equal(running[0].n, 3);
  const positions = many.filter((x) => !x.id).map((x) => x.position).sort((p, q) => p - q);
  assert.equal(new Set(positions).size, positions.length, "mỗi người một vị trí khác nhau");
  await releaseWork(sql, own.id!);
});

pgTest("RE2-004: không bỏ trống suất — người mới chờ chưa tới 3 giây không chặn người đến lấy suất trống", async () => {
  await sql`delete from work_waiters`;
  await limits({ perProvider: 50, perModel: 1, batch: 50, live: 50, perUser: 5 });
  const key = (u: string) => ({ userId: u, provider: "groq", model: "w", lane: "batch" as const });
  const a = await acquireWorkInfo(sql, key("A"));
  const b = await acquireWorkInfo(sql, key("B"));
  assert.equal(b.position, 1);
  await releaseWork(sql, a.id!);
  const c = await acquireWorkInfo(sql, key("C"));
  assert.ok(c.id, "B mới chờ dưới 3 giây: suất trống không bị giữ");
  await releaseWork(sql, c.id!);
});

pgTest("RE4-003: batch đã đầy không giữ mất suất live cho cùng model", async () => {
  await limits({ perProvider: 2, perModel: 2, batch: 1, live: 1, perUser: 2, liveReserve: 0 });
  const key = (userId: string, lane: "batch" | "live") => ({ userId, provider: "groq", model: "same", lane });
  const active = await acquireWork(sql, key("batch-running", "batch"));
  assert.ok(active);
  assert.equal(await acquireWork(sql, key("older-batch", "batch")), null);
  await sql`update work_waiters set since = since - interval '4 seconds' where user_id='older-batch'`;
  const live = await acquireWork(sql, key("live-new", "live"));
  assert.ok(live, "a batch waiter cannot consume the free live slot");
  assert.equal(await acquireWork(sql, key("live-over-cap", "live")), null);
  await releaseWork(sql, active);
  assert.equal(await acquireWork(sql, key("late-batch", "batch")), null);
  assert.ok(await acquireWork(sql, key("older-batch", "batch")));
});

pgTest("RE4-003: live lấy suất dành riêng, batch chờ đủ điều kiện giữ suất chung", async () => {
  await limits({ perProvider: 2, perModel: 2, batch: 3, live: 2, perUser: 2, liveReserve: 1 });
  const key = (userId: string, lane: "batch" | "live") => ({ userId, provider: "groq", model: "same", lane });
  const active = await acquireWork(sql, key("batch-running", "batch"));
  assert.ok(active);
  assert.equal(await acquireWork(sql, key("older-batch", "batch")), null);
  await sql`update work_waiters set since = since - interval '4 seconds' where user_id='older-batch'`;
  assert.ok(await acquireWork(sql, key("live-reserved", "live")));
  await releaseWork(sql, active);
  assert.equal(await acquireWork(sql, key("live-later", "live")), null);
  assert.ok(await acquireWork(sql, key("older-batch", "batch")));
});

pgTest("RE4-003: nhiều người chờ batch chỉ giữ số suất lane có thể dùng", async () => {
  await limits({ perProvider: 2, perModel: 2, batch: 1, live: 1, perUser: 2 });
  const key = (userId: string, lane: "batch" | "live") => ({ userId, provider: "groq", model: "same", lane });
  const active = await acquireWork(sql, key("batch-running", "batch"));
  assert.ok(active);
  assert.equal(await acquireWork(sql, key("older-batch-1", "batch")), null);
  assert.equal(await acquireWork(sql, key("older-batch-2", "batch")), null);
  await sql`update work_waiters set since = since - interval '4 seconds'`;
  await releaseWork(sql, active);
  assert.ok(await acquireWork(sql, key("live-new", "live")));
  assert.equal(await acquireWork(sql, key("older-batch-2", "batch")), null);
  assert.ok(await acquireWork(sql, key("older-batch-1", "batch")));
});

// RE5-003 (v5.49.6): hàng chờ ưu tiên chỉ lọc cùng provider+model, nhưng trần provider và lane dùng chung.
// Đã tái hiện (todo) ở 0bb6f25; sửa bằng migrations/0057_admission_shared_cap_fairness.sql.
pgTest("RE5-003: khách chờ model Y không bị khách mới model X cùng nhà chen khi trần nhà đã đầy", async () => {
  await limits({ perProvider: 2, perModel: 5, batch: 10, live: 10, perUser: 1 });
  const x = (userId: string) => ({ userId, provider: "groq", model: "x", lane: "batch" as const });
  const a1 = await acquireWork(sql, x("x-1"));
  assert.ok(a1 && (await acquireWork(sql, x("x-2"))));
  assert.equal(await acquireWork(sql, { userId: "waiting-y", provider: "groq", model: "y", lane: "batch" }), null);
  await sql`update work_waiters set since = since - interval '4 seconds' where user_id='waiting-y'`;
  await releaseWork(sql, a1!);
  assert.equal(await acquireWork(sql, x("x-new")), null, "khách mới model X chen suất nhà của khách chờ model Y");
  assert.ok(await acquireWork(sql, { userId: "waiting-y", provider: "groq", model: "y", lane: "batch" }));
});

pgTest("RE5-003: khách chờ nhà B không bị khách mới nhà A chen khi trần lane đã đầy", async () => {
  await limits({ perProvider: 10, perModel: 10, batch: 2, live: 10, perUser: 1 });
  const a = (userId: string) => ({ userId, provider: "groq", model: "m", lane: "batch" as const });
  const a1 = await acquireWork(sql, a("a-1"));
  assert.ok(a1 && (await acquireWork(sql, a("a-2"))));
  assert.equal(await acquireWork(sql, { userId: "waiting-b", provider: "alibaba", model: "qwen-plus", lane: "batch" }), null);
  await sql`update work_waiters set since = since - interval '4 seconds' where user_id='waiting-b'`;
  await releaseWork(sql, a1!);
  assert.equal(await acquireWork(sql, a("a-new")), null, "khách mới nhà A chen suất lane của khách chờ nhà B");
  assert.ok(await acquireWork(sql, { userId: "waiting-b", provider: "alibaba", model: "qwen-plus", lane: "batch" }));
});

pgTest("RE5-003: khách chờ đã bỏ đi (quá 6 giây không quay lại) không giữ suất", async () => {
  await limits({ perProvider: 1, perModel: 1, batch: 10, live: 10, perUser: 1 });
  const k = (userId: string) => ({ userId, provider: "groq", model: "m", lane: "batch" as const });
  const a1 = await acquireWork(sql, k("r-1"));
  assert.ok(a1);
  assert.equal(await acquireWork(sql, k("gone")), null);
  await sql`update work_waiters set since = since - interval '20 seconds', seen_at = seen_at - interval '10 seconds' where user_id='gone'`;
  await releaseWork(sql, a1!);
  assert.ok(await acquireWork(sql, k("fresh")), "khách chờ đã bỏ đi không được chặn khách mới");
});

pgTest("RE5-003: khách chờ bị chặn bởi trần model của chính mình không giữ suất nhà của khách khác", async () => {
  await limits({ perProvider: 3, perModel: 1, batch: 10, live: 10, perUser: 1 });
  const k = (userId: string, model: string) => ({ userId, provider: "groq", model, lane: "batch" as const });
  const y1 = await acquireWork(sql, k("y-running", "y"));
  const x1 = await acquireWork(sql, k("x-running", "x"));
  assert.ok(y1 && x1);
  // Khách chờ model y: trần model y đã đầy (perModel 1) dù nhà còn chỗ.
  assert.equal(await acquireWork(sql, k("waiting-y", "y")), null);
  await sql`update work_waiters set since = since - interval '4 seconds' where user_id='waiting-y'`;
  // Nhà còn 1 suất; khách chờ y không dùng được (model y đầy) nên không được giữ suất đó.
  assert.ok(await acquireWork(sql, k("z-new", "z")), "khách chờ không nhận được suất thì không chặn người khác");
});

pgTest("RE5-003: 60 yêu cầu xuyên nhà/model/lane đồng thời không vượt trần nào", async () => {
  await limits({ perProvider: 4, perModel: 3, batch: 5, live: 3, perUser: 1, liveReserve: 1 });
  const providers = ["groq", "alibaba"], models = ["m1", "m2", "m3"], lanes = ["batch", "live"] as const;
  const got = await Promise.all(Array.from({ length: 60 }, (_, i) =>
    acquireWork(sql, { userId: `c${i}`, provider: providers[i % 2], model: models[i % 3], lane: lanes[Math.floor(i / 6) % 2] })));
  assert.ok(got.some(Boolean));
  const rows = await sql<{ provider: string; model: string; lane: string }>`select provider, model, lane from work_admissions where status = 'running'`;
  const count = (f: (r: { provider: string; model: string; lane: string }) => boolean) => rows.filter(f).length;
  for (const p of providers) {
    assert.ok(count((r) => r.provider === p) <= 4, `provider ${p}`);
    assert.ok(count((r) => r.provider === p && r.lane !== "live") <= 3, `non-live ${p} (reserve 1)`);
    for (const m of models) assert.ok(count((r) => r.provider === p && r.model === m) <= 3, `model ${p}/${m}`);
  }
  assert.ok(count((r) => r.lane === "batch") <= 5);
  assert.ok(count((r) => r.lane === "live") <= 3);
});
