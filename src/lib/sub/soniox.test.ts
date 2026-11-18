import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanSonioxKey,
  segsFromSoniox,
  sentencesFromSoniox,
  sonioxErrorText,
  sonioxId,
  sonioxJobProblem,
  sonioxLanguage,
  sonioxModel,
  sonioxStatus,
  sonioxSubmitBody,
} from "./soniox.ts";

const tok = (text: string, a: number, b: number, status?: string) => ({ text, start_ms: a, end_ms: b, confidence: 0.9, ...(status ? { translation_status: status } : {}) });

describe("model và ngôn ngữ Soniox", () => {
  it("đổi mã app sang model Soniox, lạ thì rỗng", () => {
    assert.equal(sonioxModel("soniox-stt-async"), "stt-async-v5");
    assert.equal(sonioxModel("deepgram-nova-3"), "");
  });
  it("bốn ngôn ngữ nguồn của app, không rõ thì null", () => {
    for (const code of ["zh", "ko", "ja", "en"]) assert.equal(sonioxLanguage(code), code);
    assert.equal(sonioxLanguage(" EN "), "en");
    assert.equal(sonioxLanguage(""), null);
    assert.equal(sonioxLanguage("auto"), null);
  });
});

describe("sonioxSubmitBody", () => {
  it("có gợi ý ngôn ngữ thì tắt tự nhận diện", () => {
    const body = sonioxSubmitBody({ audioUrl: " https://x.test/a.mp3 ", appModel: "soniox-stt-async", language: "zh" });
    assert.deepEqual(body, { model: "stt-async-v5", audio_url: "https://x.test/a.mp3", language_hints: ["zh"], enable_language_identification: false });
  });
  it("ngôn ngữ lạ thì bật tự nhận diện, không gửi gợi ý", () => {
    const body = sonioxSubmitBody({ audioUrl: "https://x.test/a.mp3", appModel: "soniox-stt-async", language: "auto" });
    assert.equal(body.enable_language_identification, true);
    assert.equal("language_hints" in body, false);
  });
  it("chặn model lạ và link không http(s)", () => {
    assert.throws(() => sonioxSubmitBody({ audioUrl: "https://x.test/a.mp3", appModel: "x", language: "en" }), /không phải của Soniox/);
    assert.throws(() => sonioxSubmitBody({ audioUrl: "ftp://x.test/a.mp3", appModel: "soniox-stt-async", language: "en" }), /http/);
  });
});

describe("trạng thái, mã, lý do lỗi", () => {
  it("đọc status và id", () => {
    for (const s of ["queued", "processing", "completed", "error"]) assert.equal(sonioxStatus({ status: s }), s);
    assert.equal(sonioxStatus({ status: "x" }), "unknown");
    assert.equal(sonioxStatus(null), "unknown");
    assert.equal(sonioxId({ id: " abc " }), "abc");
    assert.equal(sonioxId({}), "");
  });
  it("lý do lỗi cắt 200 ký tự", () => {
    assert.equal(sonioxJobProblem({ error_message: "bad url" }), "bad url");
    assert.equal(sonioxJobProblem({ error_message: "x".repeat(300) }).length, 200);
    assert.equal(sonioxJobProblem({}), "");
  });
});

describe("sentencesFromSoniox", () => {
  it("nối mảnh từ có khoảng trắng đầu, ngắt câu ở dấu chấm, mili giây ra giây", () => {
    const r = sentencesFromSoniox({ tokens: [tok("Hel", 0, 200), tok("lo", 200, 400), tok(" world", 450, 900), tok(".", 900, 920), tok(" Next", 1000, 1300), tok(" one", 1300, 1600), tok("!", 1600, 1620)] }, "en");
    assert.deepEqual(r.sentences, [
      { start: 0, end: 0.92, text: "Hello world." },
      { start: 1, end: 1.62, text: "Next one!" },
    ]);
    assert.equal(r.seconds, 1.62);
  });
  it("khoảng lặng trên 0,8 giây ngắt câu", () => {
    const r = sentencesFromSoniox({ tokens: [tok("one", 0, 500), tok(" two", 2000, 2500)] }, "en");
    assert.equal(r.sentences.length, 2);
  });
  it("tiếng Trung nối liền, ngắt ở 。", () => {
    const r = sentencesFromSoniox({ tokens: [tok("你", 0, 300), tok("好", 300, 600), tok("。", 600, 650), tok("再见", 700, 1200)] }, "zh");
    assert.deepEqual(r.sentences.map((s) => s.text), ["你好。", "再见"]);
  });
  it("bỏ token dịch và token thiếu giờ", () => {
    const r = sentencesFromSoniox({ tokens: [tok("Hi", 0, 300, "original"), tok(" xin chào", 0, 300, "translation"), { text: "x" }, tok(".", 300, 320)] }, "en");
    assert.deepEqual(r.sentences.map((s) => s.text), ["Hi."]);
  });
  it("thời lượng ưu tiên audio_duration_ms; rỗng thì 0", () => {
    assert.equal(sentencesFromSoniox({ tokens: [tok("a.", 0, 100)], audio_duration_ms: 5000 }).seconds, 5);
    assert.deepEqual(sentencesFromSoniox({}), { sentences: [], seconds: 0 });
    assert.deepEqual(sentencesFromSoniox(null), { sentences: [], seconds: 0 });
  });
  it("câu dài bị cắt ở 84 ký tự (36 với tiếng Á)", () => {
    const words = Array.from({ length: 40 }, (_, i) => tok(" word", i * 100, i * 100 + 90));
    assert.ok(sentencesFromSoniox({ tokens: words }, "en").sentences.length >= 2);
  });
});

describe("segsFromSoniox", () => {
  it("ra Seg, bỏ câu rỗng, sắp theo giờ", () => {
    const segs = segsFromSoniox([{ start: 5, end: 6, text: "b" }, { start: 1, end: 1, text: "a" }, { start: 2, end: 3, text: " " }]);
    assert.deepEqual(segs.map((s) => [s.start, s.original]), [[1, "a"], [5, "b"]]);
    assert.ok(segs[0].end >= 1.1);
    assert.equal(segs[0].translation, null);
  });
});

describe("sonioxErrorText, cleanSonioxKey", () => {
  it("báo lỗi tiếng Việt theo mã và nội dung", () => {
    assert.match(sonioxErrorText(401, {}), /Key Soniox/);
    assert.match(sonioxErrorText(402, {}), /hạn mức|nạp/);
    assert.match(sonioxErrorText(400, { error_message: "Insufficient balance" }), /nạp/);
    assert.match(sonioxErrorText(429, {}), /giới hạn/);
    assert.match(sonioxErrorText(400, { error_message: "Failed to fetch audio url" }), /link/);
    assert.match(sonioxErrorText(400, { error_message: "Unsupported audio format" }), /định dạng/);
    assert.match(sonioxErrorText(400, { message: "unknown model" }), /model/);
    assert.match(sonioxErrorText(503, {}), /bận/);
    assert.match(sonioxErrorText(418, {}), /mã 418/);
  });
  it("key: chặn room, khoảng trắng, độ dài lạ", () => {
    assert.equal(cleanSonioxKey("  " + "a".repeat(32) + " "), "a".repeat(32));
    for (const bad of ["room", "short", "a b".repeat(10), "a".repeat(300)]) assert.throws(() => cleanSonioxKey(bad), /Key Soniox/);
  });
});
