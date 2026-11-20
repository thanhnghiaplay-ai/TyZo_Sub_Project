import { SONIOX_ASYNC_ASR } from "./soniox.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/**
 * Giá gốc Soniox (nhận dạng bất đồng bộ, cả file): khoảng 0,10 đô/giờ theo ghi chú bước 1 docs/lich-su/HANDOFF_2026-11.md (18/11/2026).
 * CHƯA tra lại trang giá chính thức và CHƯA có đường để app tự kéo giá: đây là số cố định trong code, Chủ sửa tay
 * ở bảng giá Admin (usd_fix) và số sửa tay luôn thắng. Đối chiếu lại khi Chủ nạp tiền và có key thật.
 */
export const SONIOX_ASYNC_USD_PER_HOUR = 0.1;

function row(id: string, usdPerHour: number): GroqLiveRow {
  return { id, speed: null, usdIn: null, usdOut: null, usdPerHour, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null };
}

export const SONIOX_BASE_ROWS: GroqLiveRow[] = [row(SONIOX_ASYNC_ASR, SONIOX_ASYNC_USD_PER_HOUR)];
