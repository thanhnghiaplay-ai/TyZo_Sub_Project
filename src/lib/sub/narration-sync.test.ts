import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIT_MAX_BOOST,
  LATENCY_CAP,
  LATENCY_DEFAULT,
  createLatencyTracker,
  effectiveLead,
  estimateSpeechSeconds,
  fitBoost,
  holdSeconds,
  prefetchTargets,
  slotFor,
} from "./narration-sync.ts";
import type { Seg } from "./types.ts";

const seg = (start: number, end: number, translation: string | null = "xin chào"): Seg => ({ start, end, original: "x", translation }) as Seg;
const textOf = (s: Seg) => s.translation ?? "";

describe("đo độ trễ giọng đọc", () => {
  it("chưa đo thì dùng mặc định của từng loại, loại nào cũng có", () => {
    const t = createLatencyTracker();
    for (const engine of ["edge", "orpheus", "aura", "browser"] as const) assert.equal(t.estimate(engine), LATENCY_DEFAULT[engine]);
  });
  it("số đo đầu thay mặc định, số sau gộp trượt", () => {
    const t = createLatencyTracker();
    t.record("edge", 2);
    assert.equal(t.estimate("edge"), LATENCY_CAP > 2 ? 2 : LATENCY_CAP);
    t.record("edge", 0.5);
    assert.ok(t.estimate("edge") < 2 && t.estimate("edge") > 0.5);
    assert.equal(t.samples("edge"), 2);
    assert.equal(t.samples("aura"), 0);
  });
  it("từng loại giọng đo riêng", () => {
    const t = createLatencyTracker();
    t.record("orpheus", 1.6);
    assert.equal(t.estimate("edge"), LATENCY_DEFAULT.edge);
  });
  it("số lạ bị bỏ, kết quả không vượt mức bù tối đa", () => {
    const t = createLatencyTracker();
    t.record("edge", Number.NaN);
    t.record("edge", -1);
    t.record("edge", 99);
    assert.equal(t.samples("edge"), 0);
    t.record("edge", 25);
    assert.equal(t.estimate("edge"), LATENCY_CAP);
  });
});

describe("độ lệch và chờ", () => {
  it("chỉnh tay cộng với độ trễ bù, ô chỉnh tay vẫn có tác dụng", () => {
    assert.equal(effectiveLead(0, 0.8), -0.8);
    assert.ok(Math.abs(effectiveLead(0.5, 0.8) + 0.3) < 1e-9);
    assert.equal(effectiveLead(-0.4, 0), -0.4);
    assert.equal(effectiveLead(Number.NaN, Number.NaN), 0);
  });
  it("đã có tiếng sẵn thì chờ phần còn thiếu, tạo lâu hơn mức bù thì không chờ", () => {
    assert.equal(holdSeconds(0.8, 0), 0.8);
    assert.ok(Math.abs(holdSeconds(0.8, 0.3) - 0.5) < 1e-9);
    assert.equal(holdSeconds(0.8, 1.2), 0);
    assert.equal(holdSeconds(-1, 0), 0);
  });
});

describe("ước thời lượng và đọc vừa khoảng thoại", () => {
  it("chữ nhiều thì lâu hơn, nói nhanh thì ngắn hơn, rỗng là 0", () => {
    assert.equal(estimateSpeechSeconds("   "), 0);
    assert.ok(estimateSpeechSeconds("a".repeat(60)) > estimateSpeechSeconds("a".repeat(20)));
    assert.ok(estimateSpeechSeconds("hello world", 1.5) < estimateSpeechSeconds("hello world", 1));
  });
  it("chữ tượng hình tính dài hơn mỗi ký tự", () => {
    assert.ok(estimateSpeechSeconds("你好吗你好吗") > estimateSpeechSeconds("abcdef"));
  });
  it("khoảng thoại: tới đầu câu kế, câu cuối dùng độ dài của nó, có mức tối thiểu", () => {
    const segs = [seg(0, 2), seg(3, 4), seg(10, 10.1)];
    assert.equal(slotFor(segs, 0), 3);
    assert.equal(slotFor(segs, 1), 7);
    assert.equal(slotFor(segs, 2), 3);
    assert.equal(slotFor([seg(0, 0.1), seg(0.2, 0.3)], 0), 0.8);
    assert.equal(slotFor(segs, 9), 0.8);
  });
  it("vừa thì giữ nguyên, dài hơn thì tăng vừa phải, không bao giờ quá mức tối đa", () => {
    assert.equal(fitBoost(2, 3), 1);
    assert.ok(Math.abs(fitBoost(3.3, 3) - 1.1) < 1e-9);
    assert.equal(fitBoost(10, 3), FIT_MAX_BOOST);
    assert.equal(fitBoost(0, 3), 1);
    assert.equal(fitBoost(3, Number.NaN), 1);
  });
});

describe("tạo trước các câu kế", () => {
  it("lấy tối đa hai câu kế có chữ, bỏ câu trống hoặc chưa dịch", () => {
    const segs = [seg(0, 1), seg(1, 2, ""), seg(2, 3, null), seg(3, 4), seg(4, 5), seg(5, 6)];
    assert.deepEqual(prefetchTargets(segs, 0, textOf), [3, 4]);
    assert.deepEqual(prefetchTargets(segs, 4, textOf), [5]);
    assert.deepEqual(prefetchTargets(segs, 5, textOf), []);
    assert.deepEqual(prefetchTargets(segs, -1, textOf, 1), [0]);
  });
});
