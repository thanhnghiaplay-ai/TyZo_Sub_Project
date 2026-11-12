import type { GroqLiveRow } from "./groq-board.ts";

/**
 * Giá niêm yết quốc tế của Model Studio, dùng làm giá gốc.
 * Chủ nhập giá riêng thì giá riêng thắng. Model không có trong bảng vẫn gán được, nhưng chưa tính được cho đến khi có giá riêng.
 */
const blank = (over: Partial<GroqLiveRow> & { id: string }): GroqLiveRow => ({
  id: over.id,
  speed: null,
  usdIn: over.usdIn ?? null,
  usdOut: over.usdOut ?? null,
  usdPerHour: over.usdPerHour ?? null,
  usdPerMillionChars: over.usdPerMillionChars ?? null,
  unlisted: false,
  limits: [],
  contextTokens: over.contextTokens ?? null,
  maxCompletionTokens: null,
  maxFile: null,
});

export const ALIBABA_ROWS: GroqLiveRow[] = [
  blank({ id: "qwen-turbo", usdIn: 0.05, usdOut: 0.2, contextTokens: 131_072 }),
  blank({ id: "qwen-plus", usdIn: 0.4, usdOut: 1.2, contextTokens: 131_072 }),
  blank({ id: "qwen-max", usdIn: 1.6, usdOut: 6.4, contextTokens: 32_768 }),
  blank({ id: "qwen3-asr-flash", usdPerHour: null }),
  blank({ id: "qwen-audio-3.0-asr-flash-filetrans", usdPerHour: 0.126 }),
  blank({ id: "qwen3-tts-flash", usdPerMillionChars: 10 }),
];

export function alibabaRow(id: string) {
  return ALIBABA_ROWS.find((row) => row.id === id) ?? null;
}
