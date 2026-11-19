import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkPolishModels,
  parsePolishModels,
  pickPolishChoice,
  polishChoices,
  polishIdsFor,
  polishNoModelText,
  polishRows,
  poolForGenre,
  POLISH_POOL_MAX,
} from "./polish-models.ts";
import { planPolish } from "./polish-estimate.ts";
import { catalogFor } from "./sub/model-catalog.ts";

const row = (id: string, extra: Record<string, unknown>) =>
  ({ id, speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...extra });

const BOOK = {
  rate: 25000,
  rows: [row("whisper-large-v3-turbo", { usdPerHour: 0.04 }), row("openai/gpt-oss-120b", { usdIn: 0.15, usdOut: 0.6 }), row("openai/gpt-oss-20b", { usdIn: 0.075, usdOut: 0.3 })],
  desk: { markup: 0, custom: {} },
} as never;

const OPTS = { genre: "daily", context: "", language: "Vietnamese" };
const PLAN = planPolish(Array.from({ length: 20 }, (_, i) => ({ original: `gốc ${i}`, translation: `Bản dịch ${i}.` })), OPTS);

describe("poolForGenre", () => {
  it("ba thể loại 18+ dùng danh sách không kiểm duyệt", () => {
    for (const g of ["adult", "softcore", "sex", "SEX", " adult "]) assert.equal(poolForGenre(g), "uncensored", g);
  });
  it("thể loại thường và rỗng dùng danh sách có kiểm duyệt", () => {
    for (const g of ["daily", "comedy", "horror", "romance", "auto", "", "lạ"]) assert.equal(poolForGenre(g), "censored", g);
  });
});

describe("parsePolishModels / checkPolishModels", () => {
  it("rỗng hoặc hỏng thì null", () => {
    assert.equal(parsePolishModels(null), null);
    assert.equal(parsePolishModels(""), null);
    assert.equal(parsePolishModels("{hỏng"), null);
  });
  it("bỏ mã sai, trùng, và cắt ở mức tối đa", () => {
    const many = Array.from({ length: 30 }, (_, i) => `openai/gpt-oss-${i + 100}b`);
    const got = parsePolishModels(JSON.stringify({ censored: ["a b", "openai/gpt-oss-20b", "openai/gpt-oss-20b", 5, ...many], uncensored: [] }));
    assert.ok(got);
    assert.equal(got.censored[0], "openai/gpt-oss-20b");
    assert.equal(got.censored.length, POLISH_POOL_MAX);
    assert.deepEqual(got.uncensored, []);
  });
  it("model nhận dạng, giọng đọc, kiểm duyệt không vào được", () => {
    for (const kind of ["asr", "tts", "guard"] as const) {
      const id = catalogFor("groq", kind)[0]?.id;
      if (!id) continue;
      assert.throws(() => checkPolishModels({ censored: [id], uncensored: [] }), /không phải model dịch/, kind);
      assert.throws(() => checkPolishModels({ censored: [], uncensored: [id] }), /không phải model dịch/, kind);
    }
  });
  it("model dịch hợp lệ qua được", () => {
    const id = catalogFor("groq", "chat")[0].id;
    assert.deepEqual(checkPolishModels({ censored: [id], uncensored: [] }), { censored: [id], uncensored: [] });
  });
});

describe("polishIdsFor", () => {
  const models = { censored: ["openai/gpt-oss-20b"], uncensored: ["openai/gpt-oss-120b"] };
  it("thể loại thường lấy danh sách có kiểm duyệt, 18+ lấy không kiểm duyệt", () => {
    assert.deepEqual(polishIdsFor(models, "daily"), ["openai/gpt-oss-20b"]);
    assert.deepEqual(polishIdsFor(models, "sex"), ["openai/gpt-oss-120b"]);
  });
  it("Chủ chưa lưu thì null", () => {
    assert.equal(polishIdsFor(null, "daily"), null);
  });
  it("hai danh sách không lẫn vào nhau", () => {
    assert.ok(!polishIdsFor(models, "adult")?.includes("openai/gpt-oss-20b"));
    assert.ok(!polishIdsFor(models, "comedy")?.includes("openai/gpt-oss-120b"));
  });
});

describe("polishRows (bảng Admin)", () => {
  const all = polishRows(null);
  it("chỉ có model dịch của Groq, không có nhận dạng, giọng đọc, kiểm duyệt", () => {
    const chat = new Set(catalogFor("groq", "chat").map((m) => m.id));
    assert.ok(all.length > 0);
    for (const r of all) assert.ok(chat.has(r.id), r.id);
    for (const kind of ["asr", "tts", "guard", "live"] as const) for (const m of catalogFor("groq", kind)) assert.ok(!all.some((r) => r.id === m.id), m.id);
  });
  it("model lạ trên key phòng loại chat thì thêm, loại khác thì không", () => {
    const rows = polishRows(["openai/gpt-oss-20b", "llama-9-chat-lạ", "whisper-large-v3-turbo"]);
    assert.ok(!rows.some((r) => r.id === "whisper-large-v3-turbo"));
    assert.equal(rows.find((r) => r.id === "openai/gpt-oss-20b")?.onKey, true);
  });
});

describe("polishChoices / pickPolishChoice", () => {
  it("mỗi model có giá ước riêng; model đắt hơn thì tốn nhiều Token hơn", () => {
    const list = polishChoices({ ids: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"], plan: PLAN, chatBook: BOOK, groqBook: BOOK });
    assert.equal(list.length, 2);
    assert.ok(list.every((c) => c.quote.ready && (c.quote.tokens ?? 0) > 0));
    assert.ok((list[1].quote.tokens ?? 0) > (list[0].quote.tokens ?? 0));
  });
  it("model chưa có giá vẫn hiện nhưng chưa sẵn sàng", () => {
    const list = polishChoices({ ids: ["model-chua-co-gia"], plan: PLAN, chatBook: BOOK, groqBook: BOOK });
    assert.equal(list[0].quote.ready, false);
  });
  it("lọc theo model khách gọi được", () => {
    const list = polishChoices({ ids: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"], plan: PLAN, chatBook: BOOK, groqBook: BOOK, available: new Set(["openai/gpt-oss-120b"]) });
    assert.deepEqual(list.map((c) => c.id), ["openai/gpt-oss-120b"]);
  });
  it("giữ lựa chọn cũ nếu còn; không thì lấy model đầu đã có giá", () => {
    const list = polishChoices({ ids: ["model-chua-co-gia", "openai/gpt-oss-20b", "openai/gpt-oss-120b"], plan: PLAN, chatBook: BOOK, groqBook: BOOK });
    assert.equal(pickPolishChoice(list, "openai/gpt-oss-120b")?.id, "openai/gpt-oss-120b");
    assert.equal(pickPolishChoice(list, "không có")?.id, "openai/gpt-oss-20b");
    assert.equal(pickPolishChoice([], "x"), null);
  });
});

describe("polishNoModelText", () => {
  it("báo đúng chỗ thiếu, và rỗng khi đã có", () => {
    assert.match(polishNoModelText(null, "daily"), /Chưa mở/);
    assert.match(polishNoModelText({ censored: [], uncensored: ["openai/gpt-oss-20b"] }, "daily"), /Chưa có model/);
    assert.match(polishNoModelText({ censored: ["openai/gpt-oss-20b"], uncensored: [] }, "sex"), /không kiểm duyệt/);
    assert.equal(polishNoModelText({ censored: ["openai/gpt-oss-20b"], uncensored: [] }, "daily"), "");
  });
});
