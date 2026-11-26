/**
 * BẢNG GIÁ THEO NHÀ. Một chỗ để hỏi «model của nhà X giá bao nhiêu», dùng cho mọi việc (nhận dạng, dịch, đọc).
 * `BASE_ROWS` là giá gốc trong code của từng nhà (dùng khi chưa kéo được trang giá). Kiểu `Record<ProviderId, …>`
 * bắt buộc đủ mọi nhà: thêm nhà mới mà quên khai giá thì tsc báo lỗi (PROVIDERS.md bước 7).
 * Groq không có giá gốc trong code: luôn lấy từ bảng giá đã kéo (loadPriceBook), vì Token dịch quy theo Whisper Turbo của Groq.
 */
import { ALIBABA_ROWS } from "./sub/alibaba-catalog.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import type { ProviderId } from "./sub/provider.ts";
import type { PriceBook } from "./run-bill.ts";

export const BASE_ROWS: Record<ProviderId, GroqLiveRow[]> = {
  "tyzo-modal": [],
  groq: [],
  alibaba: ALIBABA_ROWS,
};

/** Bảng giá đã kéo của từng nhà (thiếu nhà nào thì dùng BASE_ROWS của nhà đó). */
export type ProviderRows = Partial<Record<ProviderId, GroqLiveRow[]>>;

/** Hàng giá của một nhà: Groq lấy từ bảng Groq, nhà khác lấy bảng đã kéo rồi mới tới giá gốc trong code. */
export function rowsOf(provider: ProviderId, groq: PriceBook, rows?: ProviderRows): GroqLiveRow[] {
  if (provider === "groq") return groq.rows;
  return rows?.[provider] ?? BASE_ROWS[provider];
}

/** Sổ giá GỐC (không chênh) của một nhà, cùng tỷ giá với bảng Groq. */
export function bareBookOf(provider: ProviderId, groq: PriceBook, rows?: ProviderRows): PriceBook {
  return { rate: groq.rate, rows: rowsOf(provider, groq, rows), desk: { markup: 0, custom: {} } };
}
