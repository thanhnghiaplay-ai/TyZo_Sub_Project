import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { polishHold, validPolishTokens, POLISH_MAX_TOKENS } from "./polish-hold.ts";
import { quotePolish } from "./polish-estimate.ts";

const row = (id: string, extra: Record<string, unknown>) =>
  ({ id, speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...extra });
const BOOK = {
  rate: 25000,
  rows: [row("whisper-large-v3-turbo", { usdPerHour: 0.04 }), row("openai/gpt-oss-120b", { usdIn: 0.15, usdOut: 0.6 })],
  desk: { markup: 0, custom: {} },
} as never;

describe("validPolishTokens", () => {
  it("nhận số hợp lệ, làm tròn lên", () => {
    assert.deepEqual(validPolishTokens(1000.2, 500), { inn: 1001, out: 500 });
  });
  it("từ chối số âm, bằng 0, quá lớn, không phải số", () => {
    for (const [a, b] of [[0, 5], [5, 0], [-1, 5], [POLISH_MAX_TOKENS + 1, 5], ["x", 5], [NaN, 5], [5, Infinity]]) assert.equal(validPolishTokens(a, b), null, String([a, b]));
  });
});

describe("polishHold", () => {
  it("giữ nhiều hơn số ước (có đệm), và tăng theo số token", () => {
    const plan = { sendable: 10, batches: 1, inn: 50_000, out: 20_000 };
    const quote = quotePolish({ plan, model: "openai/gpt-oss-120b", chatBook: BOOK, groqBook: BOOK });
    const hold = polishHold(BOOK, "openai/gpt-oss-120b", 50_000, 20_000);
    assert.ok(quote.tokens && hold);
    assert.ok(hold > quote.tokens);
    assert.ok((polishHold(BOOK, "openai/gpt-oss-120b", 500_000, 200_000) ?? 0) > hold);
  });
  it("model chưa có giá thì null, không mở phiếu", () => {
    assert.equal(polishHold(BOOK, "model-la", 1000, 1000), null);
  });
  it("thiếu giá Turbo thì null", () => {
    const noTurbo = { rate: 25000, rows: [row("openai/gpt-oss-120b", { usdIn: 0.15, usdOut: 0.6 })], desk: { markup: 0, custom: {} } } as never;
    assert.equal(polishHold(noTurbo, "openai/gpt-oss-120b", 1000, 1000), null);
  });
});
