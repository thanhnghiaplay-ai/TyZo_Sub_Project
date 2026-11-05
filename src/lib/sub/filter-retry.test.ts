import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planFilterRetries } from "./filter-retry.ts";
import type { RawAsrPart, RejectEntry } from "./diagnostics.ts";

function reject(partial: Partial<RejectEntry> & Pick<RejectEntry, "reason" | "text" | "start" | "end">): RejectEntry {
  return { partIndex: 0, language: "zh", ...partial };
}

function empty(partIndex: number, start: number, end: number): RawAsrPart {
  return {
    partIndex,
    start,
    end,
    requestedLanguage: "zh",
    detectedLanguage: "",
    language: "zh",
    kind: "whisper_empty",
    segments: [],
  };
}

describe("thử lại câu không chắc", () => {
  it("không lấy câu đã bỏ, lỗi giải mã, hay lý do khác", () => {
    const plan = planFilterRetries({
      rejects: [
        reject({ reason: "short_uncertain", text: "Ừ", start: 1, end: 1.3 }),
        reject({ reason: "short_uncertain", text: "A", start: 2, end: 2.2, dismissed: true }),
        reject({ reason: "hallucination", text: "Thanks for watching", start: 3, end: 4 }),
        reject({ reason: "low_confidence", text: "đi", start: 8, end: 9 }),
      ],
      raw: [
        { ...empty(1, 20, 80), kind: "decode_fail" },
        empty(2, 4, 5),
      ],
    });
    assert.deepEqual(
      plan.retry.map((clip) => clip.reason),
      ["short_uncertain", "whisper_empty", "low_confidence"],
    );
    assert.equal(plan.deferred.length, 0);
  });

  it("hết ngân sách thì để lại, không cắt đoạn", () => {
    const plan = planFilterRetries({
      rejects: [reject({ reason: "brief_uncertain", text: "Yeah", start: 1, end: 1.4 })],
      raw: [empty(0, 0, 80), empty(1, 90, 170)],
      budgetSeconds: 90,
    });
    assert.equal(plan.retry.length, 2);
    assert.equal(plan.deferred.length, 1);
    assert.equal(plan.deferred[0].reason, "whisper_empty");
  });

  it("đã thử thì không chọn lại", () => {
    const row = reject({ reason: "low_confidence", text: "đi", start: 8, end: 9 });
    const once = planFilterRetries({ rejects: [row], raw: [] });
    const again = planFilterRetries({ rejects: [row], raw: [], already: [once.retry[0].key] });
    assert.equal(again.retry.length, 0);
  });
});
