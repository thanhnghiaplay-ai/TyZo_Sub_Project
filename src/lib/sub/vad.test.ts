import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import { gateChunk, speechSpansFromProbs, trimToSpeech, VAD_WINDOW_SECONDS } from "./vad.ts";

describe("lọc tiếng người", () => {
  it("một khung cao không thành câu, một đoạn cao thì thành câu", () => {
    const blip = Array.from({ length: 20 }, () => 0.1);
    blip[5] = 0.9;
    assert.equal(speechSpansFromProbs(blip).length, 0);
    const talk = Array.from({ length: 40 }, (_, i) => (i >= 10 && i < 20 ? 0.9 : 0.05));
    const spans = speechSpansFromProbs(talk);
    assert.equal(spans.length, 1);
    assert.ok(Math.abs(spans[0].start - 10 * VAD_WINDOW_SECONDS) < 1e-6);
    assert.ok(spans[0].end - spans[0].start >= 0.1);
  });

  it("cắt đầu và cuối, không tách nhiều request", () => {
    assert.equal(trimToSpeech(60, []), null);
    const whole = trimToSpeech(60, [{ start: 0.1, end: 59.8 }]);
    assert.deepEqual(whole, { start: 0, end: 60 });
    const middle = trimToSpeech(60, [
      { start: 10, end: 12 },
      { start: 40, end: 42 },
    ]);
    assert.equal(middle?.start, 9.75);
    assert.equal(middle?.end, 42.25);
  });

  it("tắt thì im lặng không gửi, có tiếng thì gửi cả đoạn", async () => {
    assert.equal(await gateChunk(new Float32Array(16000), false), null);
    const loud = new Float32Array(16000);
    loud.fill(0.2);
    const kept = await gateChunk(loud, false);
    assert.equal(kept?.offset, 0);
    assert.equal(kept?.fallback, false);
    assert.equal(kept?.samples.length, 16000);
  });

  it("model và runtime không nằm trong lần mở app", () => {
    const planner = readFileSync(new URL("./vad.ts", import.meta.url), "utf8");
    const runtime = readFileSync(new URL("./vad-runtime.ts", import.meta.url), "utf8");
    assert.equal(planner.includes("onnxruntime-web"), false);
    assert.match(runtime, /import\("onnxruntime-web"\)/);
    assert.equal(statSync(new URL("../../../public/models/silero_vad.int8.onnx", import.meta.url)).size, 212860);
    assert.ok(statSync(new URL("../../../public/vad/ort-wasm-simd-threaded.wasm", import.meta.url)).size > 10_000_000);
  });
});
