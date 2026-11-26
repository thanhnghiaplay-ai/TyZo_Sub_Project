import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asrHouse, asrIntake, asrTakesLink, groqListHolds } from "./asr-house.ts";
import { ASR_MODELS } from "./models.ts";
import { ASR_PRICE } from "./types.ts";

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
});

describe("cách nhận âm thanh của từng model", () => {
  it("TyZo cắt đoạn trên máy, Alibaba nhận link", () => {
    assert.equal(asrHouse("tyzo-modal-nhanh"), "tyzo-modal");
    assert.equal(asrTakesLink("tyzo-modal-ky"), false);
    assert.equal(asrHouse("deepgram-nova-3"), null);
    assert.equal(asrTakesLink("qwen-audio-3.0-asr-flash-filetrans"), true);
    assert.equal(asrTakesLink("whisper-large-v3"), false);
  });
  it("cách nhận âm thanh đọc từ khai của nhà, model lạ thì null", () => {
    assert.equal(asrIntake("whisper-large-v3-turbo"), "chunks");
    assert.equal(asrIntake("qwen-audio-3.0-asr-flash-filetrans"), "link");
    assert.equal(asrIntake("openai/gpt-oss-120b"), null);
    assert.equal(asrIntake("toString"), null);
  });
  it("id lạ hoặc tên thuộc tính của Object không bị nhận nhầm", () => {
    assert.equal(asrHouse("toString"), null);
    assert.equal(asrHouse("__proto__"), null);
  });
  it("danh sách Groq không khóa TyZo", () => {
    assert.equal(groqListHolds(["whisper-large-v3-turbo"], "tyzo-modal-nhanh"), false);
  });
  it("mọi model nhận dạng trong danh sách đều có nhà và có giá dự phòng", () => {
    for (const row of ASR_MODELS) {
      assert.ok(asrHouse(row.id), `${row.id} chưa có nhà`);
      assert.ok((ASR_PRICE as Record<string, number>)[row.id] > 0, `${row.id} chưa có giá`);
    }
  });
});
