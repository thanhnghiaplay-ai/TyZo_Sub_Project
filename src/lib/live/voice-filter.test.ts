import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SILENT_LEVEL, VOICE_RATE, VoiceFilter } from "./voice-filter.ts";

// Cùng các trường hợp với android/tools/VoiceFilterCheck.kt.
function tone(freq: number, amp: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(VOICE_RATE * seconds));
  for (let i = 0; i < out.length; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / VOICE_RATE);
  return out;
}

/** Cho qua từng khung 100 ms như lúc chạy thật, trả đỉnh và RMS của nửa giây cuối. */
function run(filter: VoiceFilter, input: Float32Array) {
  for (let i = 0; i < input.length; i += 1600) filter.process(input.subarray(i, i + 1600));
  const tail = input.subarray(input.length - VOICE_RATE / 2);
  let peak = 0;
  let sum = 0;
  for (const v of tail) {
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
  }
  return { peak, rms: Math.sqrt(sum / tail.length) };
}

/** Độ mạnh của một tần số trong nửa giây cuối (Goertzel). */
function power(x: Float32Array, freq: number): number {
  const tail = x.subarray(x.length - VOICE_RATE / 2);
  const k = 2 * Math.cos((2 * Math.PI * freq) / VOICE_RATE);
  let s1 = 0;
  let s2 = 0;
  for (const v of tail) {
    const s0 = v + k * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - k * s1 * s2;
}

describe("lọc cho giọng nói", () => {
  it("nhạc trầm (40 Hz) lấn giọng (1 kHz): sau lọc giọng trội hơn hẳn", () => {
    const bass = tone(40, 0.3, 3);
    const voice = tone(1000, 0.05, 3);
    const mix = bass.map((v, i) => v + voice[i]);
    const before = power(mix, 1000) / power(mix, 40);
    run(new VoiceFilter(), mix);
    const after = power(mix, 1000) / power(mix, 40);
    assert.ok(after > before * 50, `trước ${before}, sau ${after}`);
  });

  it("tiếng nói nhỏ được kéo lên gần mức chuẩn, tiếng to không vỡ", () => {
    const small = run(new VoiceFilter(), tone(800, 0.02, 4));
    assert.ok(small.rms > 0.08 && small.rms < 0.13, `nhỏ: ${small.rms}`);
    const loud = run(new VoiceFilter(), tone(800, 0.99, 4));
    assert.ok(loud.peak <= 1, `to: ${loud.peak}`);
    assert.ok(loud.rms < 0.4, `to được hạ: ${loud.rms}`);
  });

  it("im vẫn là im: tiếng ồn nền dưới ngưỡng không gửi thì không bị tăng lên quá ngưỡng", () => {
    const filter = new VoiceFilter();
    run(filter, tone(800, 0.02, 3)); // vừa có tiếng nói nhỏ, đang tăng mạnh
    const hiss = tone(800, SILENT_LEVEL * 0.8, 2);
    const after = run(filter, hiss);
    assert.ok(after.peak < SILENT_LEVEL, `ồn nền sau lọc ${after.peak}`);
  });
});
