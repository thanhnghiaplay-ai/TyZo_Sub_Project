import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alibabaAsrOnRoomPayProblem, asrHouse, groqListHolds } from "./asr-house.ts";

describe("nhà nhận dạng", () => {
  it("tách Whisper và Alibaba", () => {
    assert.equal(asrHouse("whisper-large-v3-turbo"), "groq");
    assert.equal(asrHouse("whisper-large-v3"), "groq");
    assert.equal(asrHouse("qwen-audio-3.0-asr-flash-filetrans"), "alibaba");
    assert.equal(asrHouse("openai/gpt-oss-120b"), null);
  });

  it("danh sách Groq không khóa Alibaba", () => {
    const offered = ["whisper-large-v3-turbo"];
    assert.equal(groqListHolds(offered, "whisper-large-v3"), true);
    assert.equal(groqListHolds(offered, "whisper-large-v3-turbo"), false);
    assert.equal(groqListHolds(offered, "qwen-audio-3.0-asr-flash-filetrans"), false);
    assert.equal(groqListHolds(null, "whisper-large-v3"), false);
  });

  it("cửa trả theo lượt chưa nhận dạng Alibaba", () => {
    assert.match(alibabaAsrOnRoomPayProblem(), /Key của tôi/);
  });
});
