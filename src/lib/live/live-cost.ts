import { AUDIO_IN_TOKENS_PER_SEC, AUDIO_OUT_TOKENS_PER_SEC, type LivePriceRow } from "./live-price.ts";

export type LiveBook = { rate: number; markup: number; rows: LivePriceRow[] };

/** Token thật Alibaba trả trong response.done. */
export type LiveUsage = { audioIn: number; textIn: number; imageIn: number; textOut: number; audioOut: number };

export const EMPTY_USAGE: LiveUsage = { audioIn: 0, textIn: 0, imageIn: 0, textOut: 0, audioOut: 0 };

export function addUsage(a: LiveUsage, b: LiveUsage): LiveUsage {
  return {
    audioIn: a.audioIn + b.audioIn,
    textIn: a.textIn + b.textIn,
    imageIn: a.imageIn + b.imageIn,
    textOut: a.textOut + b.textOut,
    audioOut: a.audioOut + b.audioOut,
  };
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Đọc `response.usage` của sự kiện response.done. Thiếu trường nào tính 0. */
export function readUsage(raw: unknown): LiveUsage {
  const usage = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const inn = (usage.input_tokens_details ?? {}) as Record<string, unknown>;
  const out = (usage.output_tokens_details ?? {}) as Record<string, unknown>;
  return {
    audioIn: num(inn.audio_tokens),
    textIn: num(inn.text_tokens),
    imageIn: num(inn.image_tokens),
    textOut: num(out.text_tokens),
    audioOut: num(out.audio_tokens),
  };
}

export function usdOf(row: LivePriceRow, usage: LiveUsage): number {
  // Token chữ ở đầu vào (lời dặn, từ khóa) bảng giá không niêm yết riêng nên tính theo giá âm thanh vào, nghiêng về phía an toàn.
  return (
    ((usage.audioIn + usage.textIn) * row.usdAudioIn +
      usage.imageIn * row.usdImageIn +
      usage.textOut * row.usdTextOut +
      usage.audioOut * row.usdAudioOut) /
    1_000_000
  );
}

/** Làm tròn lên đồng nguyên, có dùng thì tối thiểu 1 đ. */
function ceilVnd(amount: number) {
  if (!(amount > 0)) return 0;
  return Math.max(1, Math.ceil(amount - 1e-9));
}

/** Tiền một lần dùng: `cost` là giá khách trả (đã cộng chênh), `base` là giá gốc không chênh. null khi chưa có giá. */
export function liveCost(book: LiveBook, model: string, usage: LiveUsage): { cost: number; base: number } | null {
  const row = book.rows.find((item) => item.id === model);
  if (!row || !(book.rate > 0)) return null;
  const base = usdOf(row, usage) * book.rate;
  return { cost: ceilVnd(base * (1 + book.markup / 100)), base: ceilVnd(base) };
}

/**
 * Chữ dịch ra ước khoảng 5 token mỗi giây lời nói. Alibaba không công bố số này; ví dụ response.done của họ
 * cho thấy token chữ ra thấp hơn nhiều token tiếng. Chỉ dùng để giữ chỗ và hiện "còn N phút";
 * tiền thật luôn tính theo token Alibaba báo.
 */
export const TEXT_OUT_TOKENS_PER_SEC = 5;

/** Token ước tính cho một khoảng thời lượng đang nghe. */
export function usageForSeconds(seconds: number, audioOut: boolean): LiveUsage {
  const s = Math.max(0, seconds);
  return {
    audioIn: s * AUDIO_IN_TOKENS_PER_SEC,
    textIn: 0,
    imageIn: 0,
    textOut: s * TEXT_OUT_TOKENS_PER_SEC,
    audioOut: audioOut ? s * AUDIO_OUT_TOKENS_PER_SEC : 0,
  };
}

/** Số tiền giữ cho một khoảng ngắn, đã nhân đệm. null khi chưa có giá. */
export function liveHold(book: LiveBook, model: string, audioOut: boolean, seconds: number, buffer = 1.5) {
  const quote = liveCost(book, model, usageForSeconds(seconds * buffer, audioOut));
  return quote;
}

/** Đồng mỗi phút để hiện cho khách ("còn N phút"). */
export function livePerMinute(book: LiveBook, model: string, audioOut: boolean): number | null {
  const quote = liveCost(book, model, usageForSeconds(60, audioOut));
  return quote ? quote.cost : null;
}
