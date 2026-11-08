import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { confirmOrderWith } from "./pay-confirm.ts";

let sql: Sql;
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
});
