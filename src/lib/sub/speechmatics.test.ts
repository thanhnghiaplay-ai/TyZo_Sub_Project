import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanSpeechmaticsKey,
  segsFromSpeechmatics,
  sentencesFromSpeechmatics,
  speechmaticsErrorText,
  speechmaticsId,
  speechmaticsJobConfig,
  speechmaticsJobProblem,
  speechmaticsLanguage,
  speechmaticsModel,
  speechmaticsStatus,
} from "./speechmatics.ts";

const word = (content: string, start: number, end: number) => ({ type: "word", start_time: start, end_time: end, alternatives: [{ content, confidence: 0.9, language: "en" }] });
const punct = (content: string, end: number, eos: boolean, attaches = "previous") => ({
  type: "punctuation",
  start_time: end,
  end_time: end,
  is_eos: eos,
  attaches_to: attaches,
  alternatives: [{ content, confidence: 1 }],
});

describe("model và ngôn ngữ Speechmatics", () => {
  it("đổi mã app sang mức model, lạ thì rỗng", () => {
    assert.equal(speechmaticsModel("speechmatics-standard"), "standard");
    assert.equal(speechmaticsModel("speechmatics-enhanced"), "enhanced");
    assert.equal(speechmaticsModel("deepgram-nova-3"), "");
  });
  it("bốn ngôn ngữ nguồn của app, tiếng Trung là cmn, không rõ thì null", () => {
    assert.equal(speechmaticsLanguage("zh"), "cmn");
    for (const code of ["ko", "ja", "en"]) assert.equal(speechmaticsLanguage(code), code);
    assert.equal(speechmaticsLanguage(" EN "), "en");
    assert.equal(speechmaticsLanguage(""), null);
    assert.equal(speechmaticsLanguage("auto"), null);
  });
});

describe("config gửi POST /v2/jobs", () => {
  it("có type, ngôn ngữ, mức model và fetch_data.url", () => {
    const config = speechmaticsJobConfig({ audioUrl: " https://x.test/a.mp4 ", appModel: "speechmatics-enhanced", language: "ja" });
    assert.deepEqual(config, {
      type: "transcription",
      transcription_config: { language: "ja", operating_point: "enhanced" },
      fetch_data: { url: "https://x.test/a.mp4" },
    });
  });
  it("chặn link không http(s), model lạ, ngôn ngữ lạ", () => {
    assert.throws(() => speechmaticsJobConfig({ audioUrl: "ftp://x", appModel: "speechmatics-standard", language: "en" }), /link file công khai/);
    assert.throws(() => speechmaticsJobConfig({ audioUrl: "https://x.test/a", appModel: "whisper-large-v3", language: "en" }), /không phải của Speechmatics/);
    assert.throws(() => speechmaticsJobConfig({ audioUrl: "https://x.test/a", appModel: "speechmatics-standard", language: "" }), /ngôn ngữ gốc/);
  });
});

describe("trạng thái và mã job", () => {
  it("đọc job.status và status phẳng, lạ thì unknown", () => {
    assert.equal(speechmaticsStatus({ job: { id: "a", status: "done" } }), "done");
    assert.equal(speechmaticsStatus({ job: { status: "running" } }), "running");
    assert.equal(speechmaticsStatus({ status: "rejected" }), "rejected");
    assert.equal(speechmaticsStatus({ job: { status: "expired" } }), "expired");
    assert.equal(speechmaticsStatus({ job: { status: "weird" } }), "unknown");
    assert.equal(speechmaticsStatus(null), "unknown");
  });
  it("mã job từ POST (id) hoặc GET (job.id)", () => {
    assert.equal(speechmaticsId({ id: " abc123 " }), "abc123");
    assert.equal(speechmaticsId({ job: { id: "xyz" } }), "xyz");
    assert.equal(speechmaticsId({}), "");
  });
  it("lý do job bị từ chối lấy từ job.errors", () => {
    assert.equal(speechmaticsJobProblem({ job: { status: "rejected", errors: [{ message: "unable to fetch audio" }] } }), "unable to fetch audio");
    assert.equal(speechmaticsJobProblem({ job: {} }), "");
  });
});

describe("đọc transcript json-v2 ra câu", () => {
  const payload = {
    format: "2.9",
    job: { id: "j1", duration: 12.5 },
    results: [
      word("Hello", 0.5, 0.9),
      word("world", 1.0, 1.4),
      punct(".", 1.4, true),
      word("How", 2.0, 2.2),
      word("are", 2.3, 2.5),
      word("you", 2.6, 2.9),
      punct("?", 2.9, true),
    ],
  };
  it("tách câu theo is_eos, dấu câu dính từ trước, giờ tính bằng giây", () => {
    const { sentences, seconds } = sentencesFromSpeechmatics(payload, "en");
    assert.deepEqual(sentences, [
      { start: 0.5, end: 1.4, text: "Hello world." },
      { start: 2.0, end: 2.9, text: "How are you?" },
    ]);
    assert.equal(seconds, 12.5);
  });
  it("thiếu job.duration thì lấy giờ cuối của câu cuối", () => {
    const { seconds } = sentencesFromSpeechmatics({ results: payload.results }, "en");
    assert.equal(seconds, 2.9);
  });
  it("tiếng Trung, Nhật, Hàn nối liền không khoảng trắng", () => {
    const zh = { results: [word("你", 0, 0.2), word("好", 0.2, 0.4), punct("。", 0.4, true)] };
    assert.equal(sentencesFromSpeechmatics(zh, "zh").sentences[0].text, "你好。");
    assert.equal(sentencesFromSpeechmatics({ results: [word("こん", 0, 0.2), word("にちは", 0.2, 0.5), punct("。", 0.5, true)] }, "ja").sentences[0].text, "こんにちは。");
  });
  it("khoảng lặng quá 0,8 giây thì ngắt câu dù chưa có dấu chấm", () => {
    const rows = { results: [word("one", 0, 0.3), word("two", 3.0, 3.3)] };
    assert.equal(sentencesFromSpeechmatics(rows, "en").sentences.length, 2);
  });
  it("bỏ qua mục lạ, thiếu giờ hoặc rỗng; phản hồi hỏng không ném lỗi", () => {
    const rows = { results: [{ type: "mystery", alternatives: [{ content: "x" }] }, word("ok", 0, 0.2), { type: "word", alternatives: [{ content: "bad" }] }, punct(".", 0.2, true)] };
    assert.deepEqual(sentencesFromSpeechmatics(rows, "en").sentences, [{ start: 0, end: 0.2, text: "ok." }]);
    assert.deepEqual(sentencesFromSpeechmatics(null).sentences, []);
    assert.equal(sentencesFromSpeechmatics({}).seconds, 0);
  });
  it("câu quá dài tự cắt", () => {
    const many = { results: Array.from({ length: 40 }, (_, i) => word("word", i * 0.2, i * 0.2 + 0.15)) };
    assert.ok(sentencesFromSpeechmatics(many, "en").sentences.length >= 2);
  });
  it("đổi sang Seg: sắp theo giờ, câu rỗng bị bỏ, end luôn sau start", () => {
    const segs = segsFromSpeechmatics([
      { start: 5, end: 5, text: " b " },
      { start: 1, end: 2, text: "a" },
      { start: 3, end: 4, text: "   " },
    ]);
    assert.deepEqual(segs.map((s) => [s.start, s.original]), [[1, "a"], [5, "b"]]);
    assert.ok(segs[1].end > segs[1].start);
    assert.equal(segs[0].translation, null);
  });
});

describe("câu báo lỗi và làm sạch key", () => {
  it("báo lỗi tiếng Việt theo mã và nội dung", () => {
    assert.match(speechmaticsErrorText(401, {}), /Key Speechmatics không hợp lệ/);
    assert.match(speechmaticsErrorText(403, {}), /đúng vùng/);
    assert.match(speechmaticsErrorText(402, {}), /hết hạn mức/);
    assert.match(speechmaticsErrorText(400, { detail: "quota exceeded" }), /hết hạn mức/);
    assert.match(speechmaticsErrorText(429, {}), /giới hạn tốc độ/);
    assert.match(speechmaticsErrorText(400, { detail: "unable to fetch audio from url" }), /không tải được link/);
    assert.match(speechmaticsErrorText(400, { job: { errors: [{ message: "Unsupported audio format" }] } }), /định dạng/);
    assert.match(speechmaticsErrorText(503, null), /đang bận/);
    assert.match(speechmaticsErrorText(400, { error: "boom" }), /Speechmatics báo lỗi: boom/);
    assert.match(speechmaticsErrorText(418, null), /mã 418/);
  });
  it("key hợp lệ được cắt khoảng trắng, key lạ bị chặn", () => {
    assert.equal(cleanSpeechmaticsKey("  " + "k".repeat(32) + " "), "k".repeat(32));
    for (const bad of ["", "short", "room", "a b".repeat(10), "k".repeat(300)]) assert.throws(() => cleanSpeechmaticsKey(bad), /không đúng/);
  });
});
