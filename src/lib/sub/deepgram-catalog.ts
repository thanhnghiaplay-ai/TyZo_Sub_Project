import type { GroqLiveRow } from "./groq-board.ts";

/**
 * Giá niêm yết Deepgram, dùng cho bảng giá của Chủ. Deepgram chưa có trang giá tự đọc như Alibaba,
 * nên đây là số dự phòng; Chủ sửa được ở mục Giá và hạn mức (usd_fix).
 * Nova-3 một ngôn ngữ, ghi sẵn: 0,0043 đô/phút = 0,258 đô/giờ (đối chiếu trang chính thức trước khi đổi giá bán).
 */
export const DEEPGRAM_NOVA3_USD_PER_MINUTE = 0.0043;

export const DEEPGRAM_ROWS: GroqLiveRow[] = [
  {
    id: "deepgram-nova-3",
    speed: null,
    usdIn: null,
    usdOut: null,
    usdPerHour: Math.round(DEEPGRAM_NOVA3_USD_PER_MINUTE * 60 * 1000) / 1000,
    usdPerMillionChars: null,
    unlisted: false,
    limits: [],
    contextTokens: null,
    maxCompletionTokens: null,
    maxFile: null,
  },
];

export function deepgramRow(id: string) {
  return DEEPGRAM_ROWS.find((row) => row.id === id) ?? null;
}
