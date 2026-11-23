import { AURA_PRICE_ID, AURA_USD_PER_MILLION_CHARS } from "./aura.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/**
 * Giá dự phòng Deepgram, đối chiếu trang chính thức 2026-11-17 (cột Pay as you go):
 * Nova-3 đơn ngữ 0,0048 đô/phút, đa ngữ 0,0058 đô/phút, Aura-2 0,030 đô/1.000 ký tự.
 * Giá thật tự cập nhật từ trang giá (deepgram-price.ts); Chủ vẫn sửa tay được qua usd_fix.
 */
export const DEEPGRAM_NOVA_ID = "deepgram-nova-3";
export const DEEPGRAM_MULTI_ID = "deepgram-nova-3-multi";
export const DEEPGRAM_NOVA3_USD_PER_MINUTE = 0.0048;
const DEEPGRAM_MULTI_USD_PER_MINUTE = 0.0058;

function row(id: string, usdPerHour: number | null, usdPerMillionChars: number | null): GroqLiveRow {
  return { id, speed: null, usdIn: null, usdOut: null, usdPerHour, usdPerMillionChars, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null };
}

const perHour = (perMinute: number) => Math.round(perMinute * 60 * 1000) / 1000;

export const DEEPGRAM_BASE_ROWS: GroqLiveRow[] = [
  row(DEEPGRAM_NOVA_ID, perHour(DEEPGRAM_NOVA3_USD_PER_MINUTE), null),
  row(DEEPGRAM_MULTI_ID, perHour(DEEPGRAM_MULTI_USD_PER_MINUTE), null),
  row(AURA_PRICE_ID, null, AURA_USD_PER_MILLION_CHARS),
];
