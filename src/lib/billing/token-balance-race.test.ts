/** Kiểm toán MAIN-039: Admin đặt số Token hai lần cùng lúc phải ra đúng mức đặt (đặt TYZO_TEST_PG_URL để thử nhiều kết nối). */
import assert from "node:assert/strict";
import { after, before, it } from "node:test";
import type { Sql } from "../db.ts";
import { pgliteSql, realPgSql } from "../test-sql.ts";
import { buyGiayWith, giayBalance, setTokenBalanceWith } from "./token-flow.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
});
after(async () => {
  await end?.();
});

it("ba lần đặt 100 Token cùng lúc (đang có 40) → còn đúng 100, lặp 20 lượt", async () => {
  const seen: number[] = [];
  for (let round = 0; round < 20; round += 1) {
    await sql`delete from token_grants`;
    await sql`delete from room_ledger`;
    await sql`delete from room_accounts`;
    await sql`insert into room_accounts (user_id, balance) values ('k', 100000)`;
    await buyGiayWith(sql, "k", { grantId: `g${round}`, tokens: 40, days: 30, price: 1, note: "thử" });
    await Promise.all([setTokenBalanceWith(sql, "k", 100), setTokenBalanceWith(sql, "k", 100), setTokenBalanceWith(sql, "k", 100)]);
    seen.push(await giayBalance(sql, "k"));
  }
  assert.deepEqual([...new Set(seen)], [100], `số dư sau mỗi lượt: ${seen.join(",")}`);
});
