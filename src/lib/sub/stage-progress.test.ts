import test from "node:test";
import assert from "node:assert/strict";
import { computeStages } from "./stage-progress.ts";

const base = { phase: "idle" as const, partsTotal: 0, partsDone: 0, segsTotal: 0, segsDone: 0, repairs: 0, failed: 0 };

test("chưa chạy: mọi giai đoạn chờ, 0%", () => {
  const r = computeStages(base);
  assert.deepEqual(r.stages.map((s) => s.state), ["wait", "wait", "wait", "wait"]);
  assert.equal(r.percent, 0);
  assert.equal(r.active, null);
});

test("đang đọc file: giai đoạn cắt đang chạy", () => {
  const r = computeStages({ ...base, phase: "read" });
  assert.equal(r.stages[0].state, "active");
  assert.equal(r.active, "cut");
});

test("đang nhận dạng và dịch song song", () => {
  const r = computeStages({ ...base, phase: "asr", partsTotal: 10, partsDone: 5, segsTotal: 40, segsDone: 20 });
  assert.deepEqual(r.stages.map((s) => s.state), ["done", "active", "active", "wait"]);
  assert.equal(r.stages[1].text, "5/10 đoạn");
  assert.equal(r.stages[2].text, "20/40 câu");
  assert.equal(r.percent, 10 + 20 + 20);
});

test("xong, không phải sửa: bước sửa lại ghi Không cần, 100%", () => {
  const r = computeStages({ ...base, partsTotal: 10, partsDone: 10, segsTotal: 40, segsDone: 40 });
  assert.deepEqual(r.stages.map((s) => s.state), ["done", "done", "done", "skip"]);
  assert.equal(r.percent, 100);
});

test("xong nhưng còn câu lỗi: sửa lại chưa xong", () => {
  const r = computeStages({ ...base, partsTotal: 10, partsDone: 10, segsTotal: 40, segsDone: 40, repairs: 3, failed: 2 });
  assert.equal(r.stages[3].state, "wait");
  assert.equal(r.stages[3].text, "3 đã sửa · 2 còn lỗi");
  assert.ok(r.percent < 100);
});

test("bị hủy giữa chừng: không giai đoạn nào đang chạy", () => {
  const r = computeStages({ ...base, partsTotal: 10, partsDone: 4, segsTotal: 12, segsDone: 12 });
  assert.equal(r.active, null);
  assert.equal(r.stages[1].state, "wait");
});

test("Alibaba: bỏ qua bước cắt", () => {
  const r = computeStages({ ...base, phase: "ali" });
  assert.equal(r.stages[0].state, "skip");
  assert.equal(r.stages[1].state, "active");
});

test("tổng không vượt 0..100 khi số đếm lệch", () => {
  const r = computeStages({ ...base, phase: "asr", partsTotal: 4, partsDone: 9, segsTotal: 2, segsDone: 9 });
  assert.ok(r.percent >= 0 && r.percent <= 100);
});
