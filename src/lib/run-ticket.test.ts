import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { chargeSpeechWith, chargeTicketWith, closeTicketWith, openTicketWith, refundSpeechWith, releaseStaleWith, ticketKind, ticketLive } from "./run-ticket.ts";

let sql: Sql;
const DAY = "2026-11-08";
const START = "2026-11-07T17:00:00.000Z";

before(async () => {
  const db = new PGlite();
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(file, dir), "utf8"));
  }
  sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return (await db.query(text, values)).rows;
  }) as unknown as Sql;
});

async function fresh(user: string, balance: number) {
  await sql`delete from run_tickets where user_id = ${user}`;
  await sql`delete from room_ledger where user_id = ${user}`;
  await sql`delete from room_accounts where user_id = ${user}`;
  await sql`insert into room_accounts (user_id, balance) values (${user}, ${balance})`;
}
const balanceOf = async (user: string) => Number((await sql<{ balance: number }>`select balance from room_accounts where user_id = ${user}`)[0].balance);
const ticket = async (id: string) => (await sql<{ held: number; charged: number; released: number; status: string }>`select held, charged, released, status from run_tickets where id = ${id}`)[0];
const open = (user: string, id: string, hold: number, cap = 0) =>
  openTicketWith(sql, { id, userId: user, fileName: "a.mp4", seconds: 600, rate: 100, hold, cap, dayStartIso: START });

describe("giữ tiền nguyên tử", () => {
  beforeEach(async () => {
    await fresh("u1", 1000);
  });

  it("giữ đủ thì trừ ví và tạo phiếu đang giữ", async () => {
    const result = await open("u1", "t1", 400);
    assert.deepEqual(result, { id: "t1", held: 400 });
    assert.equal(await balanceOf("u1"), 600);
    assert.equal((await ticket("t1")).status, "dang-giu");
    assert.equal(await ticketLive(sql, "t1", "u1"), true);
    assert.equal(await ticketLive(sql, "t1", "nguoi-khac"), false);
    assert.equal(await ticketKind(sql, "t1", "u1"), "full");
  });

  it("phiếu dịch lại ghi loại translate", async () => {
    const result = await openTicketWith(sql, { id: "t-tr", userId: "u1", fileName: "a.mp4", seconds: 30, rate: 1, hold: 50, cap: 0, dayStartIso: START, scope: "translate" });
    assert.deepEqual(result, { id: "t-tr", held: 50 });
    assert.equal(await ticketKind(sql, "t-tr", "u1"), "translate");
    assert.equal((await sql<{ scope: string }>`select scope from run_tickets where id = 't-tr'`)[0].scope, "translate");
  });

  it("không đủ số dư thì không tạo phiếu và không đổi ví", async () => {
    assert.deepEqual(await open("u1", "t2", 1001), { error: "het-tien" });
    assert.equal(await balanceOf("u1"), 1000);
    assert.equal((await sql`select 1 from run_tickets where id = 't2'`).length, 0);
  });

  it("đồng thời: số dư 1000, năm yêu cầu giữ 300 thì đúng ba qua", async () => {
    const results = await Promise.all([1, 2, 3, 4, 5].map((i) => open("u1", `r${i}`, 300)));
    assert.equal(results.filter((r) => "id" in r).length, 3);
    assert.equal(await balanceOf("u1"), 100);
    const sum = await sql<{ held: number }>`select sum(held)::int as held from run_tickets where user_id = 'u1'`;
    assert.equal(sum[0].held, 900);
  });

  it("hạn mức mỗi ngày chặn đúng khách đó", async () => {
    assert.deepEqual(await open("u1", "c1", 300, 500), { id: "c1", held: 300 });
    assert.deepEqual(await open("u1", "c2", 300, 500), { error: "qua-han-muc" });
    assert.equal(await balanceOf("u1"), 700);
  });
});

describe("trừ và nhả", () => {
  beforeEach(async () => {
    await fresh("u2", 1000);
    await open("u2", "p1", 500);
  });

  it("trừ theo đoạn rồi kết thúc: nhả phần thừa, tổng ví bảo toàn", async () => {
    assert.equal(await chargeTicketWith(sql, "p1", "u2", 120), 120);
    assert.equal(await chargeTicketWith(sql, "p1", "u2", 80), 80);
    const closed = await closeTicketWith(sql, "p1", "u2", false);
    assert.deepEqual(closed, { freed: 300, charged: 200, status: "da-tru" });
    assert.equal(await balanceOf("u2"), 800);
    const t = await ticket("p1");
    assert.equal(t.held, 0);
    assert.equal(t.charged + t.released, 500);
  });

  it("không trừ quá số đang giữ, hết thì dừng vì hết tiền", async () => {
    assert.equal(await chargeTicketWith(sql, "p1", "u2", 700), 500);
    assert.equal((await ticket("p1")).status, "dung-tien");
    assert.equal(await ticketLive(sql, "p1", "u2"), false);
    assert.equal(await chargeTicketWith(sql, "p1", "u2", 10), 0);
    assert.equal(await balanceOf("u2"), 500);
  });

  it("đồng thời: 10 đoạn 80 đ trên phiếu giữ 500 thì tổng trừ đúng 500, không âm", async () => {
    const takes = await Promise.all(Array.from({ length: 10 }, () => chargeTicketWith(sql, "p1", "u2", 80)));
    assert.equal(takes.reduce((a, b) => a + b, 0), 500);
    const t = await ticket("p1");
    assert.equal(t.held, 0);
    assert.equal(t.charged, 500);
  });

  it("kết thúc hai lần không nhả hai lần", async () => {
    const [a, b] = await Promise.all([closeTicketWith(sql, "p1", "u2", false), closeTicketWith(sql, "p1", "u2", false)]);
    assert.equal([a, b].filter(Boolean).length, 1);
    assert.equal(await balanceOf("u2"), 1000);
  });

  it("lỗi mà chưa trừ đồng nào thì phiếu là Lỗi nhận dạng và hoàn đủ", async () => {
    const closed = await closeTicketWith(sql, "p1", "u2", true);
    assert.equal(closed?.status, "loi");
    assert.equal(await balanceOf("u2"), 1000);
  });

  it("phiếu của người khác không đụng được", async () => {
    assert.equal(await chargeTicketWith(sql, "p1", "ke-gian", 100), 0);
    assert.equal(await closeTicketWith(sql, "p1", "ke-gian", false), null);
    assert.equal((await ticket("p1")).held, 500);
  });

  it("phiếu giữ quá hạn được nhả về ví", async () => {
    await sql`update run_tickets set created_at = now() - interval '7 hours' where id = 'p1'`;
    assert.equal(await releaseStaleWith(sql, "u2"), 500);
    assert.equal(await balanceOf("u2"), 1000);
    assert.equal((await ticket("p1")).status, "da-nha");
  });
});

describe("đọc thuyết minh trừ thẳng ví", () => {
  beforeEach(async () => {
    await fresh("u3", 100);
  });

  it("đủ tiền thì trừ và gộp vào một dòng mỗi ngày; thiếu thì từ chối", async () => {
    assert.equal(await chargeSpeechWith(sql, "u3", 30, DAY, 0, START), true);
    assert.equal(await chargeSpeechWith(sql, "u3", 30, DAY, 0, START), true);
    assert.equal(await chargeSpeechWith(sql, "u3", 50, DAY, 0, START), false);
    assert.equal(await balanceOf("u3"), 40);
    assert.equal((await ticket(`tts-u3-${DAY}`)).charged, 60);
  });

  it("đồng thời không âm ví", async () => {
    const ok = await Promise.all(Array.from({ length: 8 }, () => chargeSpeechWith(sql, "u3", 30, DAY, 0, START)));
    assert.equal(ok.filter(Boolean).length, 3);
    assert.equal(await balanceOf("u3"), 10);
  });

  it("Groq lỗi thì hoàn lại", async () => {
    await chargeSpeechWith(sql, "u3", 30, DAY, 0, START);
    await refundSpeechWith(sql, "u3", 30, DAY);
    assert.equal(await balanceOf("u3"), 100);
    assert.equal((await ticket(`tts-u3-${DAY}`)).charged, 0);
  });
});
