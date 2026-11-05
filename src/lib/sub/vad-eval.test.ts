import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptSegment } from "./text.ts";
import type { Seg } from "./types.ts";

/**
 * Đo trên máy ngày 2026-11-04, không gắn vào app.
 * Model tải từ bản phát hành, không ước lượng.
 * - silero_vad.int8.onnx (k2-fsa): 212860 byte, gzip 148120
 * - silero_vad.onnx v5 (snakers4): 2313101 byte, gzip 1942942
 * - onnxruntime-web@1.31.1 ort-wasm-simd-threaded.wasm: 14848852 byte, gzip 3792479
 * - ort.wasm.min.js: 53796 byte, gzip 17103
 * RMS cửa sổ hiện tại: 10 phút / 9.6 triệu mẫu hết 25.1 ms trong Node.
 */
const MEASURED = {
  bundleSilero: false,
  int8Bytes: 212860,
  int8Gzip: 148120,
  v5Bytes: 2313101,
  wasmBytes: 14848852,
  wasmGzip: 3792479,
  glueGzip: 17103,
  appGzip: 49301 + 133838 + 6258,
  rms10MinMs: 25.1,
};

describe("Pha 3 — không gắn Silero khi chưa có số liệu phim", () => {
  it("runtime trình duyệt nặng hơn cả app hiện tại", () => {
    const stackGzip = MEASURED.int8Gzip + MEASURED.wasmGzip + MEASURED.glueGzip;
    assert.ok(stackGzip > MEASURED.appGzip * 10);
    assert.ok(MEASURED.wasmBytes > 10_000_000);
    assert.ok(MEASURED.rms10MinMs < 1000);
    assert.equal(MEASURED.bundleSilero, false);
  });

  it("không nới isNonSpeech: A/Ah vẫn loại, lời ngắn tự tin vẫn giữ", () => {
    const dropped: Seg[] = [];
    assert.equal(acceptSegment(dropped, 0, 0, 0.4, "A", 0, { no_speech_prob: 0.05, avg_logprob: -0.1 }).reason, "non_speech");
    assert.equal(acceptSegment(dropped, 0, 0.5, 0.9, "Ah", 0, { no_speech_prob: 0.05, avg_logprob: -0.1 }).reason, "non_speech");
    const kept: Seg[] = [];
    assert.equal(acceptSegment(kept, 0, 0, 0.4, "Ừ", 0, { no_speech_prob: 0.2, avg_logprob: -0.1 }).accepted, true);
    assert.equal(acceptSegment(kept, 0, 1, 2, "うん", 0, { no_speech_prob: 0.2, avg_logprob: -0.1 }).accepted, true);
  });
});
