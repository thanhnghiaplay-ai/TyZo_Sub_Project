import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { moneyExtraWith, parseSpan } from "./money-extra-data.ts";

let sql: Sql;
before(async () => {
  const db = new PGlite();
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(file, dir), "utf8"));
  const run = async (text: string, values: unknown[]) => (await db.query(text, values)).rows;
  sql = Object.assign(
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      let text = strings[0];
      for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
      return run(text, values);
    },
    { query: (text: string, params: unknown[] = []) => run(text, params) },
  ) as unknown as Sql;
});

beforeEach(async () => {
  await sql`delete from run_tickets`;
  await sql`delete from room_ledger`;
  await sql`delete from room_costs`;
  await sql`delete from room_accounts`;
});

describe("số liệu mới trang Doanh thu", () => {
  it("khoảng lạ về ngày", () => {
    assert.equal(parseSpan("week"), "week");
    assert.equal(parseSpan("x"), "day");
    assert.equal(parseSpan(undefined), "day");
  });

  it("chưa có dữ liệu thì mọi tỷ số là null, không chia cho 0", async () => {
    const view = await moneyExtraWith(sql, "month");
    assert.equal(view.payers, 0);
    assert.equal(view.arpu, null);
    assert.equal(view.conversion, null);
    assert.equal(view.costPerMinute, null);
    assert.deepEqual(view.categories, []);
  });

  it("ARPU tính trên khách đã nạp, mỗi khách một lần", async () => {
    await sql`insert into room_ledger (user_id, kind, amount, note) values ('a', 'nap', 90000, ''), ('a', 'nap', 10000, ''), ('b', 'nap', 50000, ''), ('c', 'goi', -9000, '')`;
    const view = await moneyExtraWith(sql, "month");
    assert.equal(view.payers, 2);
    assert.equal(view.arpu, 75000);
  });

  it("chuyển đổi: chỉ tính khách đã hết lượt thử", async () => {
    await sql`insert into room_accounts (user_id, trial_left) values ('a', 0), ('b', 0), ('c', 0), ('d', 1)`;
    await sql`insert into room_ledger (user_id, kind, amount, note) values ('a', 'nap', 9000, ''), ('b', 'goi', -9000, ''), ('d', 'nap', 9000, '')`;
    const view = await moneyExtraWith(sql, "year");
    assert.equal(view.trialUsers, 3);
    assert.equal(view.converted, 2);
    assert.ok(Math.abs((view.conversion ?? 0) - 2 / 3) < 1e-9);
  });

  it("giá vốn mỗi phút: chỉ lượt đã trừ tiền, bỏ phiếu đọc thuyết minh và phiếu lỗi", async () => {
    const t = (id: string, status: string, seconds: number, cost: number) =>
      sql.query(`insert into run_tickets (id, user_id, file_name, status, seconds, base_cost) values ($1, 'u', 'f', $2, $3, $4)`, [id, status, seconds, cost]);
    await t("r1", "da-tru", 600, 800);
    await t("r2", "dung-tien", 600, 400);
    await t("r3", "loi", 3000, 9999);
    await t("tts-u-day", "da-tru", 6000, 9999);
    const view = await moneyExtraWith(sql, "month");
    assert.equal(view.audioSeconds, 1200);
    assert.equal(view.costPerMinute, 60);
  });

  it("chi phí theo loại; khoản cũ về khac; tính cả chi phí vào giá mỗi phút", async () => {
    await sql`insert into room_costs (spent_on, label, amount) values (current_date, 'cũ', 100)`;
    await sql`insert into room_costs (spent_on, label, amount, category) values (current_date, 'Neon', 500, 'ha-tang'), (current_date, 'Groq', 300, 'api')`;
    await sql`insert into run_tickets (id, user_id, file_name, status, seconds, base_cost) values ('r1', 'u', 'f', 'da-tru', 600, 600)`;
    const view = await moneyExtraWith(sql, "month");
    assert.deepEqual(view.categories, [
      { category: "ha-tang", amount: 500 },
      { category: "api", amount: 300 },
      { category: "khac", amount: 100 },
    ]);
    assert.equal(view.costPerMinute, 60);
    assert.equal(view.allInPerMinute, 150);
  });
});
