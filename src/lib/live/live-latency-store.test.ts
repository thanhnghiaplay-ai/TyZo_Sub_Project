import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { before, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import { loadLatencyRows, saveLatency } from "./live-latency-store.ts";

let sql: Sql;
before(async () => {
  const db = new PGlite();
  const dir = new URL("../../../migrations/", import.meta.url);
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

describe("sổ độ trễ dịch trực tiếp", () => {
  it("ghi khi phiên đóng, bỏ phiên chưa có gì, gom theo model; bảng không có cột tài khoản", async () => {
    const base = { readyMs: 400, firstTextMs: 1200, tam: [700, 900], chot: [1500], audioSeconds: 30, reconnects: 0, endReason: "nguoi-dung-dung" };
    await saveLatency(sql, { ...base, model: "m1" });
    await saveLatency(sql, { ...base, model: "m1", tam: [1100], chot: [2500, 3000], endReason: "im-lang" });
    await saveLatency(sql, { ...base, model: "m2", readyMs: null, audioSeconds: 0 }); // không đo được gì
    const rows = await loadLatencyRows(sql, 7);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].model, "m1");
    assert.equal(rows[0].sessions, 2);
    assert.equal(rows[0].tamP50, 900);
    assert.equal(rows[0].chotP95, 3000);
    assert.equal(rows[0].idleStops, 1);
    const cols = await sql<{ column_name: string }>`select column_name from information_schema.columns where table_name = 'live_latency'`;
    assert.ok(!cols.some((c) => /user|account|email/.test(c.column_name)));
  });
});
