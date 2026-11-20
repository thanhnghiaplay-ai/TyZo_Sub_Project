import assert from "node:assert/strict";
import test from "node:test";
import { ERROR_ZERO_AT, MIN_CASES, measureGrades, qualityFromError, type BenchEntry } from "./grade-measure.ts";
import { gradeOf } from "./model-grade.ts";
import { MEASURED_GRADE } from "./model-grade-measured.ts";

const entry = (c: string, model: string, errorRate: number | null, variant = "default"): BenchEntry => ({ case: c, model, variant, verdict: { metrics: { errorRate } } });
const langOf = { a: "zh", b: "ja", c: "en", d: "ko" } as const;

test("qualityFromError: 0% được 10, từ ngưỡng trở lên được 0, ở giữa tuyến tính, ngoài khoảng bị kẹp", () => {
  assert.equal(qualityFromError(0), 10);
  assert.equal(qualityFromError(ERROR_ZERO_AT / 2), 5);
  assert.equal(qualityFromError(ERROR_ZERO_AT), 0);
  assert.equal(qualityFromError(0.9), 0);
  assert.equal(qualityFromError(-1), 10);
});

test("measureGrades: không đủ clip thì không ghi đè (một clip không đủ kết luận)", () => {
  assert.deepEqual(measureGrades([entry("a", "m", 0.1)], langOf), {});
  assert.equal(MIN_CASES, 3);
});

test("measureGrades: quality lấy mọi ngôn ngữ, asian chỉ Trung, Nhật, Hàn, mỗi cái cần đủ clip", () => {
  const rows = [entry("a", "m", 0.1), entry("b", "m", 0.1), entry("c", "m", 0.4)];
  const out = measureGrades(rows, langOf);
  assert.equal(out.m.cases, 3);
  assert.equal(out.m.quality, qualityFromError(0.2));
  assert.equal(out.m.asian, undefined);
  const four = measureGrades([...rows, entry("d", "m", 0.1)], langOf);
  assert.equal(four.m.asian, qualityFromError(0.1));
});

test("measureGrades: chỉ tính biến thể default, bỏ dòng không có đáp án và clip lạ", () => {
  const rows = [entry("a", "m", 0.1), entry("b", "m", 0.1), entry("c", "m", null), entry("d", "m", 0.9, "noprompt"), entry("zz", "m", 0.1)];
  assert.deepEqual(measureGrades(rows, langOf), {});
});

test("measureGrades: clip chạy nhiều lần lấy trung bình trước, không nặng hơn clip khác", () => {
  const rows = [entry("a", "m", 0), entry("a", "m", 0), entry("a", "m", 0), entry("b", "m", 0.5), entry("c", "m", 0.5)];
  const out = measureGrades(rows, langOf);
  assert.equal(out.m.quality, qualityFromError((0 + 0.5 + 0.5) / 3));
});

test("gradeOf: điểm đo ghi đè quality và asian, giữ nguyên speed và các điểm khác; chưa có số đo thì như cũ", () => {
  assert.deepEqual(MEASURED_GRADE, {}, "tệp số đo chỉ do asr:grade ghi; test này nhắc sửa khi đã có số đo thật");
  const base = gradeOf("whisper-large-v3")!;
  MEASURED_GRADE["whisper-large-v3"] = { quality: 3.3 };
  try {
    assert.deepEqual(gradeOf("whisper-large-v3"), { ...base, quality: 3.3 });
  } finally {
    delete MEASURED_GRADE["whisper-large-v3"];
  }
  assert.deepEqual(gradeOf("whisper-large-v3"), base);
  MEASURED_GRADE["model-la-khong-co"] = { quality: 9 };
  try {
    assert.equal(gradeOf("model-la-khong-co"), null);
  } finally {
    delete MEASURED_GRADE["model-la-khong-co"];
  }
});
