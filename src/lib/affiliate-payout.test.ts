/**
 * Kiểm toán v5.49 R5-001/R5-002/R5-003: lệnh rút hoa hồng. Đặt TYZO_TEST_PG_URL để chạy trên Postgres thật
 * nhiều kết nối (tranh chấp thật); không đặt thì chạy PGLite.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Sql } from "./db.ts";
import { pgliteSql, realPgSql } from "./test-sql.ts";
import { cancelPayoutWith, markPayoutWith, requestPayoutWith } from "./affiliate-payout.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
const RULES = { minPayout: 50_000 };

before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
});
after(async () => {
  await end?.();
});

async function seed() {
  await sql`delete from commission_events`;
  await sql`delete from affiliate_payouts`;
  await sql`delete from referrals`;
  await sql`delete from affiliates`;
  await sql`insert into affiliates (user_id, code, status, bank_name, bank_account, bank_holder) values ('ctv', 'MA1', 'hoat-dong', 'VCB', '0123', 'A')`;
  for (let i = 0; i < 3; i += 1) {
    await sql`insert into commission_events (affiliate_id, referred_user_id, source_kind, source_ref, base_amount, rate_bp, amount, status, available_at)
              values ('ctv', 'k', 'goi', ${`d${i}`}, 100000, 2000, 20000, 'da-duyet', now())`;
  }
}

/** Đúng các câu lệnh rời của bản 48b6a19 (affiliate-room.ts requestPayout), để ghi lại kết quả TRƯỚC khi sửa. */
async function oldRequest(userId: string) {
  const ready = await sql<{ amount: number }>`select coalesce(sum(amount), 0)::int as amount from commission_events where affiliate_id = ${userId} and status = 'da-duyet'`;
  const amount = Number(ready[0]?.amount ?? 0);
  if (amount < RULES.minPayout) throw new Error("thiếu");
  const open = await sql`select id from affiliate_payouts where affiliate_id = ${userId} and status = 'cho-chi'`;
  if (open.length) throw new Error("đang mở");
  await sql`select status from affiliates where user_id = ${userId}`;
  await sql`update commission_events set status = 'cho-rut' where affiliate_id = ${userId} and status = 'da-duyet'`;
  await sql`insert into affiliate_payouts (affiliate_id, amount, bank_info) values (${userId}, ${amount}, '{}')`;
}

const payouts = () => sql<{ id: number; amount: number; status: string }>`select id, amount, status from affiliate_payouts order by id`;

describe("lệnh rút hoa hồng", () => {
  beforeEach(seed);

  it("TRƯỚC SỬA (ghi lại): hai lần bấm cùng lúc theo cách cũ", async (t) => {
    await sql.query("drop index if exists affiliate_payouts_one_open");
    try {
      let worst = 0;
      for (let round = 0; round < 20; round += 1) {
        await seed();
        await Promise.allSettled(Array.from({ length: 5 }, () => oldRequest("ctv")));
        const rows = await payouts();
        worst = Math.max(worst, rows.reduce((a, r) => a + r.amount, 0));
      }
      t.diagnostic(`cách cũ, 20 lượt × 5 lần bấm: tổng lệnh rút lớn nhất trong một lượt ${worst} đ (số dư thật 60000 đ)`);
    } finally {
      await sql`delete from affiliate_payouts`;
      await sql.query("create unique index if not exists affiliate_payouts_one_open on affiliate_payouts (affiliate_id) where status = 'cho-chi'");
    }
  });

  it("R5-001: 5 lần bấm Rút cùng lúc chỉ ra MỘT lệnh đúng 60.000 đ", async () => {
    const out = await Promise.allSettled(Array.from({ length: 5 }, () => requestPayoutWith(sql, "ctv", RULES)));
    assert.equal(out.filter((x) => x.status === "fulfilled").length, 1);
    const rows = await payouts();
    assert.deepEqual(rows.map((r) => [r.amount, r.status]), [[60000, "cho-chi"]]);
    const linked = await sql<{ n: number }>`select count(*)::int as n from commission_events where payout_id = ${rows[0].id} and status = 'cho-rut'`;
    assert.equal(linked[0].n, 3);
  });

  it("R5-002: xác nhận một lệnh đã hủy thì báo lỗi, không đánh dấu khoản của lệnh mới là đã chi", async () => {
    const first = await requestPayoutWith(sql, "ctv", RULES);
    await cancelPayoutWith(sql, first.id, "sai tài khoản");
    const second = await requestPayoutWith(sql, "ctv", RULES);
    await assert.rejects(markPayoutWith(sql, first.id, "CK-1"), /không còn chờ chuyển/);
    const st = await sql<{ status: string; payout_id: number }>`select status, payout_id from commission_events`;
    assert.ok(st.every((e) => e.status === "cho-rut" && Number(e.payout_id) === second.id));
    await markPayoutWith(sql, second.id, "CK-2");
    const paid = await sql<{ status: string }>`select status from commission_events`;
    assert.ok(paid.every((e) => e.status === "da-chi"));
  });

  it("R5-003: hủy lệnh trả đúng khoản về «Rút được», rút lại được", async () => {
    const first = await requestPayoutWith(sql, "ctv", RULES);
    assert.deepEqual(await cancelPayoutWith(sql, first.id, ""), { ok: true });
    const ev = await sql<{ status: string; payout_id: number | null }>`select status, payout_id from commission_events`;
    assert.ok(ev.every((e) => e.status === "da-duyet" && e.payout_id === null));
    assert.equal((await requestPayoutWith(sql, "ctv", RULES)).amount, 60000);
  });

  it("khoản cũ chưa gắn lệnh (trước bản này) vẫn được xác nhận đúng", async () => {
    await sql`update commission_events set status = 'cho-rut'`;
    const made = await sql<{ id: number }>`insert into affiliate_payouts (affiliate_id, amount) values ('ctv', 60000) returning id`;
    await markPayoutWith(sql, Number(made[0].id), "CK-cu");
    const ev = await sql<{ status: string }>`select status from commission_events`;
    assert.ok(ev.every((e) => e.status === "da-chi"));
  });

  it("R5-004: có cờ rủi ro mở thì không rút được", async () => {
    await sql`insert into risk_flags (user_id, rule, status, score, summary) values ('ctv', 'ctv-tu-gioi-thieu', 'mo', 1, 'thử')`;
    await assert.rejects(requestPayoutWith(sql, "ctv", RULES), /RR-/);
    assert.equal((await payouts()).length, 0);
  });

  it("giữ câu báo cũ: chưa đủ tối thiểu", async () => {
    await assert.rejects(requestPayoutWith(sql, "ctv", { minPayout: 100_000 }), /tối thiểu/);
  });
});
