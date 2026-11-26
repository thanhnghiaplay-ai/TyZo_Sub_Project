import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { pgliteSql } from "../test-sql.ts";
import type { Sql } from "../db.ts";
import { buyPlanWith, consumeResetCodeWith, creditHitWith, issueResetCodeWith, refundRunWith, releaseHoldWith, repairMissedTokens, testResetGateWith, wipeTestData } from "./pay-flow.ts";
import { chargeTicketWith, closeTicketWith, openTicketWith } from "../billing/run-ticket.ts";
import { ROOM_PLANS } from "../room-plans.ts";

let sql: Sql;
const START = "2026-11-07T17:00:00.000Z";
const PLAN = ROOM_PLANS[0];

before(async () => {
  sql = await pgliteSql();
});

const balanceOf = async (user: string) => Number((await sql<{ balance: number }>`select balance from room_accounts where user_id = ${user}`)[0]?.balance ?? 0);
const ledgerOf = async (user: string) => await sql<{ kind: string; amount: number }>`select kind, amount from room_ledger where user_id = ${user} order by id`;
const orderStatus = async (id: string) => (await sql<{ status: string }>`select status from pay_orders where id = ${id}`)[0]?.status;

async function reset() {
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
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

  it("đơn quá 15 phút thì webhook không cộng", async () => {
    await sql`update pay_orders set created_at = now() - interval '16 minutes' where id = 'o1'`;
    assert.equal(await creditHitWith(sql, "sepay", { ref: "S8", amount: 100000, text: "TZABC234" }), null);
    assert.equal(await balanceOf("k"), 0);
    assert.equal(await orderStatus("o1"), "pending");
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

describe("mua thẳng không cộng số dư", () => {
  beforeEach(reset);

  it("đơn token: tiền về thì cộng token, số dư vẫn 0", async () => {
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, ref, detail) values ('ot', 'k', 'sepay', 1845, 'TZTOK234', 'pending', 'token', 'nho', '{"tokens":3600,"days":30}')`;
    const done = await creditHitWith(sql, "sepay", { ref: "T1", amount: 1845, text: "TZTOK234" });
    assert.equal(done?.purpose, "token");
    assert.equal(await balanceOf("k"), 0);
    const grant = (await sql<{ tokens: number; left_tokens: number }>`select tokens, left_tokens from token_grants where id = 'ot'`)[0];
    assert.equal(grant.tokens, 3600);
    assert.equal(grant.left_tokens, 3600);
  });

  it("đơn thuê phòng: tiền về thì mở hạn, số dư vẫn 0", async () => {
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, ref, detail) values ('op', 'k', 'sepay', ${PLAN.price}, 'TZPLN234', 'pending', 'plan', ${PLAN.id}, '{}')`;
    const done = await creditHitWith(sql, "sepay", { ref: "P1", amount: PLAN.price, text: "TZPLN234" });
    assert.equal(done?.purpose, "plan");
    assert.equal(await balanceOf("k"), 0);
    const row = (await sql<{ plan: string; ok: boolean }>`select plan, plan_until > now() as ok from room_accounts where user_id = 'k'`)[0];
    assert.equal(row.plan, PLAN.id);
    assert.equal(row.ok, true);
  });

  it("đơn thuê phòng đặt ở giá cũ vẫn được giao sau khi Admin đổi giá (đơn giữ đúng giá lúc đặt)", async () => {
    const oldPrice = PLAN.price + 3000;
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, ref, detail) values ('og', 'k', 'sepay', ${oldPrice}, 'TZOLD234', 'pending', 'plan', ${PLAN.id}, '{}')`;
    const done = await creditHitWith(sql, "sepay", { ref: "G1", amount: oldPrice, text: "TZOLD234" });
    assert.equal(done?.purpose, "plan");
    assert.equal(done?.amount, oldPrice);
    assert.equal(await orderStatus("og"), "paid");
    const row = (await sql<{ plan: string; ok: boolean }>`select plan, plan_until > now() as ok from room_accounts where user_id = 'k'`)[0];
    assert.equal(row.plan, PLAN.id);
    assert.equal(row.ok, true);
  });

  it("đơn thuê phòng có số tiền ngoài khoảng cho phép thì không giao gói", async () => {
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, ref, detail) values ('ob', 'k', 'sepay', 10, 'TZBAD234', 'pending', 'plan', ${PLAN.id}, '{}')`;
    const done = await creditHitWith(sql, "sepay", { ref: "B1", amount: 10, text: "TZBAD234" });
    assert.equal(done, null);
    const rows = await sql<{ plan: string | null }>`select plan from room_accounts where user_id = 'k'`;
    assert.ok(!rows[0]?.plan);
  });

  it("đơn lưu nhầm purpose nap nhưng detail là token thì cộng token, không cộng ví", async () => {
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, ref, detail) values ('om', 'k', 'sepay', 6407, 'TZZEKV85', 'pending', 'nap', 'nho', '{"tokens":10000,"days":30}')`;
    const done = await creditHitWith(sql, "sepay", { ref: "M1", amount: 6407, text: "TZZEKV85" });
    assert.equal(done?.purpose, "token");
    assert.equal(await balanceOf("k"), 0);
    const grant = (await sql<{ tokens: number }>`select tokens from token_grants where id = 'om'`)[0];
    assert.equal(grant.tokens, 10000);
  });

  it("đơn token đã paid nhưng chưa có gói thì bù gói và gỡ số dư nhầm", async () => {
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, ref, detail) values ('of', 'k', 'sepay', 6407, 'TZFIX85', 'paid', 'token', 'nho', '{"tokens":10000,"days":30}')`;
    await sql`insert into room_accounts (user_id, balance) values ('k', 6407)`;
    assert.equal(await repairMissedTokens(sql, "k"), 1);
    assert.equal(await balanceOf("k"), 0);
    const grant = (await sql<{ left_tokens: number }>`select left_tokens from token_grants where id = 'of'`)[0];
    assert.equal(grant.left_tokens, 10000);
    assert.equal(await repairMissedTokens(sql, "k"), 0);
  });
});

describe("xóa số liệu thử", () => {
  beforeEach(reset);

  it("xóa token, đơn, phiếu, chuông, nhật ký và gói, giữ tài khoản và cấu hình", async () => {
    await sql`insert into room_accounts (user_id, balance, plan, plan_until, trial_left, status) values ('k', 6407, 'thang', now() + interval '1 day', 0, 'open')`;
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('g1', 'k', 10000, 10000, 6407, now() + interval '30 day')`;
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, detail) values ('o9', 'k', 'sepay', 6407, 'TZFIX99', 'paid', 'token', '{"tokens":10000,"days":30}')`;
    await sql`insert into room_ledger (user_id, kind, amount, note) values ('k', 'nap', 6407, 'test')`;
    await sql`insert into room_notices (user_id, kind, title, body) values ('k', 'user', 'Đã cộng tiền nạp', 'test')`;
    await sql`insert into run_tickets (id, user_id, status) values ('t9', 'k', 'da-tru')`;
    await sql`insert into room_audit (actor_id, action, note) values ('k', 'test', 'cu')`;
    await sql`insert into room_settings (key, value) values ('giu', 'con')`;
    await wipeTestData(sql);
    const account = (await sql<{ balance: number; plan: string | null; trial_left: number; status: string }>`select balance, plan, trial_left, status from room_accounts where user_id = 'k'`)[0];
    assert.equal(account.balance, 0);
    assert.equal(account.plan, null);
    assert.equal(account.trial_left, 1);
    assert.equal(account.status, "open");
    assert.equal((await sql`select 1 from token_grants`).length, 0);
    assert.equal((await sql`select 1 from pay_orders`).length, 0);
    assert.equal((await sql`select 1 from room_ledger`).length, 0);
    assert.equal((await sql`select 1 from room_notices`).length, 0);
    assert.equal((await sql`select 1 from run_tickets`).length, 0);
    // RE-004: nhật ký thao tác được GIỮ qua reset (trước đây bị xóa).
    assert.equal((await sql`select 1 from room_audit`).length, 1);
    assert.equal((await sql`select 1 from "user" where id = 'k'`).length, 1);
    assert.equal((await sql<{ value: string }>`select value from room_settings where key = 'giu'`)[0].value, "con");
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

describe("reset số liệu thử an toàn (kiểm toán R4-001, R4-002)", () => {
  beforeEach(reset);

  it("R4-002: một bảng xóa lỗi thì không bảng nào bị xóa", async () => {
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('g1', 'k', 10000, 10000, 6407, now() + interval '30 day')`;
    // Bảng xóa gần cuối: provider_spend (room_audit nay được giữ, RE-004).
    await sql`insert into provider_spend (day, provider, model, calls, base_vnd, usd_micro) values (current_date, 'groq', 'loi', 1, 1, 1)`;
    await sql.query(`create or replace function thu_chan_xoa() returns trigger language plpgsql as $$ begin raise exception 'loi gia lap'; end $$`);
    await sql.query(`create trigger thu_chan_xoa before delete on provider_spend for each row execute function thu_chan_xoa()`);
    try {
      await assert.rejects(wipeTestData(sql), /loi gia lap/);
      assert.equal((await sql`select 1 from token_grants`).length, 1, "Token còn nguyên");
      assert.equal((await sql`select 1 from pay_orders`).length, 1, "đơn còn nguyên");
    } finally {
      await sql.query(`drop trigger thu_chan_xoa on provider_spend`);
      await sql`delete from provider_spend where model = 'loi'`;
    }
  });

  it("R4-001: mã do máy chủ cấp, đúng người, dùng một lần", async () => {
    const code = await issueResetCodeWith(sql, "chu");
    assert.match(code, /^[A-Z2-9]{6}$/);
    assert.equal(await consumeResetCodeWith(sql, "chu", "AAAAAA"), code === "AAAAAA");
    assert.equal(await consumeResetCodeWith(sql, "nguoi-khac", code), false);
    assert.equal(await consumeResetCodeWith(sql, "chu", code), true);
    assert.equal(await consumeResetCodeWith(sql, "chu", code), false, "không dùng lại được");
  });

  it("R4-001: mã quá 5 phút thì hết hạn", async () => {
    const code = await issueResetCodeWith(sql, "chu");
    await sql`update room_settings set value = ${JSON.stringify({ user: "chu", code, until: Date.now() - 1 })} where key = 'reset_test_code'`;
    assert.equal(await consumeResetCodeWith(sql, "chu", code), false);
  });
});

describe("RE-004, R4-003: reset chỉ trên CSDL thử đã khai báo", () => {
  it("mặc định khóa; production khóa kể cả khi bật; CSDL ngoài danh sách khóa; đúng cả hai thì mở", async () => {
    const db = (await sql<{ name: string }>`select current_database() as name`)[0].name;
    assert.equal((await testResetGateWith(sql, {})).ok, false);
    assert.equal((await testResetGateWith(sql, { TYZO_TEST_RESET: "1", TYZO_TEST_RESET_DB: db, VERCEL_ENV: "production" })).ok, false);
    assert.equal((await testResetGateWith(sql, { TYZO_TEST_RESET: "1", TYZO_TEST_RESET_DB: "neondb" })).ok, false);
    assert.equal((await testResetGateWith(sql, { TYZO_TEST_RESET: "0", TYZO_TEST_RESET_DB: db })).ok, false);
    assert.equal((await testResetGateWith(sql, { TYZO_TEST_RESET: "1", TYZO_TEST_RESET_DB: `khac, ${db}` })).ok, true);
  });

  it("R4-003: reset trên CSDL thử xóa cả sổ phải trả nhà cung cấp, giữ nhật ký thao tác", async () => {
    await sql`insert into provider_spend (day, provider, model, calls, base_vnd, usd_micro) values (current_date, 'groq', 'm', 1, 100, 4)`;
    await sql`insert into room_audit (actor_id, action, note) values ('chu', 'thu', 'giu')`;
    await wipeTestData(sql);
    assert.equal((await sql`select 1 from provider_spend`).length, 0);
    assert.ok((await sql`select 1 from room_audit where note = 'giu'`).length === 1);
  });
});
