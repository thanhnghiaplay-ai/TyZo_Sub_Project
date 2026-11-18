import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ASSEMBLYAI_BASE_ROWS, ASSEMBLYAI_PRO_USD_PER_HOUR, ASSEMBLYAI_V2_USD_PER_HOUR } from "./sub/assemblyai-base.ts";
import { ASSEMBLYAI_PRO_ASR, ASSEMBLYAI_V2_ASR } from "./sub/assemblyai.ts";
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

describe("giá AssemblyAI", () => {
  it("bảng giá cố định có đủ hai model và giá dương", () => {
    assert.deepEqual(ASSEMBLYAI_BASE_ROWS.map((row) => row.id), [ASSEMBLYAI_PRO_ASR, ASSEMBLYAI_V2_ASR]);
    assert.equal(ASSEMBLYAI_BASE_ROWS[0].usdPerHour, ASSEMBLYAI_PRO_USD_PER_HOUR);
    assert.equal(ASSEMBLYAI_BASE_ROWS[1].usdPerHour, ASSEMBLYAI_V2_USD_PER_HOUR);
    for (const row of ASSEMBLYAI_BASE_ROWS) assert.ok((row.usdPerHour ?? 0) > 0);
  });

  it("holdGiay tính được cho AssemblyAI và Pro đắt hơn Universal-2", () => {
    const base = { groq: book, aliRows: [], asrProvider: "assemblyai", chatModel: "llama-3.3-70b-versatile", seconds: 3600 };
    const pro = holdGiay({ ...base, asrModel: ASSEMBLYAI_PRO_ASR });
    const v2 = holdGiay({ ...base, asrModel: ASSEMBLYAI_V2_ASR });
    assert.ok(pro != null && v2 != null && pro > 0 && v2 > 0);
    assert.ok(pro > v2, "Pro phải giữ nhiều Token dịch hơn Universal-2");
  });

  it("bảng giá truyền vào thắng bảng cố định (số Chủ sửa tay)", () => {
    const base = { groq: book, aliRows: [], asrProvider: "assemblyai", asrModel: ASSEMBLYAI_PRO_ASR, chatModel: "llama-3.3-70b-versatile", seconds: 3600 };
    const fixed = holdGiay(base);
    const dearer = holdGiay({ ...base, aaiRows: [liveRow(ASSEMBLYAI_PRO_ASR, { usdPerHour: 2.1 })] });
    assert.ok(fixed != null && dearer != null && dearer > fixed);
  });

  it("model AssemblyAI không bị tính nhầm theo bảng Groq", () => {
    const none = holdGiay({ groq: book, aliRows: [], asrProvider: "groq", asrModel: ASSEMBLYAI_PRO_ASR, chatModel: "llama-3.3-70b-versatile", seconds: 3600 });
    assert.equal(none, null);
  });
});
