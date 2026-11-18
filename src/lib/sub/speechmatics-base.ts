import { SPEECHMATICS_ENHANCED_ASR, SPEECHMATICS_STANDARD_ASR } from "./speechmatics.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/**
 * Giá gốc Speechmatics (trả theo dùng, xử lý cả file), tra trang giá chính thức 18/11/2026:
 * Standard 0,45 đô/giờ, Enhanced 0,75 đô/giờ. Trang không ghi ngày nên có thể đổi bất cứ lúc nào.
 * CHƯA có đường để app tự kéo giá (khác Deepgram): đây là số cố định trong code, Chủ sửa tay
 * ở bảng giá Admin (usd_fix) và số sửa tay luôn thắng. Đối chiếu lại khi Chủ có tài khoản.
 */
export const SPEECHMATICS_STANDARD_USD_PER_HOUR = 0.45;
export const SPEECHMATICS_ENHANCED_USD_PER_HOUR = 0.75;

function row(id: string, usdPerHour: number): GroqLiveRow {
  return { id, speed: null, usdIn: null, usdOut: null, usdPerHour, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null };
}

export const SPEECHMATICS_BASE_ROWS: GroqLiveRow[] = [
  row(SPEECHMATICS_ENHANCED_ASR, SPEECHMATICS_ENHANCED_USD_PER_HOUR),
  row(SPEECHMATICS_STANDARD_ASR, SPEECHMATICS_STANDARD_USD_PER_HOUR),
];
