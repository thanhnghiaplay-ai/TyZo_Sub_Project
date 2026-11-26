import type { PriceBook } from "./run-bill.ts";
import { BASE_ROWS } from "./price-rows.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import type { ProviderId } from "./sub/provider.ts";
import { applyUsdFix, type UsdFix } from "./usd-fix.ts";

/**
 * Sổ giá của đủ 6 nhà cho phần xem trước giá và «Dựng gói tự động» ở Admin (thuần, không đụng mạng).
 * Giá Alibaba lấy markup của bàn Alibaba nếu có; các nhà còn lại markup 0.
 * `usdFix` là số Chủ sửa tay: phủ lên mọi nhà, ô trống giữ giá đang có. Groq nếu người gọi đã phủ rồi thì phủ lần nữa không đổi số.
 * `alibabaRows` là bảng đã gộp giá tự kéo (`ali_board`). Thiếu thì dùng giá gốc trong code.
 */
export function buildPackBooks(input: {
  rate: number;
  groqRows: GroqLiveRow[];
  alibabaMarkup?: number;
  usdFix?: UsdFix;
  alibabaRows?: GroqLiveRow[];
  /** Bảng giá đã kéo của nhà khác (nhà mới). */
  rows?: Partial<Record<ProviderId, GroqLiveRow[]>>;
}): Record<ProviderId, PriceBook> {
  const rows = (list: GroqLiveRow[]) => (input.usdFix ? applyUsdFix(list, input.usdFix) : list);
  const live: Partial<Record<ProviderId, GroqLiveRow[]>> = { groq: input.groqRows, alibaba: input.alibabaRows, ...input.rows };
  // Mọi nhà trong bảng giá chung (price-rows.ts): nhà mới tự có sổ giá, không viết thêm ở đây.
  return Object.fromEntries(
    (Object.keys(BASE_ROWS) as ProviderId[]).map((id) => [
      id,
      { rate: input.rate, rows: rows(live[id] ?? BASE_ROWS[id]), desk: { markup: id === "alibaba" ? (input.alibabaMarkup ?? 0) : 0, custom: {} } },
    ]),
  ) as Record<ProviderId, PriceBook>;
}
