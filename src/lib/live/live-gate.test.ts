import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LiveFrameGate, PREROLL_FRAMES, QUIET_MS, pcmPeak } from "./live-gate.ts";

const loud = (tag: number) => {
  const b = new Uint8Array(3200);
  b[1] = 0x40; // 16384 (little-endian: byte cao ở sau)
  b[2] = tag;
  return b;
};
const quiet = (tag: number) => {
  const b = new Uint8Array(3200);
  b[2] = tag; // đỉnh nhỏ (< 100)
  return b;
};
const tags = (frames: Uint8Array[]) => frames.map((f) => f[2]);

describe("lọc khung tiếng gửi lên cầu nối", () => {
  it("đỉnh biên độ", () => {
    assert.equal(pcmPeak(loud(0)), 16384);
    assert.ok(pcmPeak(quiet(50)) < 100);
  });

  it("chưa sẵn sàng thì giữ tạm, sẵn sàng thì gửi hết theo thứ tự (không mất chữ đầu)", () => {
    const g = new LiveFrameGate(0);
    assert.deepEqual(g.push(loud(1), 100, false, false), []);
    assert.deepEqual(g.push(loud(2), 200, false, false), []);
    assert.deepEqual(tags(g.push(loud(3), 300, true, false)), [1, 2, 3]);
  });

  it("im quá lâu thì không gửi; có tiếng lại thì gửi kèm vài khung im ngay trước", () => {
    const g = new LiveFrameGate(0);
    assert.deepEqual(tags(g.push(loud(1), 0, true, false)), [1]);
    // Còn trong khoảng lặng cho phép: vẫn gửi để Alibaba chốt câu.
    assert.deepEqual(tags(g.push(quiet(2), QUIET_MS - 100, true, false)), [2]);
    // Quá khoảng lặng: giữ lại, không gửi.
    let t = QUIET_MS + 100;
    for (let i = 3; i < 10; i++, t += 100) assert.deepEqual(g.push(quiet(i), t, true, false), []);
    const sent = tags(g.push(loud(42), t, true, false));
    assert.equal(sent.length, PREROLL_FRAMES + 1);
    assert.deepEqual(sent, [7, 8, 9, 42]);
  });

  it("tạm dừng thì không gửi gì, bỏ cả phần đang giữ", () => {
    const g = new LiveFrameGate(0);
    g.push(loud(1), 0, false, false);
    assert.deepEqual(g.push(loud(2), 100, true, true), []);
    assert.deepEqual(tags(g.push(loud(3), 200, true, false)), [3]);
  });
});
