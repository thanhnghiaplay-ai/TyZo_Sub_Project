import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SPEECHMATICS_BASE_ROWS, SPEECHMATICS_ENHANCED_USD_PER_HOUR, SPEECHMATICS_STANDARD_USD_PER_HOUR } from "./sub/speechmatics-base.ts";
import { SPEECHMATICS_ENHANCED_ASR, SPEECHMATICS_STANDARD_ASR } from "./sub/speechmatics.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import { holdGiay } from "./token-math.ts";
import type { PriceBook } from "./run-bill.ts";

function liveRow(id: string, extra: Partial<GroqLiveRow>): GroqLiveRow {
  return { id, speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...extra };
}

const book: PriceBook = {
  rate: 25000,
  rows: [
    liveRow("whisper-large-v3-turbo", { usdPerHour: 0.04 }),
    liveRow("llama-3.3-70b-versatile", { usdIn: 0.59, usdOut: 0.79 }),
  ],
  desk: { markup: 0, custom: {} },
};

describe("giá Speechmatics", () => {
  it("bảng giá cố định có đủ hai model và giá dương", () => {
    assert.deepEqual(SPEECHMATICS_BASE_ROWS.map((row) => row.id), [SPEECHMATICS_ENHANCED_ASR, SPEECHMATICS_STANDARD_ASR]);
    assert.equal(SPEECHMATICS_BASE_ROWS[0].usdPerHour, SPEECHMATICS_ENHANCED_USD_PER_HOUR);
    assert.equal(SPEECHMATICS_BASE_ROWS[1].usdPerHour, SPEECHMATICS_STANDARD_USD_PER_HOUR);
    for (const row of SPEECHMATICS_BASE_ROWS) assert.ok((row.usdPerHour ?? 0) > 0);
  });

  it("holdGiay tính được cho Speechmatics và Enhanced đắt hơn Standard", () => {
    const base = { groq: book, aliRows: [], asrProvider: "speechmatics", chatModel: "llama-3.3-70b-versatile", seconds: 3600 };
    const enhanced = holdGiay({ ...base, asrModel: SPEECHMATICS_ENHANCED_ASR });
    const standard = holdGiay({ ...base, asrModel: SPEECHMATICS_STANDARD_ASR });
    assert.ok(enhanced != null && standard != null && enhanced > 0 && standard > 0);
    assert.ok(enhanced > standard, "Enhanced phải giữ nhiều Token dịch hơn Standard");
  });

  it("bảng giá truyền vào thắng bảng cố định (số Chủ sửa tay)", () => {
    const base = { groq: book, aliRows: [], asrProvider: "speechmatics", asrModel: SPEECHMATICS_ENHANCED_ASR, chatModel: "llama-3.3-70b-versatile", seconds: 3600 };
    const fixed = holdGiay(base);
    const dearer = holdGiay({ ...base, smRows: [liveRow(SPEECHMATICS_ENHANCED_ASR, { usdPerHour: 2.1 })] });
    assert.ok(fixed != null && dearer != null && dearer > fixed);
  });

  it("model Speechmatics không bị tính nhầm theo bảng Groq", () => {
    const none = holdGiay({ groq: book, aliRows: [], asrProvider: "groq", asrModel: SPEECHMATICS_ENHANCED_ASR, chatModel: "llama-3.3-70b-versatile", seconds: 3600 });
    assert.equal(none, null);
  });
});
