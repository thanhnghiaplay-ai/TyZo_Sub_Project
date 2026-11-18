import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assemblyaiErrorText,
  assemblyaiId,
  assemblyaiLanguage,
  assemblyaiModel,
  assemblyaiStatus,
  assemblyaiSubmitBody,
  cleanAssemblyaiKey,
  segsFromAssemblyai,
  sentencesFromAssemblyai,
} from "./assemblyai.ts";

describe("model và ngôn ngữ AssemblyAI", () => {
  it("đổi mã app sang mã AssemblyAI, lạ thì rỗng", () => {
    assert.equal(assemblyaiModel("assemblyai-universal-3-5-pro"), "universal-3-5-pro");
    assert.equal(assemblyaiModel("assemblyai-universal-2"), "universal-2");
    assert.equal(assemblyaiModel("deepgram-nova-3"), "");
  });
  it("bốn ngôn ngữ nguồn của app, không rõ thì null", () => {
    for (const code of ["zh", "ko", "ja", "en"]) assert.equal(assemblyaiLanguage(code), code);
    assert.equal(assemblyaiLanguage(" JA "), "ja");
    assert.equal(assemblyaiLanguage(""), null);
    assert.equal(assemblyaiLanguage("auto"), null);
  });
});

describe("thân gửi POST /v2/transcript", () => {
  it("luôn có speech_models và ngôn ngữ; Pro lùi về Universal-2", () => {
    const body = assemblyaiSubmitBody({ audioUrl: " https://x.test/a.mp3 ", appModel: "assemblyai-universal-3-5-pro", language: "zh" });
    assert.equal(body.audio_url, "https://x.test/a.mp3");
    assert.deepEqual(body.speech_models, ["universal-3-5-pro", "universal-2"]);
    assert.equal(body.language_code, "zh");
    assert.equal(body.language_detection, undefined);
  });
  it("Universal-2 không lùi; không rõ ngôn ngữ thì bật tự nhận", () => {
    const body = assemblyaiSubmitBody({ audioUrl: "https://x.test/a.mp3", appModel: "assemblyai-universal-2", language: "" });
    assert.deepEqual(body.speech_models, ["universal-2"]);
    assert.equal(body.language_detection, true);
    assert.equal(body.language_code, undefined);
  });
  it("từ chối link không phải http(s) và model lạ", () => {
    assert.throws(() => assemblyaiSubmitBody({ audioUrl: "file:///a.mp3", appModel: "assemblyai-universal-2", language: "en" }), /link/);
    assert.throws(() => assemblyaiSubmitBody({ audioUrl: "https://x.test/a", appModel: "whisper-large-v3", language: "en" }), /AssemblyAI/);
  });
});

describe("trạng thái và mã bản phiên âm", () => {
  it("đọc status và id", () => {
    assert.equal(assemblyaiStatus({ status: "queued" }), "queued");
    assert.equal(assemblyaiStatus({ status: "completed" }), "completed");
    assert.equal(assemblyaiStatus({ status: "error" }), "error");
    assert.equal(assemblyaiStatus({ status: "weird" }), "unknown");
    assert.equal(assemblyaiStatus(null), "unknown");
    assert.equal(assemblyaiId({ id: " abc-1 " }), "abc-1");
    assert.equal(assemblyaiId({}), "");
  });
});

describe("đọc bản phiên âm thành câu", () => {
  const words = [
    { text: "Hello", start: 100, end: 400, confidence: 0.9 },
    { text: "world.", start: 400, end: 900, confidence: 0.9 },
    { text: "Next", start: 1000, end: 1300, confidence: 0.9 },
    { text: "one", start: 3000, end: 3400, confidence: 0.9 },
  ];
  it("đổi mili giây sang giây, tách theo dấu chấm và khoảng lặng, lấy thời lượng theo giây", () => {
    const out = sentencesFromAssemblyai({ status: "completed", audio_duration: 282, words });
    assert.equal(out.seconds, 282);
    assert.deepEqual(out.sentences, [
      { start: 0.1, end: 0.9, text: "Hello world." },
      { start: 1, end: 1.3, text: "Next" },
      { start: 3, end: 3.4, text: "one" },
    ]);
  });
  it("không có thời lượng thì lấy cuối câu cuối", () => {
    assert.equal(sentencesFromAssemblyai({ words }).seconds, 3.4);
  });
  it("tiếng Trung nối chữ liền, không chèn khoảng trắng", () => {
    const zh = [
      { text: "你", start: 0, end: 200 },
      { text: "好", start: 200, end: 400 },
      { text: "吗？", start: 400, end: 700 },
    ];
    assert.equal(sentencesFromAssemblyai({ words: zh }, "zh").sentences[0].text, "你好吗？");
    // Không khai ngôn ngữ nhưng AssemblyAI báo language_code zh: vẫn nối liền.
    assert.equal(sentencesFromAssemblyai({ language_code: "zh", words: zh }).sentences[0].text, "你好吗？");
  });
  it("câu quá dài thì cắt, câu tiếng Trung cắt sớm hơn", () => {
    const long = Array.from({ length: 30 }, (_, i) => ({ text: "word" + i, start: i * 100, end: i * 100 + 90 }));
    assert.ok(sentencesFromAssemblyai({ words: long }).sentences.length >= 2);
    const zh = Array.from({ length: 50 }, (_, i) => ({ text: "字", start: i * 100, end: i * 100 + 90 }));
    assert.ok(sentencesFromAssemblyai({ words: zh }, "zh").sentences.length >= 2);
  });
  it("bỏ từ rỗng hoặc thiếu giờ; không có words thì dùng utterances", () => {
    assert.deepEqual(sentencesFromAssemblyai({ words: [{ text: " ", start: 0, end: 1 }, { text: "x" }] }).sentences, []);
    const out = sentencesFromAssemblyai({
      utterances: [{ speaker: "A", text: " Xin chào. ", start: 500, end: 2000 }, { text: "", start: 2000, end: 3000 }, { text: "Hết", start: 3000, end: 3000 }],
    });
    assert.deepEqual(out.sentences, [
      { start: 0.5, end: 2, text: "Xin chào." },
      { start: 3, end: 3.1, text: "Hết" },
    ]);
  });
  it("phản hồi rỗng hoặc lạ thì không có câu", () => {
    assert.deepEqual(sentencesFromAssemblyai(null), { sentences: [], seconds: 0 });
    assert.deepEqual(sentencesFromAssemblyai({ words: "x" }).sentences, []);
  });
});

describe("Seg từ câu", () => {
  it("đặt original và raw, sắp theo giờ, bỏ câu rỗng", () => {
    const segs = segsFromAssemblyai([
      { start: 3, end: 3, text: "b" },
      { start: 1, end: 2, text: " a " },
      { start: 5, end: 6, text: " " },
    ]);
    assert.deepEqual(segs.map((s) => [s.start, s.end, s.original, s.raw, s.translation]), [
      [1, 2, "a", "a", null],
      [3, 3.1, "b", "b", null],
    ]);
  });
});

describe("câu báo lỗi", () => {
  it("theo mã HTTP", () => {
    assert.match(assemblyaiErrorText(401, {}), /Key AssemblyAI/);
    assert.match(assemblyaiErrorText(402, {}), /hết tín dụng/);
    assert.match(assemblyaiErrorText(429, {}), /giới hạn/);
    assert.match(assemblyaiErrorText(503, {}), /bận/);
    assert.match(assemblyaiErrorText(418, {}), /mã 418/);
  });
  it("theo nội dung lỗi", () => {
    assert.match(assemblyaiErrorText(400, { error: "Download error, unable to download https://x" }), /link file công khai/);
    assert.match(assemblyaiErrorText(200, { error: "File does not appear to contain audio" }), /định dạng/);
    assert.match(assemblyaiErrorText(400, { error: "Your account has insufficient balance" }), /hết tín dụng/);
    assert.match(assemblyaiErrorText(400, { error: "Something odd happened" }), /Something odd happened/);
  });
});

describe("key khách", () => {
  it("nhận key đúng dạng, chặn room, khoảng trắng, độ dài lạ", () => {
    assert.equal(cleanAssemblyaiKey("  " + "a".repeat(32) + " "), "a".repeat(32));
    assert.throws(() => cleanAssemblyaiKey("room"));
    assert.throws(() => cleanAssemblyaiKey("short"));
    assert.throws(() => cleanAssemblyaiKey("a".repeat(15) + " " + "b".repeat(15)));
  });
});
