import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import { closeTicketWith, openTicketWith } from "./run-ticket.ts";
import { buyGiayWith, chargeTokenWith, closeTokenWith, giayBalance, openGiayWith, releaseStaleTokensWith, setTokenBalanceWith } from "./token-flow.ts";

let sql: Sql;
const START = "2026-11-07T17:00:00.000Z";

before(async () => {
  const db = new PGlite();
  const dir = new URL("../../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(file, dir), "utf8"));
  sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return (await db.query(text, values)).rows;
  }) as unknown as Sql;
});

async function reset() {
  await sql`delete from token_slices`;
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
  await sql`delete from room_ledger`;
  await sql`delete from room_accounts`;
}

const balance = async () => Number((await sql<{ balance: number }>`select balance from room_accounts where user_id = 'k'`)[0]?.balance ?? 0);
const left = async (id: string) => Number((await sql<{ left_tokens: number }>`select left_tokens from token_grants where id = ${id}`)[0]?.left_tokens ?? 0);

describe("mua và trừ gói giây", () => {
  beforeEach(async () => {
    await reset();
    await sql`insert into room_accounts (user_id, balance) values ('k', 54000)`;
  });

  it("mua trừ ví, ghi gói, không hoàn khi thiếu tiền", async () => {
    const bought = await buyGiayWith(sql, "k", { grantId: "g1", tokens: 100000, days: 30, price: 54000, note: "Mua gói 100000 giây, hạn 30 ngày" });
    assert.deepEqual(bought, { balance: 0 });
    assert.equal(await giayBalance(sql, "k"), 100000);
    const led = await sql<{ kind: string; amount: number }>`select kind, amount from room_ledger where user_id = 'k'`;
    assert.deepEqual(led, [{ kind: "goi-giay", amount: -54000 }]);
    assert.deepEqual(await buyGiayWith(sql, "k", { grantId: "g2", tokens: 10, days: 1, price: 1, note: "Mua tiếp" }), { error: "het-tien" });
    assert.equal(await balance(), 0);
  });

  it("giữ gần hết hạn trước, không đủ thì không đụng gói", async () => {
    await buyGiayWith(sql, "k", { grantId: "sau", tokens: 100, days: 10, price: 1, note: "sau" });
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('som', 'k', 100, 100, 1, now() + interval '1 day')`;
    const opened = await openGiayWith(sql, { id: "t1", userId: "k", fileName: "a.mp4", seconds: 60, rate: 1, hold: 150 });
    assert.deepEqual(opened, { id: "t1", held: 150 });
    assert.equal(await left("som"), 0);
    assert.equal(await left("sau"), 50);
    assert.equal(await giayBalance(sql, "k"), 50);
    const miss = await openGiayWith(sql, { id: "t2", userId: "k", fileName: "b.mp4", seconds: 60, rate: 1, hold: 80 });
    assert.deepEqual(miss, { error: "het-giay" });
    assert.equal(await left("sau"), 50);
    assert.equal((await sql`select 1 from run_tickets where id = 't2'`).length, 0);
  });

  it("trừ đúng phần đã chạy và trả phần thừa nếu còn hạn", async () => {
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('g', 'k', 100, 100, 1, now() + interval '5 day')`;
    await openGiayWith(sql, { id: "t1", userId: "k", fileName: "a.mp4", seconds: 60, rate: 1, hold: 80 });
    assert.equal(await chargeTokenWith(sql, "t1", "k", 30), 30);
    const closed = await closeTokenWith(sql, "t1", "k", false);
    assert.equal(closed?.charged, 30);
    assert.equal(closed?.freed, 50);
    assert.equal(await left("g"), 70);
    assert.equal(await balance(), 54000);
    assert.equal(await closeTokenWith(sql, "t1", "k", false), null);
  });

  it("hết hạn thì phần giữ thừa mất, không cộng ví", async () => {
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('g', 'k', 40, 40, 1, now() + interval '1 day')`;
    await openGiayWith(sql, { id: "t1", userId: "k", fileName: "a.mp4", seconds: 60, rate: 1, hold: 40 });
    await sql`update token_grants set expires_at = now() - interval '1 minute' where id = 'g'`;
    const closed = await closeTokenWith(sql, "t1", "k", true);
    assert.equal(closed?.status, "loi");
    assert.equal(await left("g"), 0);
    assert.equal(await giayBalance(sql, "k"), 0);
    assert.equal(await balance(), 54000);
  });

  it("phiếu đồng vẫn nhả về ví, phiếu giây quá hạn trả về gói", async () => {
    const vnd = await openTicketWith(sql, { id: "v1", userId: "k", fileName: "a.mp4", seconds: 60, rate: 1, hold: 1000, cap: 0, dayStartIso: START });
    assert.equal("held" in vnd, true);
    const back = await closeTicketWith(sql, "v1", "k", false);
    assert.equal(back?.freed, 1000);
    assert.equal(await balance(), 54000);
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('g', 'k', 20, 20, 1, now() + interval '2 day')`;
    await openGiayWith(sql, { id: "t1", userId: "k", fileName: "a.mp4", seconds: 60, rate: 1, hold: 20 });
    await sql`update run_tickets set created_at = now() - interval '7 hours' where id = 't1'`;
    assert.equal(await releaseStaleTokensWith(sql, "k", 6), 1);
    assert.equal(await left("g"), 20);
    assert.equal(await balance(), 54000);
  });

  it("chỉnh Token dịch: thêm gói mới, bớt gói sắp hết hạn trước", async () => {
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('soon', 'k', 30, 30, 1, now() + interval '1 day')`;
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('later', 'k', 50, 50, 1, now() + interval '20 day')`;
    const up = await setTokenBalanceWith(sql, "k", 100);
    assert.equal(up.before, 80);
    assert.equal(up.after, 100);
    const down = await setTokenBalanceWith(sql, "k", 40);
    assert.equal(down.after, 40);
    assert.equal(await left("soon"), 0);
    assert.equal(await left("later"), 20);
  });
});
