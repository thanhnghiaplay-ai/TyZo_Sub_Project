import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptSegment } from "./text.ts";
import { isSilentChunk, rms, SILENCE_RMS, SILENCE_WINDOW_SECONDS, SR, windowRms } from "./text.ts";
import type { Seg } from "./types.ts";

function tone(seconds: number, amplitude: number): Float32Array {
  const samples = new Float32Array(Math.floor(seconds * SR));
  samples.fill(amplitude);
  return samples;
}

function join(parts: Float32Array[]): Float32Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Float32Array(length);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

describe("im lặng theo cửa sổ 1 giây", () => {
  it("ngưỡng không đổi", () => {
    assert.equal(SILENCE_RMS, 0.005);
    assert.equal(SILENCE_WINDOW_SECONDS, 1);
  });

  it("cả đoạn dưới ngưỡng thì vẫn bỏ", () => {
    const quiet = tone(4, 0.004);
    assert.ok(rms(quiet) < SILENCE_RMS);
    assert.equal(isSilentChunk(quiet), true);
    assert.ok(windowRms(quiet).every((level) => level < SILENCE_RMS));
  });

  it("một giây có tiếng trong đoạn dài không bị RMS cả đoạn nuốt", () => {
    const chunk = join([tone(59, 0), tone(1, 0.02)]);
    assert.ok(rms(chunk) < SILENCE_RMS);
    assert.equal(isSilentChunk(chunk), false);
    const levels = windowRms(chunk);
    assert.equal(levels.length, 60);
    assert.ok(levels[59] >= SILENCE_RMS);
    assert.ok(levels[0] < SILENCE_RMS);
    assert.ok(levels[0] < 0.0001);
  });

  it("không khuếch đại cửa sổ im khi cửa sổ bên cạnh to", () => {
    const levels = windowRms(join([tone(1, 0), tone(1, 0.2)]));
    assert.ok(levels[0] < SILENCE_RMS);
    assert.ok(levels[1] > 0.1);
  });

  it("đoạn rỗng coi là im", () => {
    assert.equal(isSilentChunk(new Float32Array()), true);
  });
});

describe("không nới bộ lọc câu ảo", () => {
  it("A/Ah vẫn bị loại, lời ngắn tự tin vẫn giữ", () => {
    const dropped: Seg[] = [];
    assert.equal(acceptSegment(dropped, 0, 0, 0.4, "Ah", 0, { no_speech_prob: 0.05, avg_logprob: -0.1 }).reason, "non_speech");
    const kept: Seg[] = [];
    assert.equal(acceptSegment(kept, 0, 0, 0.4, "Ừ", 0, { no_speech_prob: 0.2, avg_logprob: -0.1 }).accepted, true);
  });
});
