import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SONIOX_BASE_ROWS, SONIOX_ASYNC_USD_PER_HOUR } from "./sub/soniox-base.ts";
import { SONIOX_ASYNC_ASR } from "./sub/soniox.ts";
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

describe("giá Soniox", () => {
  it("bảng giá cố định có model Soniox và giá dương", () => {
    assert.deepEqual(SONIOX_BASE_ROWS.map((row) => row.id), [SONIOX_ASYNC_ASR]);
    assert.equal(SONIOX_BASE_ROWS[0].usdPerHour, SONIOX_ASYNC_USD_PER_HOUR);
    assert.ok((SONIOX_BASE_ROWS[0].usdPerHour ?? 0) > 0);
  });

  it("holdGiay tính được cho Soniox", () => {
    const hold = holdGiay({ groq: book, aliRows: [], asrProvider: "soniox", asrModel: SONIOX_ASYNC_ASR, chatModel: "llama-3.3-70b-versatile", seconds: 3600 });
    assert.ok(hold != null && hold > 0);
  });

  it("bảng giá truyền vào thắng bảng cố định (số Chủ sửa tay)", () => {
    const base = { groq: book, aliRows: [], asrProvider: "soniox", asrModel: SONIOX_ASYNC_ASR, chatModel: "llama-3.3-70b-versatile", seconds: 3600 };
    const fixed = holdGiay(base);
    const dearer = holdGiay({ ...base, sxRows: [liveRow(SONIOX_ASYNC_ASR, { usdPerHour: 2.1 })] });
    assert.ok(fixed != null && dearer != null && dearer > fixed);
  });

  it("model Soniox không bị tính nhầm theo bảng Groq", () => {
    const none = holdGiay({ groq: book, aliRows: [], asrProvider: "groq", asrModel: SONIOX_ASYNC_ASR, chatModel: "llama-3.3-70b-versatile", seconds: 3600 });
    assert.equal(none, null);
  });
});
