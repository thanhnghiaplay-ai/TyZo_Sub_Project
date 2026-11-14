/**
 * Giá Qwen LiveTranslate (đô la mỗi triệu token), vùng quốc tế (Singapore).
 * Giá lấy từ trang chính thức của Alibaba. Số dưới đây chỉ là giá dự phòng khi chưa lấy được.
 */
export type LivePriceRow = { id: string; usdAudioIn: number; usdImageIn: number; usdTextOut: number; usdAudioOut: number };

export const LIVE_MODEL_38 = "qwen3.8-livetranslate-flash-realtime";
export const LIVE_MODEL_35 = "qwen3.5-livetranslate-flash-realtime";

/** Alibaba tính 7 token cho mỗi giây âm thanh vào và 12,5 token cho mỗi giây âm thanh ra. */
export const AUDIO_IN_TOKENS_PER_SEC = 7;
export const AUDIO_OUT_TOKENS_PER_SEC = 12.5;

export const LIVE_FALLBACK_ROWS: LivePriceRow[] = [
  { id: LIVE_MODEL_38, usdAudioIn: 7.5, usdImageIn: 0.55, usdTextOut: 20, usdAudioOut: 30 },
  { id: LIVE_MODEL_35, usdAudioIn: 7.5, usdImageIn: 0.55, usdTextOut: 20, usdAudioOut: 30 },
];

/** Trang giá chính thức của từng model, đọc bằng máy chủ. */
export const LIVE_PRICE_PAGES: Record<string, string> = {
  [LIVE_MODEL_38]: "https://www.alibabacloud.com/help/en/model-studio/qwen3-8-livetranslate-flash-realtime",
};

/** Biến HTML của bảng giá thành chữ thường, mỗi hàng một dòng, các ô cách nhau bằng dấu |. */
export function pageText(raw: string): string {
  return raw
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<\/(tr|p|div|h\d|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function valueOf(segment: string, label: RegExp): number | null {
  const match = segment.match(new RegExp(`(?:${label.source})\\s*\\|\\s*\\$?\\s*([0-9]+(?:\\.[0-9]+)?)`, "i"));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Đọc bốn giá vùng quốc tế từ trang chính thức (dạng HTML hoặc markdown).
 * Chỉ nhận bảng nằm sau chữ "International", dừng trước bảng "China (Beijing)".
 * Thiếu một giá thì trả null, không đoán.
 */
export function parseLivePrice(id: string, raw: string): LivePriceRow | null {
  const text = pageText(raw);
  const start = text.search(/International/i);
  if (start < 0) return null;
  let segment = text.slice(start);
  const china = segment.search(/China\s*\(Beijing\)/i);
  if (china > 0) segment = segment.slice(0, china);
  const usdAudioIn = valueOf(segment, /(?:input:?\s*audio|audio\s*input)/);
  const usdImageIn = valueOf(segment, /(?:input:?\s*image|image\s*input)/);
  const usdTextOut = valueOf(segment, /(?:output:?\s*text|text\s*output)/);
  const usdAudioOut = valueOf(segment, /(?:output:?\s*audio|audio\s*output)/);
  if (usdAudioIn == null || usdImageIn == null || usdTextOut == null || usdAudioOut == null) return null;
  return { id, usdAudioIn, usdImageIn, usdTextOut, usdAudioOut };
}

/** Giá lấy về lệch quá xa giá dự phòng (dưới 1/5 hoặc trên 5 lần) coi như đọc sai trang, không nhận. */
export function saneLivePrice(row: LivePriceRow, fallback: LivePriceRow): boolean {
  const pairs: Array<[number, number]> = [
    [row.usdAudioIn, fallback.usdAudioIn],
    [row.usdImageIn, fallback.usdImageIn],
    [row.usdTextOut, fallback.usdTextOut],
    [row.usdAudioOut, fallback.usdAudioOut],
  ];
  return pairs.every(([got, base]) => got >= base / 5 && got <= base * 5);
}

export type LiveBoard = { at: number; rows: LivePriceRow[] };

/**
 * Kéo giá của mọi model có trang giá. Model nào kéo hỏng thì giữ giá đã lưu, rồi mới tới giá dự phòng.
 * `failed` liệt kê model không cập nhật được để Admin thấy.
 */
export async function pullLiveBoard(
  fetchPage: (url: string) => Promise<string>,
  stored: LiveBoard | null,
  now: number,
): Promise<{ board: LiveBoard; failed: string[] }> {
  const rows: LivePriceRow[] = [];
  const failed: string[] = [];
  for (const base of LIVE_FALLBACK_ROWS) {
    const url = LIVE_PRICE_PAGES[base.id];
    let row: LivePriceRow | null = null;
    if (url) {
      try {
        const parsed = parseLivePrice(base.id, await fetchPage(url));
        if (parsed && saneLivePrice(parsed, base)) row = parsed;
      } catch {
        row = null;
      }
      if (!row) failed.push(base.id);
    }
    rows.push(row ?? stored?.rows.find((item) => item.id === base.id) ?? base);
  }
  return { board: { at: now, rows }, failed };
}
