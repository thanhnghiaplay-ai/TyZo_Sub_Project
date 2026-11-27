import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import { recordSpendWith, spendSummaryWith, verdict } from "./provider-spend.ts";

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
  await sql`truncate provider_spend`;
});

describe("tiền phải trả từng nhà cung cấp", () => {
  it("cộng dồn theo ngày × nhà × model, quy USD theo tỷ giá lúc gọi", async () => {
    await recordSpendWith(sql, { provider: "groq", model: "whisper-large-v3-turbo", baseVnd: 2600, rate: 26000 });
    await recordSpendWith(sql, { provider: "groq", model: "whisper-large-v3-turbo", baseVnd: 2600, rate: 26000 });
    await recordSpendWith(sql, { provider: "alibaba", model: "qwen3.8-27b", baseVnd: 13000, rate: 26000 });
    const sum = await spendSummaryWith(sql, "14 days");
    assert.equal(sum.total.calls, 3);
    assert.equal(sum.total.vnd, 18200);
    assert.ok(Math.abs(sum.total.usd - 0.7) < 1e-9);
    assert.equal(sum.providers[0].provider, "alibaba");
    assert.equal(sum.providers[1].models[0].calls, 2);
    assert.ok(sum.since);
  });

  it("bỏ qua lần gọi không tốn, không bao giờ ném lỗi", async () => {
    await recordSpendWith(sql, { provider: "groq", model: "x", baseVnd: 0, rate: 26000 });
    const broken = { query: () => Promise.reject(new Error("db")) } as unknown as Sql;
    await assert.doesNotReject(recordSpendWith(broken, { provider: "groq", model: "x", baseVnd: 100, rate: 26000 }));
    assert.equal((await spendSummaryWith(sql, "14 days")).total.calls, 0);
  });

  it("phán lời lỗ: lời, lỗ, và lời nhưng lỗ nếu khách dùng hết Token còn hạn", () => {
    assert.deepEqual(verdict({ revenue: 1000, providers: 300, commission: 50, manual: 100, owedTokensVnd: 100 }), { now: 550, worst: 450, state: "loi" });
    assert.equal(verdict({ revenue: 1000, providers: 1200, commission: 0, manual: 0, owedTokensVnd: 0 }).state, "lo");
    assert.equal(verdict({ revenue: 1000, providers: 600, commission: 0, manual: 0, owedTokensVnd: 500 }).state, "lo-neu-dung-het");
  });
});

describe("mọi cửa tính tiền bằng key phòng đều ghi sổ từng nhà", () => {
  it("cửa gọi model, cửa Groq, nhận dạng bằng link, dịch trực tiếp, TyZo", () => {
    const gate = readFileSync(new URL("./billing/run-gate.ts", import.meta.url), "utf8");
    // Speech, chat and ASR all use atomic settlement; none may silently ignore a spend failure.
    assert.doesNotMatch(gate, /recordSpendWith/);
    assert.match(gate, /await settleGateCall\(sql,/);
    const settle = readFileSync(new URL("./billing/gate-reserve.ts", import.meta.url), "utf8");
    assert.match(settle, /insert into provider_spend/);
    for (const [file, mark] of [
      ["../routes/api/model-call.ts", /unitBook: groq,\s*provider,/],
      ["../routes/api/room-groq.ts", /provider: "groq",/],
      ["./billing/room-asr.server.ts", /recordSpendWith\(sql, \{ provider: asrHouse\(input\.model\)/],
      ["./live/live-billing.ts", /recordSpendDurablyWith\(sql,/],
      ["./tyzo-modal-call.ts", /modalPartWork\(sql, attempt,/],
      ["./billing/modal-work.ts", /recordSpendDurablyWith\(sql,/],
    ] as const) {
      assert.match(readFileSync(new URL(file, import.meta.url), "utf8"), mark, file);
    }
  });

  it("trang Doanh thu có ô lời lỗ ở đầu, chỉ Admin", () => {
    const board = readFileSync(new URL("../components/admin-company.tsx", import.meta.url), "utf8");
    assert.match(board, /\{owner && <ProfitVerdict span=\{span\} \/>\}/);
    const room = readFileSync(new URL("./profit-room.ts", import.meta.url), "utf8");
    assert.match(room, /requireRole\(context\.userId, "chu"\)/);
  });
});
