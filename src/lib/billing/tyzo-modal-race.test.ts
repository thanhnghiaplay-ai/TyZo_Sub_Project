/**
 * Tranh chấp và lỗi giữa chừng khi thu tiền TyZo Modal (kiểm toán v5.49: MAIN-023, MAIN-024, MAIN-036).
 * Chạy trên PGLite; đặt TYZO_TEST_PG_URL để chạy trên Postgres thật nhiều kết nối (khuyên dùng).
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { pgliteSql, realPgSql } from "../test-sql.ts";
import { buyGiayWith, closeTokenWith, giayBalance, openGiayWith } from "./token-flow.ts";
import { runModalPartWith } from "./tyzo-modal-charge.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
const PRICE = JSON.stringify({ gpuUsdPerHour: 0.8, overhead: 3 });
const SEG = [{ text: "xin chào", start: 0, end: 1 }];

before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
});
after(async () => {
  await end?.();
});

async function open(hold: number, seconds = 600) {
  await sql`delete from run_modal_parts`;
  await sql`delete from token_slices`;
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
  await sql`delete from room_ledger`;
  await sql`delete from room_accounts`;
  await sql`insert into room_accounts (user_id, balance) values ('k', 100000)`;
  await buyGiayWith(sql, "k", { grantId: "g1", tokens: 1000, days: 30, price: 1, note: "thử" });
  const opened = await openGiayWith(sql, { id: "t1", userId: "k", fileName: "a.mp4", seconds, rate: 1, hold, asrModel: "tyzo-modal-nhanh", chatModel: "c", modalPrice: PRICE });
  assert.ok(opened && "id" in opened);
}

const part = (hash: string, seconds = 60, est = 30) => ({ ticket: "t1", userId: "k", model: "tyzo-modal-nhanh", partHash: hash, seconds, estimateTokens: () => est });
const ticket = async () =>
  (await sql<{ held: number; charged: number; status: string; modal_short: number; modal_reserved?: string }>`
    select * from run_tickets where id = 't1'`)[0];
const gate = () => {
  let open!: () => void;
  const wait = new Promise<void>((resolve) => (open = resolve));
  return { wait, open };
};

describe("TyZo Modal: giữ, quyết toán, đóng phiếu khi chạy song song", () => {
  beforeEach(() => open(100));

  it("MAIN-023: 9 đoạn ước 30 Token, giữ 100 → tối đa 3 đoạn được gọi GPU cùng lúc", async () => {
    const g = gate();
    let calls = 0;
    const runs = Array.from({ length: 9 }, (_, i) =>
      runModalPartWith(sql, part(`p${i}`), async () => {
        calls += 1;
        await g.wait;
        return { segments: SEG, tokens: 20 };
      }).then(
        () => "xong",
        (error: Error) => error.message,
      ),
    );
    await new Promise((r) => setTimeout(r, 300));
    assert.ok(calls <= 3, `đã gọi GPU ${calls} đoạn`);
    g.open();
    const out = await Promise.all(runs);
    assert.equal(out.filter((x) => x === "xong").length, calls);
    const t = await ticket();
    assert.ok(t.held >= 0);
    assert.equal(Number(t.modal_reserved ?? 0), 0);
  });

  it("MAIN-024: lỗi khi lưu kết quả thì không trừ Token (không có tiền mà không có chữ)", async () => {
    await sql.query(`create or replace function thu_loi_luu() returns trigger language plpgsql as $$
      begin if new.status = 'xong' then raise exception 'loi gia lap'; end if; return new; end $$`);
    await sql.query(`create trigger thu_loi_luu before update on run_modal_parts for each row execute function thu_loi_luu()`);
    try {
      await assert.rejects(runModalPartWith(sql, part("a"), async () => ({ segments: SEG, tokens: 12 })));
      const t = await ticket();
      assert.deepEqual([t.held, t.charged, Number(t.modal_reserved ?? 0)], [100, 0, 0]);
      const parts = await sql<{ n: number }>`select count(*)::int as n from run_modal_parts`;
      assert.equal(parts[0].n, 0, "đoạn lỗi được bỏ để gửi lại");
    } finally {
      await sql.query(`drop trigger thu_loi_luu on run_modal_parts`);
    }
  });

  it("MAIN-036: khách đóng phiếu khi đoạn đang chạy → đoạn vẫn được trừ, phần dư trả về sau đó", async () => {
    const g = gate();
    const running = runModalPartWith(sql, part("a"), async () => {
      await g.wait;
      return { segments: SEG, tokens: 12 };
    });
    await new Promise((r) => setTimeout(r, 100));
    await closeTokenWith(sql, "t1", "k", false);
    g.open();
    const r = await running;
    assert.deepEqual([r.tokens, r.short], [12, 0]);
    const t = await ticket();
    assert.equal(t.charged, 12);
    assert.equal(t.held, 0);
    assert.notEqual(t.status, "dang-giu");
    assert.equal(await giayBalance(sql, "k"), 1000 - 12);
  });

  it("đóng phiếu khi không có đoạn nào chạy vẫn trả hết ngay như cũ", async () => {
    const closed = await closeTokenWith(sql, "t1", "k", false);
    assert.equal(closed?.freed, 100);
    assert.equal(await giayBalance(sql, "k"), 1000);
  });

  it("đoạn treo quá 15 phút không giữ phiếu mãi: đóng được ngay", async () => {
    await sql`insert into run_modal_parts (ticket_id, part_hash, seconds, created_at) values ('t1', 'cu', 60, now() - interval '20 minutes')`;
    const closed = await closeTokenWith(sql, "t1", "k", false);
    assert.equal(closed?.freed, 100);
  });
});
