import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { buyPlanWith, creditHitWith, refundRunWith, releaseHoldWith } from "./pay-flow.ts";
import { chargeTicketWith, closeTicketWith, openTicketWith } from "./run-ticket.ts";
import { ROOM_PLANS } from "./room-plans.ts";

let sql: Sql;
const START = "2026-11-07T17:00:00.000Z";
const PLAN = ROOM_PLANS[0];

before(async () => {
  const db = new PGlite();
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(file, dir), "utf8"));
  sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return (await db.query(text, values)).rows;
  }) as unknown as Sql;
});

const balanceOf = async (user: string) => Number((await sql<{ balance: number }>`select balance from room_accounts where user_id = ${user}`)[0]?.balance ?? 0);
const ledgerOf = async (user: string) => await sql<{ kind: string; amount: number }>`select kind, amount from room_ledger where user_id = ${user} order by id`;
const orderStatus = async (id: string) => (await sql<{ status: string }>`select status from pay_orders where id = ${id}`)[0]?.status;

async function reset() {
  await sql`delete from run_tickets`;
  await sql`delete from room_ledger`;
  await sql`delete from pay_seen`;
  await sql`delete from pay_orders`;
  await sql`delete from room_accounts`;
  await sql`delete from "user"`;
  await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ('k', 'Khách', 'k@tyzo.test', true, now(), now())`;
  await sql`insert into pay_orders (id, user_id, provider, amount, code, status) values ('o1', 'k', 'sepay', 100000, 'TZABC234', 'pending')`;
}

describe("webhook nạp tiền", () => {
  beforeEach(reset);

  it("khớp mã trong nội dung thì cộng ví, ghi sổ nap, đơn chuyển paid", async () => {
    const done = await creditHitWith(sql, "sepay", { ref: "S1", amount: 100000, text: "MBVCB chuyen tien tzabc234 cam on" });
    assert.deepEqual(done, { userId: "k", amount: 100000, code: "TZABC234" });
    assert.equal(await balanceOf("k"), 100000);
    assert.deepEqual(await ledgerOf("k"), [{ kind: "nap", amount: 100000 }]);
    assert.equal(await orderStatus("o1"), "paid");
  });

  it("webhook gửi lặp cùng mã giao dịch thì không cộng lần hai", async () => {
    await creditHitWith(sql, "sepay", { ref: "S1", amount: 100000, text: "TZABC234" });
    assert.equal(await creditHitWith(sql, "sepay", { ref: "S1", amount: 100000, text: "TZABC234" }), null);
    assert.equal(await balanceOf("k"), 100000);
  });

  it("chuyển thiếu tiền, sai cổng, sai mã thì không cộng", async () => {
    assert.equal(await creditHitWith(sql, "sepay", { ref: "S2", amount: 99999, text: "TZABC234" }), null);
    assert.equal(await creditHitWith(sql, "casso", { ref: "C1", amount: 100000, text: "TZABC234" }), null);
    assert.equal(await creditHitWith(sql, "sepay", { ref: "S3", amount: 100000, text: "TZXXXXXX" }), null);
    assert.equal(await creditHitWith(sql, "sepay", { ref: "S4", amount: 100000, text: "khong co ma" }), null);
    assert.equal(await balanceOf("k"), 0);
    assert.equal(await orderStatus("o1"), "pending");
  });

  it("chuyển dư thì cộng đúng số tiền thực nhận", async () => {
    const done = await creditHitWith(sql, "sepay", { ref: "S5", amount: 120000, text: "TZABC234" });
    assert.equal(done?.amount, 120000);
    assert.equal(await balanceOf("k"), 120000);
  });

  it("đơn khách báo đã chuyển (claimed) vẫn được webhook cộng", async () => {
    await sql`update pay_orders set status = 'claimed' where id = 'o1'`;
    assert.ok(await creditHitWith(sql, "sepay", { ref: "S6", amount: 100000, text: "TZABC234" }));
  });

  it("đồng thời: cùng một giao dịch gửi 6 lần cùng lúc thì chỉ cộng một lần", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => creditHitWith(sql, "sepay", { ref: "S7", amount: 100000, text: "TZABC234" })));
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await balanceOf("k"), 100000);
    assert.equal((await ledgerOf("k")).length, 1);
  });

  it("đồng thời: hai giao dịch khác mã cho cùng một đơn thì chỉ cộng một lần", async () => {
    const results = await Promise.all([
      creditHitWith(sql, "sepay", { ref: "A", amount: 100000, text: "TZABC234" }),
      creditHitWith(sql, "sepay", { ref: "B", amount: 100000, text: "TZABC234" }),
    ]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(await balanceOf("k"), 100000);
  });
});

describe("mua gói từ số dư", () => {
  beforeEach(reset);

  it("nạp rồi mua gói: trừ đúng giá, gói có hạn, sổ có nap và goi", async () => {
    await creditHitWith(sql, "sepay", { ref: "S1", amount: 100000, text: "TZABC234" });
    await buyPlanWith(sql, "k", PLAN);
    assert.equal(await balanceOf("k"), 100000 - PLAN.price);
    const row = (await sql<{ plan: string; ok: boolean }>`select plan, plan_until > now() as ok from room_accounts where user_id = 'k'`)[0];
    assert.equal(row.plan, PLAN.id);
    assert.equal(row.ok, true);
    assert.deepEqual((await ledgerOf("k")).map((r) => r.kind), ["nap", "goi"]);
  });

  it("thiếu số dư thì ném lỗi và không đổi gì", async () => {
    await sql`insert into room_accounts (user_id, balance) values ('k', ${PLAN.price - 1})`;
    await assert.rejects(buyPlanWith(sql, "k", PLAN), /Số dư chưa đủ/);
    assert.equal(await balanceOf("k"), PLAN.price - 1);
    assert.equal((await ledgerOf("k")).length, 0);
  });

  it("mua gói khi còn hạn thì cộng dồn hạn", async () => {
    await sql`insert into room_accounts (user_id, balance) values ('k', ${PLAN.price * 2})`;
    await buyPlanWith(sql, "k", PLAN);
    const first = (await sql<{ t: string }>`select plan_until::text as t from room_accounts where user_id = 'k'`)[0].t;
    await buyPlanWith(sql, "k", PLAN);
    const gap = (await sql<{ h: number }>`select extract(epoch from (plan_until - ${first}::timestamptz)) / 3600 as h from room_accounts where user_id = 'k'`)[0].h;
    assert.equal(Math.round(Number(gap)), PLAN.hours);
  });

  it("đồng thời: đủ tiền cho một gói mà bấm 4 lần cùng lúc thì chỉ một lần thành công", async () => {
    await sql`insert into room_accounts (user_id, balance) values ('k', ${PLAN.price})`;
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => buyPlanWith(sql, "k", PLAN)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await balanceOf("k"), 0);
    assert.equal((await ledgerOf("k")).filter((r) => r.kind === "goi").length, 1);
  });
});

describe("trả theo lượt rồi hoàn tiền", () => {
  beforeEach(async () => {
    await reset();
    await creditHitWith(sql, "sepay", { ref: "S1", amount: 100000, text: "TZABC234" });
  });

  async function runOnce(charge: number) {
    const opened = await openTicketWith(sql, { id: "t1", userId: "k", fileName: "a.mp4", seconds: 600, rate: 100, hold: 30000, cap: 0, dayStartIso: START });
    assert.ok("id" in opened);
    await chargeTicketWith(sql, "t1", "k", charge);
    await closeTicketWith(sql, "t1", "k", false);
  }

  it("nạp, chạy, trừ thực, nhả phần thừa; số dư = nạp - đã trừ", async () => {
    await runOnce(12000);
    assert.equal(await balanceOf("k"), 100000 - 12000);
  });

  it("hoàn từng phần rồi hoàn nốt: ví cộng đúng, phiếu thành da-hoan, không hoàn quá", async () => {
    await runOnce(12000);
    await refundRunWith(sql, "t1", 5000, "Lỗi dịch đoạn đầu");
    assert.equal(await balanceOf("k"), 100000 - 12000 + 5000);
    assert.equal((await sql<{ status: string }>`select status from run_tickets where id = 't1'`)[0].status, "da-tru");
    await assert.rejects(refundRunWith(sql, "t1", 7001, "Hoàn quá số đã trừ"), /Không hoàn quá/);
    await refundRunWith(sql, "t1", 7000, "Hoàn nốt phần còn lại");
    assert.equal(await balanceOf("k"), 100000);
    const row = (await sql<{ status: string; refunded: number }>`select status, refunded from run_tickets where id = 't1'`)[0];
    assert.deepEqual({ status: row.status, refunded: Number(row.refunded) }, { status: "da-hoan", refunded: 12000 });
    assert.deepEqual((await ledgerOf("k")).map((r) => r.kind).filter((kind) => kind === "nap" || kind === "hoan"), ["nap", "hoan", "hoan"]);
  });

  it("phiếu không có thì báo lỗi, ví không đổi", async () => {
    await assert.rejects(refundRunWith(sql, "khong-co", 100, "Không có phiếu"), /Không có phiếu/);
    assert.equal(await balanceOf("k"), 100000);
  });

  it("đồng thời: hai lần hoàn toàn bộ cùng lúc chỉ được một lần (C2)", async () => {
    await runOnce(12000);
    const results = await Promise.allSettled([refundRunWith(sql, "t1", 12000, "Hoàn lần một"), refundRunWith(sql, "t1", 12000, "Hoàn lần hai")]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await balanceOf("k"), 100000);
  });

  it("đồng thời: hai lần nhả khoản giữ chỉ cộng một lần", async () => {
    const opened = await openTicketWith(sql, { id: "t1", userId: "k", fileName: "a.mp4", seconds: 600, rate: 100, hold: 30000, cap: 0, dayStartIso: START });
    assert.ok("id" in opened);
    const results = await Promise.allSettled([releaseHoldWith(sql, "t1"), releaseHoldWith(sql, "t1")]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await balanceOf("k"), 100000);
  });
});
