import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { asrTestLabel, parseAsrTest, readAsrTest } from "./asr-test.ts";
import { ASR_GUARD, asrPrompt, splitAudio, SR } from "./text.ts";

describe("công tắc thử nhận dạng", () => {
  it("không có gì thì TẮT", () => {
    assert.deepEqual(parseAsrTest(""), { noPrompt: false, noGuard: false, chunkSeconds: null });
    assert.deepEqual(parseAsrTest(null), { noPrompt: false, noGuard: false, chunkSeconds: null });
    assert.deepEqual(readAsrTest(), { noPrompt: false, noGuard: false, chunkSeconds: null });
  });

  it("đọc noprompt và chunkN, bỏ qua giá trị ngoài khoảng 8 đến 60", () => {
    assert.deepEqual(parseAsrTest("noprompt,chunk15"), { noPrompt: true, noGuard: false, chunkSeconds: 15 });
    assert.deepEqual(parseAsrTest(" CHUNK20 "), { noPrompt: false, noGuard: false, chunkSeconds: 20 });
    assert.equal(parseAsrTest("chunk5").chunkSeconds, null);
    assert.equal(parseAsrTest("chunk99").chunkSeconds, null);
    assert.equal(parseAsrTest("linh-tinh").noPrompt, false);
  });

  it("nhãn hiển thị", () => {
    assert.equal(asrTestLabel({ noPrompt: true, noGuard: false, chunkSeconds: 15 }), "không gửi prompt, cắt đoạn 15 giây");
    assert.equal(asrTestLabel({ noPrompt: false, noGuard: false, chunkSeconds: null }), "");
  });

  it("đọc noguard, ghép được với noprompt và chunkN", () => {
    assert.deepEqual(parseAsrTest("noguard"), { noPrompt: false, noGuard: true, chunkSeconds: null });
    assert.deepEqual(parseAsrTest("noguard,chunk15"), { noPrompt: false, noGuard: true, chunkSeconds: 15 });
    assert.equal(asrTestLabel({ noPrompt: false, noGuard: true, chunkSeconds: null }), "bỏ câu ASR_GUARD khỏi prompt");
    assert.equal(asrTestLabel({ noPrompt: true, noGuard: true, chunkSeconds: null }), "không gửi prompt");
  });

  it("ASR_GUARD chỉ gửi cho thể loại 18+, vẫn kèm tên phim", () => {
    for (const genre of ["sex", "softcore", "adult", " SEX "]) {
      const prompt = asrPrompt("Phim", "", genre);
      assert.ok(prompt.startsWith("Phim"), genre);
      assert.ok(prompt.includes(ASR_GUARD), genre);
      assert.ok(prompt.length <= 420, genre);
    }
    assert.ok(!asrPrompt("Phim", "", "romance").includes(ASR_GUARD));
  });

  it("mặc định giữ nguyên hành vi cũ", () => {
    assert.ok(asrPrompt("Phim", "").length > 0);
    assert.equal(asrPrompt("Phim", ""), "Phim");
    assert.equal(asrPrompt("Phim", "", "auto"), "Phim");
    assert.equal(asrPrompt("Phim", "", "wuxia"), "Phim");
    assert.equal(splitAudio(new Float32Array(34 * SR)).length, 1);
  });
});
