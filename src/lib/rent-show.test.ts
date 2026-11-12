import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ownKeyAvailable, parseRentShow, rentOpen, rentUseProblem } from "./rent-show-rule.ts";

describe("thuê phòng chỉ model Chủ mở", () => {
  it("chưa lưu danh sách thì không khóa", () => {
    assert.equal(parseRentShow(null), null);
    assert.equal(rentOpen(null, "whisper-large-v3-turbo"), true);
    assert.equal(rentUseProblem(null, { asr: "whisper-large-v3", chat: "llama-3.3-70b-versatile" }), "");
  });

  it("đã lưu thì nhận dạng và dịch phải nằm trong danh sách nhà đó", () => {
    const show = parseRentShow(JSON.stringify({
      groq: ["whisper-large-v3-turbo", "llama-3.3-70b-versatile"],
      alibaba: ["qwen-audio-3.0-asr-flash-filetrans"],
    }));
    assert.equal(rentOpen(show!.groq, "whisper-large-v3"), false);
    assert.equal(rentOpen(show!.alibaba, "qwen-audio-3.0-asr-flash-filetrans"), true);
    assert.match(rentUseProblem(show, { asr: "whisper-large-v3", chat: "llama-3.3-70b-versatile" }), /nhận dạng/);
    assert.match(rentUseProblem(show, { asr: "qwen-audio-3.0-asr-flash-filetrans", chat: "qwen-plus" }), /dịch/);
    assert.equal(rentUseProblem(show, { asr: "whisper-large-v3-turbo", chat: "llama-3.3-70b-versatile" }), "");
  });

  it("key của khách chỉ còn model vừa có trên key vừa được mở", () => {
    const next = ownKeyAvailable(["whisper-large-v3-turbo", "llama-3.1-8b-instant"], ["llama-3.1-8b-instant"]);
    assert.equal(next.known, true);
    assert.deepEqual([...(next.ids ?? [])], ["llama-3.1-8b-instant"]);
  });
});
