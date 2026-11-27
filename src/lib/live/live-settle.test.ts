/**
 * RE3-001: settleLiveUsageWith trên PostgreSQL thật riêng (TYZO_TEST_PG_URL): nguyên tử, idempotent, chạy đua,
 * lỗi giữa hai phiếu, thiếu phần giữ, xung đột mã. Dữ liệu tổng hợp; không gọi nhà cung cấp.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, test } from "node:test";
import type { Sql } from "../db.ts";
import { realPgSql } from "../test-sql.ts";
import { buyGiayWith, openGiayWith } from "../billing/token-flow.ts";
import { settleLiveUsageWith, type LiveSettleInput } from "./live-settle.ts";
import { drainSpendJournal } from "../provider-spend-journal.ts";

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

const rid = (s: string) => `live:${createHash("sha256").update(s).digest("hex")}`;

async function fixture(user: string, holds: number[]) {
  await sql`insert into room_accounts (user_id, balance) values (${user}, 10) on conflict (user_id) do update set balance = 10`;
  await buyGiayWith(sql, user, { grantId: `g-${user}`, tokens: 10000, days: 30, price: 1, note: "fixture" });
  const ids: string[] = [];
  for (const [i, hold] of holds.entries()) {
    const id = `${user}-t${i + 1}`;
    const r = await openGiayWith(sql, { id, userId: user, fileName: "x", seconds: 120, rate: 1, hold });
    assert.ok(!("error" in r));
    ids.push(id);
  }
  return ids.reverse(); // mới nhất trước
}

const input = (user: string, tickets: string[], key: string, cost: number): LiveSettleInput => ({
  receiptId: rid(`${user}:${key}`),
  userId: user,
  sessionId: `sid-${user}`,
  connectionId: "c1",
  model: "fixture-live",
  provider: "alibaba",
  tickets,
  cost,
  base: cost / 10,
  supplierVnd: cost / 20,
  rate: 25000,
});

async function totals(user: string) {
  const t = await sql<{ charged: number; held: number }>`
    select coalesce(sum(charged),0)::int charged, coalesce(sum(held),0)::int held from run_tickets where user_id=${user}`;
  const g = await sql<{ left: number }>`select coalesce(sum(left_tokens),0)::int as left from token_grants where user_id=${user}`;
  const s = await sql<{ left: number; charged: number }>`
    select coalesce(sum(left_tokens),0)::int as left, coalesce(sum(charged),0)::int charged from token_slices
    where ticket_id in (select id from run_tickets where user_id=${user})`;
  return { charged: t[0].charged, held: t[0].held, grants: g[0].left, sliceLeft: s[0].left, sliceCharged: s[0].charged };
}

pgTest("RE3-001: 20 lần gửi đồng thời cùng biên nhận → trừ đúng một lần, một quan sát chi phí", async () => {
  const tickets = await fixture("race", [500]);
  const one = input("race", tickets, "k1", 120);
  const out = await Promise.all(Array.from({ length: 20 }, () => settleLiveUsageWith(sql, one)));
  assert.equal(out.filter((o) => !o.duplicate).length, 1);
  assert.ok(out.every((o) => o.taken === 120));
  const t = await totals("race");
  assert.equal(t.charged, 120);
  assert.equal(t.sliceCharged, 120);
  const j = await sql<{ n: number }>`select count(*)::int n from provider_spend_events where id=${one.receiptId}`;
  assert.equal(j[0].n, 1);
});

pgTest("RE3-001: tràn sang phiếu cũ; lỗi giữa hai phiếu hủy cả giao dịch, thử lại trừ đúng một lần", async () => {
  const tickets = await fixture("spill", [100, 100]);
  const one = input("spill", tickets, "k1", 150);
  let n = 0;
  // Lỗi đúng ở lệnh trừ phiếu thứ hai, bên trong giao dịch.
  const broken = Object.assign(
    (async () => undefined) as unknown as Sql,
    {
      begin: (fn: (tx: Sql) => Promise<unknown>) =>
        sql.begin!((tx) => {
          const wrapped = (async (strings: TemplateStringsArray, ...v: unknown[]) => {
            if (strings.join("?").includes("update token_slices") && ++n === 2)
              throw Object.assign(new Error("synthetic fault between tickets"), { code: "08006" });
            return (tx as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>)(strings, ...v);
          }) as unknown as Sql;
          return fn(wrapped);
        }),
    },
  ) as Sql;
  await assert.rejects(settleLiveUsageWith(broken, one), /between tickets/);
  let t = await totals("spill");
  assert.equal(t.charged, 0, "giao dịch hỏng không được để lại khoản trừ một nửa");
  assert.equal((await sql`select 1 from live_usage_receipts where id=${one.receiptId}`).length, 0);
  assert.equal((await sql`select 1 from provider_spend_events where id=${one.receiptId}`).length, 0);
  const ok = await settleLiveUsageWith(sql, one);
  assert.deepEqual([ok.taken, ok.shortfall, ok.duplicate], [150, 0, false]);
  t = await totals("spill");
  assert.equal(t.charged, 150);
  const row = await sql<{ allocation: Array<{ ticket: string; n: number }> }>`
    select allocation from live_usage_receipts where id=${one.receiptId}`;
  assert.deepEqual(row[0].allocation, [
    { ticket: "spill-t2", n: 100 },
    { ticket: "spill-t1", n: 50 },
  ]);
});

pgTest("RE3-001: vượt phần giữ → trừ tối đa phần giữ, ghi khoản thiếu để đối soát, không thu thêm", async () => {
  const tickets = await fixture("short", [80]);
  const before = await totals("short");
  const r = await settleLiveUsageWith(sql, input("short", tickets, "k1", 200));
  assert.deepEqual([r.taken, r.shortfall], [80, 120]);
  const after = await totals("short");
  assert.equal(after.charged, 80);
  assert.equal(after.grants, before.grants, "không lấy thêm từ gói ngoài phần đã giữ");
  const s = await sql<{ n: number }>`select count(*)::int n from live_usage_receipts where shortfall > 0 and user_id='short'`;
  assert.equal(s[0].n, 1);
});

pgTest("RE3-001: cùng mã nhưng số liệu khác → từ chối, không trừ thêm", async () => {
  const tickets = await fixture("conf", [500]);
  await settleLiveUsageWith(sql, input("conf", tickets, "k1", 100));
  await assert.rejects(settleLiveUsageWith(sql, input("conf", tickets, "k1", 101)), /số liệu khác/);
  assert.equal((await totals("conf")).charged, 100);
});

pgTest("RE3-001: tổng hợp ngày lỗi sau commit → quan sát chờ, phát lại cộng đúng một lần", async () => {
  const tickets = await fixture("post", [500]);
  const one = input("post", tickets, "k1", 100);
  let calls = 0;
  const flaky = Object.assign(
    (async (strings: TemplateStringsArray, ...v: unknown[]) =>
      (sql as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>)(strings, ...v)) as unknown as Sql,
    {
      begin: (fn: (tx: Sql) => Promise<unknown>) => {
        calls += 1;
        // Lần 1 = giao dịch quyết toán (chạy thật); lần 2 = cộng tổng hợp (lỗi).
        if (calls === 2) return Promise.reject(Object.assign(new Error("aggregate down"), { code: "53300" }));
        return sql.begin!(fn);
      },
    },
  ) as Sql;
  const r = await settleLiveUsageWith(flaky, one);
  assert.equal(r.pending, true);
  assert.equal(r.taken, 100);
  const pend = await sql<{ n: number }>`select count(*)::int n from provider_spend_events where id=${one.receiptId} and posted_at is null`;
  assert.equal(pend[0].n, 1);
  await drainSpendJournal(sql, 25);
  await drainSpendJournal(sql, 25);
  const posted = await sql<{ n: number }>`select count(*)::int n from provider_spend_events where id=${one.receiptId} and posted_at is not null`;
  assert.equal(posted[0].n, 1);
  assert.equal((await totals("post")).charged, 100);
});

pgTest("RE3-001: bảo toàn — Token gói + giữ + đã trừ không đổi qua nhiều biên nhận", async () => {
  const tickets = await fixture("cons", [300, 300]);
  const start = await totals("cons");
  const sum0 = start.grants + start.sliceLeft + start.sliceCharged;
  await Promise.all(
    Array.from({ length: 30 }, (_, i) => settleLiveUsageWith(sql, input("cons", tickets, `k${i % 12}`, 40))),
  );
  const t = await totals("cons");
  assert.equal(t.charged, 12 * 40);
  assert.equal(t.grants + t.sliceLeft + t.sliceCharged, sum0);
});
