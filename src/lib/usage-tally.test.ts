import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { TALLY_DAY_CAP, parseTally, tallyWith, usageMixWith } from "./usage-tally.ts";

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
  await sql`truncate usage_tally, token_grants, room_accounts cascade`;
});

describe("đếm ẩn danh", () => {
  it("chỉ nhận chủ đề và lựa chọn đã khai", () => {
    assert.deepEqual(parseTally({ topic: "use", answer: "hoc" }), { topic: "use", answer: "hoc" });
    assert.deepEqual(parseTally({ topic: "use", answer: "skip" }), { topic: "use", answer: "skip" });
    assert.deepEqual(parseTally({ topic: "pay", answer: "turn" }), { topic: "pay", answer: "turn" });
    assert.equal(parseTally({ topic: "pay", answer: "hoc" }), null);
    assert.equal(parseTally({ topic: "email", answer: "a@b.c" }), null);
    assert.equal(parseTally(null), null);
    assert.equal(parseTally("use"), null);
  });

  it("bảng đếm không có cột nào chỉ tới người dùng", async () => {
    const cols = await sql<{ column_name: string }>`select column_name from information_schema.columns where table_name = 'usage_tally'`;
    assert.deepEqual(cols.map((c) => c.column_name).sort(), ["answer", "day", "n", "topic"]);
  });

  it("cộng dồn theo ngày, có trần mỗi ô", async () => {
    await tallyWith(sql, { topic: "pay", answer: "key" });
    await tallyWith(sql, { topic: "pay", answer: "key" });
    await tallyWith(sql, { topic: "use", answer: "phim" });
    const mix = await usageMixWith(sql, 1);
    assert.deepEqual(mix.tally.find((row) => row.answer === "key"), { topic: "pay", answer: "key", n: 2 });
    assert.equal(mix.tally.find((row) => row.answer === "phim")?.n, 1);
    await sql`update usage_tally set n = ${TALLY_DAY_CAP} where answer = 'key'`;
    await tallyWith(sql, { topic: "pay", answer: "key" });
    assert.equal((await usageMixWith(sql, 1)).tally.find((row) => row.answer === "key")?.n, TALLY_DAY_CAP);
  });

  it("khoảng ngày: hôm nay không tính ngày cũ, 30 ngày thì tính", async () => {
    await sql`insert into usage_tally (day, topic, answer, n) values ((now() at time zone 'Asia/Ho_Chi_Minh')::date - 10, 'pay', 'turn', 4)`;
    assert.equal((await usageMixWith(sql, 1)).tally.length, 0);
    assert.equal((await usageMixWith(sql, 30)).tally[0]?.n, 4);
  });

  it("tài khoản theo cách trả, tính từ gói và Token đã có", async () => {
    await sql`insert into room_accounts (user_id, plan, plan_until) values
      ('a', 'tuan', now() + interval '3 days'), ('b', 'tuan', now() - interval '1 day'), ('c', null, null), ('d', 'ngay', now() + interval '1 day')`;
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values
      ('g1', 'b', 100, 50, 10000, now() + interval '5 days'), ('g2', 'c', 100, 0, 10000, now() + interval '5 days'), ('g3', 'd', 100, 10, 10000, now() + interval '5 days')`;
    const { accounts } = await usageMixWith(sql, 7);
    assert.deepEqual(accounts, { rent: 2, tokens: 2, both: 1, none: 1, total: 4 });
  });
});
