import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { pgliteSql } from "../test-sql.ts";
import type { Sql } from "../db.ts";
import { confirmOrderWith } from "./pay-confirm.ts";

let sql: Sql;
before(async () => {
  sql = await pgliteSql();
});

describe("xác nhận thủ công đơn nạp", () => {
  beforeEach(async () => {
    await sql`delete from pay_orders`;
    await sql`delete from room_ledger`;
    await sql`delete from room_audit`;
    await sql`delete from room_accounts`;
    await sql`delete from "user"`;
    await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values ('k', 'Khách', 'k@tyzo.test', true, now(), now())`;
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status) values ('o1', 'k', 'sepay', 50000, 'TZ123', 'claimed')`;
  });

  it("cộng ví, ghi sổ và nhật ký kèm người xác nhận", async () => {
    const done = await confirmOrderWith(sql, "o1", "chu1", "chu@tyzo.test");
    assert.deepEqual(done, { userId: "k", amount: 50000, code: "TZ123" });
    assert.equal(Number((await sql<{ balance: number }>`select balance from room_accounts where user_id = 'k'`)[0].balance), 50000);
    const led = await sql<{ kind: string; note: string }>`select kind, note from room_ledger where user_id = 'k'`;
    assert.equal(led.length, 1);
    assert.match(led[0].note, /chu@tyzo\.test/);
    const aud = await sql<{ actor_id: string; action: string; target_email: string }>`select actor_id, action, target_email from room_audit`;
    assert.deepEqual(aud, [{ actor_id: "chu1", action: "xac-nhan-nap", target_email: "k@tyzo.test" }]);
  });

  it("đồng thời: hai người cùng bấm thì chỉ cộng một lần", async () => {
    const results = await Promise.all([confirmOrderWith(sql, "o1", "a", "a@x"), confirmOrderWith(sql, "o1", "b", "b@x")]);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(Number((await sql<{ balance: number }>`select balance from room_accounts where user_id = 'k'`)[0].balance), 50000);
    assert.equal((await sql`select 1 from room_ledger`).length, 1);
  });

  it("đơn đã hủy hoặc không có thì không cộng", async () => {
    await sql`update pay_orders set status = 'cancelled' where id = 'o1'`;
    assert.equal(await confirmOrderWith(sql, "o1", "a", "a@x"), null);
    assert.equal(await confirmOrderWith(sql, "khong-co", "a", "a@x"), null);
    assert.equal((await sql`select 1 from room_accounts`).length, 0);
  });
  it("đơn đã hết hạn vẫn xác nhận tay được (khách chuyển trễ)", async () => {
    await sql`update pay_orders set status = 'expired' where id = 'o1'`;
    const done = await confirmOrderWith(sql, "o1", "chu1", "chu@tyzo.test");
    assert.deepEqual(done, { userId: "k", amount: 50000, code: "TZ123" });
    assert.equal((await sql<{ status: string }>`select status from pay_orders where id = 'o1'`)[0].status, "paid");
    assert.equal(await confirmOrderWith(sql, "o1", "chu1", "chu@tyzo.test"), null);
  });

  it("đơn Token đã hết hạn xác nhận tay thì ghi gói Token, chỉ một lần", async () => {
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, detail) values ('o2', 'k', 'sepay', 30000, 'TZ456', 'expired', 'token', '{"tokens":1000,"days":30}')`;
    const done = await confirmOrderWith(sql, "o2", "chu1", "chu@tyzo.test");
    assert.equal(done?.code, "TZ456");
    assert.equal((await sql`select 1 from token_grants where id = 'o2'`).length, 1);
    assert.equal(await confirmOrderWith(sql, "o2", "chu1", "chu@tyzo.test"), null);
    assert.equal((await sql`select 1 from token_grants where id = 'o2'`).length, 1);
  });

  it("đơn đã hủy dù hết hạn hay không đều không xác nhận được", async () => {
    await sql`insert into pay_orders (id, user_id, provider, amount, code, status, purpose, detail) values ('o3', 'k', 'sepay', 30000, 'TZ789', 'cancelled', 'token', '{"tokens":1000,"days":30}')`;
    assert.equal(await confirmOrderWith(sql, "o3", "a", "a@x"), null);
    assert.equal((await sql`select 1 from token_grants where id = 'o3'`).length, 0);
  });
});
