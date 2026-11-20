import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { asrTestLabel, parseAsrTest, readAsrTest } from "./asr-test.ts";
import { asrPrompt, splitAudio, SR } from "./text.ts";

describe("công tắc thử nhận dạng", () => {
  it("không có gì thì TẮT", () => {
    assert.deepEqual(parseAsrTest(""), { noPrompt: false, chunkSeconds: null });
    assert.deepEqual(parseAsrTest(null), { noPrompt: false, chunkSeconds: null });
    assert.deepEqual(readAsrTest(), { noPrompt: false, chunkSeconds: null });
  });

  it("đọc noprompt và chunkN, bỏ qua giá trị ngoài khoảng 8 đến 60", () => {
    assert.deepEqual(parseAsrTest("noprompt,chunk15"), { noPrompt: true, chunkSeconds: 15 });
    assert.deepEqual(parseAsrTest(" CHUNK20 "), { noPrompt: false, chunkSeconds: 20 });
    assert.equal(parseAsrTest("chunk5").chunkSeconds, null);
    assert.equal(parseAsrTest("chunk99").chunkSeconds, null);
    assert.equal(parseAsrTest("linh-tinh").noPrompt, false);
  });

  it("nhãn hiển thị", () => {
    assert.equal(asrTestLabel({ noPrompt: true, chunkSeconds: 15 }), "không gửi prompt, cắt đoạn 15 giây");
    assert.equal(asrTestLabel({ noPrompt: false, chunkSeconds: null }), "");
  });

  it("mặc định giữ nguyên hành vi cũ", () => {
    assert.ok(asrPrompt("Phim", "").length > 0);
    assert.equal(splitAudio(new Float32Array(34 * SR)).length, 1);
  });
});
