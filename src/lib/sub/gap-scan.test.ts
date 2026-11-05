import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptSegment } from "./text.ts";
import {
  budgetSpeechGaps,
  collectSpeechSpans,
  formatGapConfirm,
  GAP_BUDGET_SECONDS,
  GAP_MIN_SECONDS,
  planSpeechGaps,
  spansFromBlocks,
} from "./gap-scan.ts";
import { ASR_PRICE } from "./types.ts";
import { SILENCE_RMS, SR } from "./text.ts";
import type { Seg } from "./types.ts";

const price = ASR_PRICE["whisper-large-v3-turbo"];

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

describe("dò khoảng trống có tiếng", () => {
  it("ngưỡng và ngân sách cố định, không hạ im lặng", () => {
    assert.equal(GAP_MIN_SECONDS, 2);
    assert.equal(GAP_BUDGET_SECONDS, 120);
    assert.equal(SILENCE_RMS, 0.005);
  });

  it("khoảng im hoặc đã có câu thì không đề xuất gửi", () => {
    const samples = join([tone(4, 0), tone(4, 0.02), tone(4, 0)]);
    const covered = planSpeechGaps({
      duration: 12,
      segs: [{ start: 4, end: 8 }],
      samples,
      pricePerSecond: price,
    });
    assert.equal(covered.selected.length, 0);
    assert.equal(covered.cost, 0);
    const quiet = planSpeechGaps({
      duration: 6,
      segs: [],
      samples: tone(6, 0.004),
      pricePerSecond: price,
    });
    assert.equal(quiet.selected.length, 0);
  });

  it("tiếng ngắn dưới 2 giây không bị tính là khoảng dài", () => {
    const samples = join([tone(2, 0), tone(1, 0.02), tone(2, 0)]);
    const plan = planSpeechGaps({ duration: 5, segs: [], samples, pricePerSecond: price });
    assert.equal(plan.selected.length, 0);
  });

  it("khoảng có tiếng mà không có câu thì báo giá trước, chưa tính là đã gửi", () => {
    const samples = join([tone(3, 0), tone(3, 0.02), tone(3, 0)]);
    const plan = planSpeechGaps({
      duration: 9,
      segs: [
        { start: 0, end: 2 },
        { start: 7, end: 9 },
      ],
      samples,
      pricePerSecond: price,
    });
    assert.equal(plan.selected.length, 1);
    assert.ok(plan.selected[0].start >= 2);
    assert.ok(plan.selected[0].end <= 7);
    assert.ok(plan.audioSeconds >= 2);
    assert.equal(plan.billedSeconds, Math.max(10, plan.audioSeconds));
    assert.equal(plan.cost, plan.billedSeconds * price);
    const text = formatGapConfirm(plan);
    assert.match(text, /ước tính \$/);
    assert.match(text, /Không gửi cả phim/);
    assert.match(text, /Gửi lên Groq\?/);
  });

  it("ngân sách không cắt khoảng và không nhận phần vượt", () => {
    const spans = [
      { start: 0, end: 4 },
      { start: 20, end: 24 },
      { start: 40, end: 70 },
    ];
    const plan = budgetSpeechGaps(spans, price, 10);
    assert.deepEqual(plan.selected, [
      { start: 0, end: 4 },
      { start: 20, end: 24 },
    ]);
    assert.deepEqual(plan.deferred, [{ start: 40, end: 70 }]);
    assert.equal(plan.audioSeconds, 8);
    assert.ok(plan.audioSeconds <= 10);
  });

  it("khoảng dài hơn ngân sách thì để nguyên, không cắt", () => {
    const plan = budgetSpeechGaps([{ start: 0, end: 30 }], price, 10);
    assert.equal(plan.selected.length, 0);
    assert.equal(plan.deferred.length, 1);
    assert.equal(plan.cost, 0);
  });

  it("tiếng nằm giữa hai khối 60 giây vẫn là một khoảng", async () => {
    const samples = join([tone(59, 0), tone(3, 0.02), tone(8, 0)]);
    const spans = await spansFromBlocks(70, [], async (start, end) => samples.subarray(Math.floor(start * SR), Math.floor(end * SR)));
    assert.equal(spans.length, 1);
    assert.ok(spans[0].end - spans[0].start >= 2);
    assert.ok(spans[0].start >= 58 && spans[0].start <= 60);
  });
});

describe("đoạn lẻ không bị cắt như biên chồng", () => {
  it("câu đầu đoạn lẻ vẫn được giữ", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, 58, 0.1, 1.2, "Tôi ở đây", -1, {});
    assert.equal(decision.accepted, true);
    assert.equal(segs.length, 1);
    const dup = acceptSegment(segs, 58, 0.1, 1.2, "Tôi ở đây", -1, {});
    assert.equal(dup.reason, "duplicate");
    assert.equal(segs.length, 1);
  });
});
