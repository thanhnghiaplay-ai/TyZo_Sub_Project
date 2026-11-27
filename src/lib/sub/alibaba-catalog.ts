import type { GroqLiveRow } from "./groq-board.ts";

/**
 * Giá niêm yết quốc tế, dùng khi chưa kéo được bảng Singapore.
 * Giá tay từng model không còn được tính.
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
  // Keep the tariff; the current model reference does not document a context bound for qwen-turbo.
  blank({ id: "qwen-turbo", usdIn: 0.05, usdOut: 0.2 }),
  // https://www.alibabacloud.com/help/en/model-studio/text-generation-model
  blank({ id: "qwen-plus", usdIn: 0.4, usdOut: 1.2, contextTokens: 1_000_000 }),
  blank({ id: "qwen-max", usdIn: 1.6, usdOut: 6.4, contextTokens: 131_072 }),
  blank({ id: "qwen3-asr-flash", usdPerHour: null }),
  blank({ id: "qwen-audio-3.0-asr-flash-filetrans", usdPerHour: 0.126 }),
  blank({ id: "qwen3-tts-flash", usdPerMillionChars: 10 }),
];

