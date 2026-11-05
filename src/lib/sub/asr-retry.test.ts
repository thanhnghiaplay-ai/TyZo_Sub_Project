import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASR_RETRY_BUDGET_SECONDS,
  formatPartSpan,
  formatRetryStatus,
  planDecodeRetries,
  spansForDecodeRetry,
  type AsrRetryReport,
} from "./asr-retry.ts";
import type { RawAsrPart } from "./diagnostics.ts";

function raw(partIndex: number, kind: RawAsrPart["kind"], start: number, end: number): RawAsrPart {
  return {
    partIndex,
    start,
    end,
    requestedLanguage: "ja",
    detectedLanguage: "",
    language: "ja",
    kind,
    segments: [],
  };
}

describe("chỉ thử lại đoạn không giải mã", () => {
  it("bỏ im lặng, Whisper trống và đoạn đã có chữ", () => {
    const spans = spansForDecodeRetry(
      [
        raw(0, "whisper", 0, 60),
        raw(1, "silence", 58, 118),
        raw(2, "whisper_empty", 116, 176),
        raw(3, "decode_fail", 174, 234),
        raw(4, "decode_fail", 232, 292),
      ],
      [],
    );
    assert.deepEqual(
      spans.map((part) => part.index),
      [3, 4],
    );
  });

  it("đoạn đã thử một lần thì không chọn lại", () => {
    const spans = spansForDecodeRetry([raw(1, "decode_fail", 60, 120), raw(2, "decode_fail", 118, 178)], [1]);
    assert.deepEqual(
      spans.map((part) => part.index),
      [2],
    );
  });
});

describe("ngân sách giây", () => {
  it("180 giây chỉ nhận 3 đoạn 60 giây, đoạn thứ tư để lại nguyên", () => {
    const failed = [0, 1, 2, 3].map((index) => ({ index, start: index * 58, end: index * 58 + 60 }));
    const plan = planDecodeRetries(failed);
    assert.equal(plan.budgetSeconds, ASR_RETRY_BUDGET_SECONDS);
    assert.deepEqual(
      plan.retry.map((part) => part.index),
      [0, 1, 2],
    );
    assert.deepEqual(
      plan.deferred.map((part) => part.index),
      [3],
    );
    assert.equal(plan.plannedSeconds, 180);
  });

  it("không cắt một đoạn dài hơn phần ngân sách còn lại", () => {
    const plan = planDecodeRetries([
      { index: 2, start: 100, end: 240 },
      { index: 0, start: 0, end: 50 },
    ]);
    assert.deepEqual(
      plan.retry.map((part) => part.index),
      [0],
    );
    assert.deepEqual(
      plan.deferred.map((part) => part.index),
      [2],
    );
    assert.equal(plan.plannedSeconds, 50);
  });

  it("trùng chỉ số chỉ tính một lần", () => {
    const plan = planDecodeRetries(
      [
        { index: 1, start: 0, end: 60 },
        { index: 1, start: 0, end: 60 },
      ],
      [],
      180,
    );
    assert.equal(plan.retry.length, 1);
    assert.equal(plan.plannedSeconds, 60);
  });
});

describe("báo đoạn còn thiếu", () => {
  it("ghi chỉ số, khoảng thời gian và số giây đã dùng", () => {
    const report: AsrRetryReport = {
      budgetSeconds: 180,
      usedSeconds: 60,
      missing: [
        { index: 3, start: 174, end: 234, retried: true },
        { index: 8, start: 464, end: 524, retried: false },
      ],
    };
    assert.equal(formatPartSpan(report.missing[0]), "đoạn 4 (2:54–3:54)");
    const text = formatRetryStatus(report);
    assert.match(text, /đoạn 4 \(2:54–3:54\) vẫn chưa nhận dạng được/);
    assert.match(text, /đoạn 9 \(7:44–8:44\) chưa thử lại vì hết ngân sách/);
    assert.match(text, /Đã dùng 60 giây để thử lại/);
    assert.match(text, /ngân sách 180 giây/);
  });
});
