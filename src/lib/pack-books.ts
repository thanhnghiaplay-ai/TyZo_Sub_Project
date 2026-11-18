import type { PriceBook } from "./run-bill.ts";
import { ALIBABA_ROWS } from "./sub/alibaba-catalog.ts";
import { ASSEMBLYAI_BASE_ROWS } from "./sub/assemblyai-base.ts";
import { DEEPGRAM_ROWS } from "./sub/deepgram-catalog.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import { SONIOX_BASE_ROWS } from "./sub/soniox-base.ts";
import { SPEECHMATICS_BASE_ROWS } from "./sub/speechmatics-base.ts";
import type { ProviderId } from "./sub/provider.ts";

/**
 * Sổ giá gốc của đủ 6 nhà cho phần xem trước giá và «Dựng gói tự động» ở Admin (thuần, không đụng mạng).
 * Giá Alibaba lấy markup của bàn Alibaba nếu có; các nhà còn lại giá gốc (markup 0). Số Chủ sửa tay ở Admin
 * chưa gộp ở đây (xem trước chỉ là giá gốc ước).
 */
export function buildPackBooks(input: {
  rate: number;
  groqRows: GroqLiveRow[];
  alibabaMarkup?: number;
}): Record<ProviderId, PriceBook> {
  const base = { markup: 0, custom: {} };
  return {
    groq: { rate: input.rate, rows: input.groqRows, desk: base },
    alibaba: { rate: input.rate, rows: ALIBABA_ROWS, desk: { markup: input.alibabaMarkup ?? 0, custom: {} } },
    deepgram: { rate: input.rate, rows: DEEPGRAM_ROWS, desk: base },
    assemblyai: { rate: input.rate, rows: ASSEMBLYAI_BASE_ROWS, desk: base },
    speechmatics: { rate: input.rate, rows: SPEECHMATICS_BASE_ROWS, desk: base },
    soniox: { rate: input.rate, rows: SONIOX_BASE_ROWS, desk: base },
  };
}
