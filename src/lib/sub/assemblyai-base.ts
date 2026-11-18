import { ASSEMBLYAI_PRO_ASR, ASSEMBLYAI_V2_ASR } from "./assemblyai.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/**
 * Giá gốc AssemblyAI (pay as you go), tra từ tài liệu chính thức 18/11/2026:
 * Universal-3.5 Pro khoảng 0,21 đô/giờ, Universal-2 khoảng 0,15 đô/giờ. Âm thanh nhiều kênh tính theo kênh.
 * CHƯA có trang giá để app tự kéo (khác Deepgram): giá này là số cố định trong code, Chủ sửa tay được
 * ở bảng giá Admin (usd_fix) và số sửa tay luôn thắng. Đối chiếu lại với bảng giá thật khi Chủ có tài khoản.
 */
export const ASSEMBLYAI_PRO_USD_PER_HOUR = 0.21;
export const ASSEMBLYAI_V2_USD_PER_HOUR = 0.15;

function row(id: string, usdPerHour: number): GroqLiveRow {
  return { id, speed: null, usdIn: null, usdOut: null, usdPerHour, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null };
}

export const ASSEMBLYAI_BASE_ROWS: GroqLiveRow[] = [
  row(ASSEMBLYAI_PRO_ASR, ASSEMBLYAI_PRO_USD_PER_HOUR),
  row(ASSEMBLYAI_V2_ASR, ASSEMBLYAI_V2_USD_PER_HOUR),
];
