import { ELEVENLABS_V2_ASR, ELEVENLABS_V3_ASR } from "./elevenlabs.ts";
import { ELEVEN_TTS_ID, ELEVEN_TTS_USD_PER_MILLION_CHARS } from "./eleven-voice.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/**
 * Giá gốc ElevenLabs nhận dạng cả file (Scribe), trang elevenlabs.io/pricing/api đọc 21/11/2026:
 * Scribe v3 và Scribe v2 đều 0,20 đô/giờ âm thanh (không gồm phụ phí từ khóa hay sửa bản, app không bật).

 * Giọng đọc Flash v2.5: 0,04 đô/1.000 ký tự (40 đô/triệu ký tự), cùng trang giá.
 * CHƯA có đường để app tự kéo giá: đây là số cố định trong code, Admin sửa tay ở bảng giá (usd_fix) và số sửa tay luôn thắng.
 */
export const ELEVENLABS_V3_USD_PER_HOUR = 0.2;
export const ELEVENLABS_V2_USD_PER_HOUR = 0.2;

function row(id: string, usdPerHour: number | null, usdPerMillionChars: number | null = null): GroqLiveRow {
  return { id, speed: null, usdIn: null, usdOut: null, usdPerHour, usdPerMillionChars, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null };
}

export const ELEVENLABS_BASE_ROWS: GroqLiveRow[] = [
  row(ELEVENLABS_V3_ASR, ELEVENLABS_V3_USD_PER_HOUR),
  row(ELEVENLABS_V2_ASR, ELEVENLABS_V2_USD_PER_HOUR),
  row(ELEVEN_TTS_ID, null, ELEVEN_TTS_USD_PER_MILLION_CHARS),
];
