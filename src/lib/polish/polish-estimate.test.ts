import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPolishModel, planPolish, polishConfirmText, quotePolish } from "./polish-estimate.ts";
import { polishMessages, type PolishItem } from "../sub/polish.ts";
import { CHAT_MODELS } from "../sub/models.ts";

const OPTS = { genre: "daily", context: "FILM CONTEXT: test", language: "Vietnamese" };

function items(n: number): PolishItem[] {
  return Array.from({ length: n }, (_, i) => ({ original: `câu gốc số ${i}`, translation: `Bản dịch số ${i}.` }));
}

const row = (id: string, extra: Record<string, unknown>) =>
  ({ id, speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...extra });

const GROQ = {
  rate: 25000,
  rows: [row("whisper-large-v3-turbo", { usdPerHour: 0.04 }), row("openai/gpt-oss-120b", { usdIn: 0.15, usdOut: 0.6 })],
  desk: { markup: 0, custom: {} },
} as never;

describe("planPolish", () => {
  it("chỉ tính câu gửi: bỏ câu sửa tay, dịch lỗi, chưa dịch", () => {
    const list = items(6);
    list[0].edited = true;
    list[1].failed = true;
    list[2].translation = null;
    const plan = planPolish(list, OPTS);
    assert.equal(plan.sendable, 3);
    assert.equal(plan.batches, 1);
  });

  it("không có câu nào thì không có gì để tính", () => {
    assert.deepEqual(planPolish([], OPTS), { sendable: 0, batches: 0, inn: 0, out: 0 });
  });

  it("chia lô theo cỡ lô", () => {
    assert.equal(planPolish(items(50), OPTS, 24).batches, 3);
    assert.equal(planPolish(items(50), OPTS, 10).batches, 5);
  });

  it("ước token vào không thấp hơn lệnh thật sẽ gửi (đo bằng đúng polishMessages)", () => {
    const list = items(10);
    const real = polishMessages(
      list.map((i) => ({ o: i.original, t: i.translation as string })),
      OPTS,
    );
    const chars = real.reduce((sum, m) => sum + m.content.length, 0);
    const plan = planPolish(list, OPTS);
    assert.ok(plan.inn >= Math.ceil(chars / 2.5));
  });

  it("nhiều câu hơn thì tốn nhiều hơn, cả vào lẫn ra", () => {
    const small = planPolish(items(10), OPTS);
    const big = planPolish(items(200), OPTS);
    assert.ok(big.inn > small.inn);
    assert.ok(big.out > small.out);
  });
});

describe("quotePolish", () => {
  const plan = planPolish(items(100), OPTS);

  it("đủ giá thì ready, có Token dịch dương và đồng", () => {
    const q = quotePolish({ plan, model: "openai/gpt-oss-120b", chatBook: GROQ, groqBook: GROQ });
    assert.equal(q.ready, true);
    assert.ok((q.tokens ?? 0) > 0);
    assert.ok((q.vnd ?? 0) > 0);
  });

  it("model chưa có giá thì KHÔNG ready (không cho chạy khi chưa biết tốn bao nhiêu)", () => {
    const q = quotePolish({ plan, model: "model-la-chua-co-gia", chatBook: GROQ, groqBook: GROQ });
    assert.equal(q.ready, false);
    assert.match(q.reason ?? "", /chưa có giá/);
    assert.equal(q.tokens, null);
  });

  it("thiếu bảng giá thì không ready", () => {
    assert.equal(quotePolish({ plan, model: "openai/gpt-oss-120b", chatBook: undefined, groqBook: GROQ }).ready, false);
    assert.equal(quotePolish({ plan, model: "openai/gpt-oss-120b", chatBook: GROQ, groqBook: undefined }).ready, false);
  });

  it("thiếu giá Turbo thì không quy được ra Token dịch", () => {
    const noTurbo = { rate: 25000, rows: [row("openai/gpt-oss-120b", { usdIn: 0.15, usdOut: 0.6 })], desk: { markup: 0, custom: {} } } as never;
    const q = quotePolish({ plan, model: "openai/gpt-oss-120b", chatBook: GROQ, groqBook: noTurbo });
    assert.equal(q.ready, false);
    assert.match(q.reason ?? "", /Token dịch/);
  });

  it("không có câu nào thì không ready và không tốn gì", () => {
    const q = quotePolish({ plan: planPolish([], OPTS), model: "openai/gpt-oss-120b", chatBook: GROQ, groqBook: GROQ });
    assert.equal(q.ready, false);
    assert.equal(q.tokens, 0);
  });

  it("phim dài gấp đôi thì ước cao hơn", () => {
    const a = quotePolish({ plan: planPolish(items(100), OPTS), model: "openai/gpt-oss-120b", chatBook: GROQ, groqBook: GROQ });
    const b = quotePolish({ plan: planPolish(items(400), OPTS), model: "openai/gpt-oss-120b", chatBook: GROQ, groqBook: GROQ });
    assert.ok((b.tokens ?? 0) > (a.tokens ?? 0));
  });
});

describe("defaultPolishModel", () => {
  it("trả về model có trong danh mục, không đoán tên ngoài danh mục", () => {
    const id = defaultPolishModel({ sourceLang: "en", genre: "daily", available: null, allowEnterprise: false });
    assert.ok(CHAT_MODELS.some((m) => m.id === id));
  });

  it("chỉ chọn trong số model đang có của nhà cung cấp", () => {
    const id = defaultPolishModel({ sourceLang: "en", genre: "daily", available: new Set(["openai/gpt-oss-20b"]), allowEnterprise: false });
    assert.equal(id, "openai/gpt-oss-20b");
  });
});

describe("polishConfirmText", () => {
  const plan = planPolish(items(10), OPTS);
  const quote = quotePolish({ plan, model: "openai/gpt-oss-120b", chatBook: GROQ, groqBook: GROQ });

  it("nói rõ số câu, giá ước, không ghi đè, hủy thì không trừ", () => {
    const t = polishConfirmText({ plan, quote, modelName: "GPT-OSS 120B", skippedEdited: 0 });
    assert.match(t.text, /10 câu/);
    assert.match(t.text, /Token dịch/);
    assert.match(t.text, /không bị ghi đè/);
    assert.match(t.text, /không trừ/);
    assert.ok(!/câu bạn đã sửa tay/.test(t.text));
  });

  it("có câu sửa tay thì báo sẽ giữ nguyên", () => {
    const t = polishConfirmText({ plan, quote, modelName: "GPT-OSS 120B", skippedEdited: 3 });
    assert.match(t.text, /3 câu bạn đã sửa tay/);
  });

  it("chưa ước được thì nói lý do thay vì bịa số", () => {
    const bad = quotePolish({ plan, model: "model-la", chatBook: GROQ, groqBook: GROQ });
    const t = polishConfirmText({ plan, quote: bad, modelName: "X", skippedEdited: 0 });
    assert.match(t.text, /chưa có giá/);
    assert.ok(!/Token dịch\. Số trừ/.test(t.text));
  });

  it("key riêng của khách: không hứa trừ Token dịch", () => {
    const t = polishConfirmText({ plan, quote, modelName: "GPT-OSS 120B", skippedEdited: 0, ownKey: true });
    assert.match(t.text, /key Groq của bạn/);
    assert.ok(!/Ước tính khoảng/.test(t.text));
  });
});
