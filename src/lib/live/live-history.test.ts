import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "../db.ts";
import { KEEP_SESSIONS, cleanHistory, deleteHistoryWith, listHistoryWith, readHistoryWith, saveHistoryWith } from "./live-history.ts";

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
beforeEach(async () => {
  await sql`truncate live_history`;
});

const cues = [
  { s: 0.5, e: 2, o: "你好", t: "Xin chào" },
  { s: 2.2, e: 4.8, o: "欢迎", t: "Chào mừng" },
];

describe("lịch sử dịch trực tiếp", () => {
  it("kiểm đầu vào: bỏ mã lạ, giờ lạ, câu rỗng; cắt chữ quá dài", () => {
    const now = Date.now();
    assert.equal(cleanHistory({ clientId: "x", startedAt: now, cues }, "web", now), null, "mã quá ngắn");
    assert.equal(cleanHistory({ clientId: "abcdefgh12", startedAt: now + 3_600_000, cues }, "web", now), null, "giờ tương lai");
    assert.equal(cleanHistory({ clientId: "abcdefgh12", startedAt: now, cues: [{ s: 0, e: 1, o: " ", t: null }] }, "web", now), null, "không có chữ");
    const ok = cleanHistory({ clientId: "abcdefgh12", startedAt: now, model: "m", target: "vi", cues: [...cues, { s: 9, e: 1, o: "x".repeat(900), t: "" }] }, "app", now)!;
    assert.equal(ok.via, "app");
    assert.equal(ok.cues.length, 3);
    assert.equal(ok.cues[2].o.length, 600);
    assert.equal(ok.cues[2].t, null);
    assert.equal(ok.cues[2].e, 9, "giờ kết thúc không trước giờ bắt đầu");
  });

  it("web lưu, ứng dụng thấy (cùng tài khoản); gửi lại cùng mã không trùng; người khác không thấy, không xóa được", async () => {
    const now = Date.now();
    const web = cleanHistory({ clientId: "webphien001", startedAt: now - 60_000, model: "qwen", target: "vi", cues }, "web", now)!;
    const app = cleanHistory({ clientId: "appphien001", startedAt: now, model: "qwen", target: "vi", cues }, "app", now)!;
    const idWeb = await saveHistoryWith(sql, "u1", web);
    await saveHistoryWith(sql, "u1", web); // gửi lại
    await saveHistoryWith(sql, "u1", app);
    const list = await listHistoryWith(sql, "u1");
    assert.deepEqual(list.map((row) => row.via), ["app", "web"], "mới trước cũ sau, có cả web và ứng dụng");
    assert.equal(list[1].lines, 2);
    assert.equal(list[1].durationMs, 4800);
    assert.equal(list[1].preview, "Xin chào");
    assert.deepEqual((await readHistoryWith(sql, "u1", idWeb))!.cues, cues);
    assert.equal(await readHistoryWith(sql, "u2", idWeb), null, "tài khoản khác không đọc được");
    assert.equal(await deleteHistoryWith(sql, "u2", idWeb), 0, "tài khoản khác không xóa được");
    assert.equal(await deleteHistoryWith(sql, "u1", idWeb), 1);
    assert.equal(await deleteHistoryWith(sql, "u1", null), 1, "xóa hết");
    assert.deepEqual(await listHistoryWith(sql, "u1"), []);
  });

  it("giữ tối đa 30 phiên, bỏ phiên cũ nhất", async () => {
    const now = Date.now();
    for (let i = 0; i < KEEP_SESSIONS + 3; i++) {
      await saveHistoryWith(sql, "u1", cleanHistory({ clientId: `phien${String(i).padStart(4, "0")}`, startedAt: now - (100 - i) * 60_000, cues }, "web", now)!);
    }
    const list = await listHistoryWith(sql, "u1");
    assert.equal(list.length, KEEP_SESSIONS);
    const left = await sql<{ n: number }>`select count(*)::int as n from live_history where user_id = 'u1'`;
    assert.equal(left[0].n, KEEP_SESSIONS, "phiên thừa đã xóa khỏi máy chủ, không chỉ ẩn");
    assert.ok(!list.some((row) => row.id.includes("phien0000")), "phiên cũ nhất đã bị bỏ");
  });
});
