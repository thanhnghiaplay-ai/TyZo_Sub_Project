import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { countUncosted, estimateBase, estimateOldCostWith } from "./cost-estimate.ts";

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

beforeEach(async () => {
  await sql`delete from run_tickets`;
  await sql`insert into run_tickets (id, user_id, file_name, charged, base_cost, status) values ('old1', 'u', 'a', 1100, 0, 'da-tru')`;
  await sql`insert into run_tickets (id, user_id, file_name, charged, base_cost, status) values ('real', 'u', 'b', 1100, 1000, 'da-tru')`;
  await sql`insert into run_tickets (id, user_id, file_name, charged, base_cost, status) values ('live', 'u', 'c', 500, 0, 'dang-giu')`;
  await sql`insert into run_tickets (id, user_id, file_name, charged, base_cost, status) values ('free', 'u', 'd', 0, 0, 'da-nha')`;
});

const baseOf = async (id: string) => (await sql<{ base_cost: number; base_est: boolean }>`select base_cost, base_est from run_tickets where id = ${id}`)[0];

describe("giá vốn ước tính cho phiếu cũ", () => {
  it("tính từ số đã trừ và phần chênh", () => {
    assert.equal(estimateBase(1100, 10), 1000);
    assert.equal(estimateBase(1000, 0), 1000);
    assert.equal(estimateBase(0, 10), 0);
    assert.equal(estimateBase(1000, -5), 1000);
  });

  it("chỉ điền phiếu cũ đã trừ tiền và đánh dấu ước tính", async () => {
    assert.equal(await countUncosted(sql), 1);
    assert.equal(await estimateOldCostWith(sql, 10), 1);
    assert.deepEqual(await baseOf("old1"), { base_cost: 1000, base_est: true });
  });

  it("không đụng giá vốn thật, phiếu đang giữ và phiếu chưa trừ", async () => {
    await estimateOldCostWith(sql, 10);
    assert.deepEqual(await baseOf("real"), { base_cost: 1000, base_est: false });
    assert.deepEqual(await baseOf("live"), { base_cost: 0, base_est: false });
    assert.deepEqual(await baseOf("free"), { base_cost: 0, base_est: false });
  });

  it("chạy lần hai không đổi gì", async () => {
    await estimateOldCostWith(sql, 10);
    assert.equal(await estimateOldCostWith(sql, 50), 0);
    assert.equal((await baseOf("old1")).base_cost, 1000);
    assert.equal(await countUncosted(sql), 0);
  });
});
