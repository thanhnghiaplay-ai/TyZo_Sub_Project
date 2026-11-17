import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanDeepgramKey, deepgramErrorText, deepgramLanguage, deepgramListenUrl, segsFromDeepgram, sentencesFromDeepgram } from "./deepgram.ts";

describe("ngôn ngữ Deepgram", () => {
  it("bốn ngôn ngữ nguồn của app", () => {
    for (const code of ["zh", "ko", "ja", "en"]) assert.equal(deepgramLanguage(code), code);
    assert.equal(deepgramLanguage(" JA "), "ja");
  });
  it("không rõ thì multi, không để Deepgram rơi về en", () => {
    assert.equal(deepgramLanguage(""), "multi");
    assert.equal(deepgramLanguage("auto"), "multi");
  });
  it("địa chỉ luôn có model, language, utterances", () => {
    const url = new URL(deepgramListenUrl("ko"));
    assert.equal(url.origin + url.pathname, "https://api.deepgram.com/v1/listen");
    assert.equal(url.searchParams.get("model"), "nova-3");
    assert.equal(url.searchParams.get("language"), "ko");
    assert.equal(url.searchParams.get("utterances"), "true");
  });
});

describe("đọc phản hồi nhận dạng", () => {
  it("lấy utterances, bỏ câu rỗng, ghi thời lượng", () => {
    const out = sentencesFromDeepgram({
      metadata: { duration: 12.5 },
      results: { utterances: [{ start: 0.5, end: 2, transcript: " Xin chào. " }, { start: 2, end: 3, transcript: "  " }, { start: 3, end: 3, transcript: "Tạm biệt" }] },
    });
    assert.equal(out.seconds, 12.5);
    assert.deepEqual(out.sentences, [
      { start: 0.5, end: 2, text: "Xin chào." },
      { start: 3, end: 3.1, text: "Tạm biệt" },
    ]);
  });
  it("không có utterances thì gộp từ thành câu theo dấu chấm và khoảng lặng", () => {
    const words = [
      { word: "hello", punctuated_word: "Hello", start: 0, end: 0.4 },
      { word: "world", punctuated_word: "world.", start: 0.4, end: 0.9 },
      { word: "next", punctuated_word: "Next", start: 1, end: 1.3 },
      { word: "one", punctuated_word: "one", start: 3, end: 3.4 },
    ];
    const out = sentencesFromDeepgram({ results: { channels: [{ alternatives: [{ words }] }] } });
    assert.deepEqual(out.sentences.map((s) => s.text), ["Hello world.", "Next", "one"]);
    assert.equal(out.seconds, out.sentences[2].end);
  });
  it("phản hồi lạ thì rỗng, không ném lỗi", () => {
    assert.deepEqual(sentencesFromDeepgram(null), { sentences: [], seconds: 0 });
    assert.deepEqual(sentencesFromDeepgram({ results: {} }), { sentences: [], seconds: 0 });
  });
  it("Seg: sắp theo thời gian, bản dịch chưa có", () => {
    const segs = segsFromDeepgram([
      { start: 5, end: 6, text: "b" },
      { start: 1, end: 2, text: "a" },
      { start: 7, end: 8, text: " " },
    ]);
    assert.deepEqual(segs.map((s) => [s.start, s.original, s.translation]), [[1, "a", null], [5, "b", null]]);
  });
});

describe("câu báo lỗi", () => {
  it("key sai, hết tiền, giới hạn", () => {
    assert.match(deepgramErrorText(401, null), /Key Deepgram không hợp lệ/);
    assert.match(deepgramErrorText(402, null), /hết tín dụng/);
    assert.match(deepgramErrorText(429, null), /giới hạn/);
  });
  it("link không tải được", () => {
    assert.match(deepgramErrorText(400, { err_code: "REMOTE_CONTENT_ERROR" }), /link/);
  });
  it("mã khác thì kèm câu của Deepgram", () => {
    assert.match(deepgramErrorText(400, { err_msg: "bad param" }), /bad param/);
    assert.match(deepgramErrorText(418, null), /418/);
  });
});

describe("key Deepgram", () => {
  it("nhận key hợp lệ, cắt khoảng trắng hai đầu", () => {
    assert.equal(cleanDeepgramKey("  " + "a".repeat(40) + " "), "a".repeat(40));
  });
  it("từ chối key ngắn, có khoảng trắng giữa, hoặc chữ room", () => {
    assert.throws(() => cleanDeepgramKey("abc"));
    assert.throws(() => cleanDeepgramKey("a".repeat(20) + " " + "b".repeat(20)));
    assert.throws(() => cleanDeepgramKey("room"));
    assert.throws(() => cleanDeepgramKey(""));
  });
});
