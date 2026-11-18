import type { PriceBook } from "./run-bill.ts";
import { ALIBABA_ROWS } from "./sub/alibaba-catalog.ts";
import { ASSEMBLYAI_BASE_ROWS } from "./sub/assemblyai-base.ts";
import { DEEPGRAM_ROWS } from "./sub/deepgram-catalog.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import { SONIOX_BASE_ROWS } from "./sub/soniox-base.ts";
import { SPEECHMATICS_BASE_ROWS } from "./sub/speechmatics-base.ts";
import type { ProviderId } from "./sub/provider.ts";
import { applyUsdFix, type UsdFix } from "./usd-fix.ts";

/**
 * Sổ giá của đủ 6 nhà cho phần xem trước giá và «Dựng gói tự động» ở Admin (thuần, không đụng mạng).
 * Giá Alibaba lấy markup của bàn Alibaba nếu có; các nhà còn lại markup 0.
 * `usdFix` là số Chủ sửa tay: phủ lên mọi nhà, ô trống giữ giá đang có. Groq nếu người gọi đã phủ rồi thì phủ lần nữa không đổi số.
 * `alibabaRows` / `deepgramRows` là bảng đã gộp giá tự kéo (`ali_board`, `dg_board`). Thiếu thì dùng giá gốc trong code.
 */
export function buildPackBooks(input: {
  rate: number;
  groqRows: GroqLiveRow[];
  alibabaMarkup?: number;
  usdFix?: UsdFix;
  alibabaRows?: GroqLiveRow[];
  deepgramRows?: GroqLiveRow[];
}): Record<ProviderId, PriceBook> {
  const rows = (list: GroqLiveRow[]) => (input.usdFix ? applyUsdFix(list, input.usdFix) : list);
  const base = { markup: 0, custom: {} };
  return {
    groq: { rate: input.rate, rows: rows(input.groqRows), desk: base },
    alibaba: { rate: input.rate, rows: rows(input.alibabaRows ?? ALIBABA_ROWS), desk: { markup: input.alibabaMarkup ?? 0, custom: {} } },
    deepgram: { rate: input.rate, rows: rows(input.deepgramRows ?? DEEPGRAM_ROWS), desk: base },
    assemblyai: { rate: input.rate, rows: rows(ASSEMBLYAI_BASE_ROWS), desk: base },
    speechmatics: { rate: input.rate, rows: rows(SPEECHMATICS_BASE_ROWS), desk: base },
    soniox: { rate: input.rate, rows: rows(SONIOX_BASE_ROWS), desk: base },
  };
}
