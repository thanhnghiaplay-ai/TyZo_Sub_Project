import {
  AUDIO_IN_TOKENS_PER_SEC,
  AUDIO_OUT_TOKENS_PER_SEC,
  type LivePriceRow,
} from "./live-price.ts";

export type LiveBook = { rate: number; rows: LivePriceRow[] };

/** Token thật Alibaba trả trong response.done. */
export type LiveUsage = {
  audioIn: number;
  textIn: number;
  imageIn: number;
  textOut: number;
  audioOut: number;
};

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
    imageIn: num(inn.video_tokens ?? inn.image_tokens),
    textOut: num(out.text_tokens),
    audioOut: num(out.audio_tokens),
  };
}

/** LiveTranslate response.done counters are cumulative for one upstream session.
 * Keep a component-wise high-water mark so repeats/older reports cannot bill again.
 * The fixed input system prompt is explicitly not billed by this API.
 */
export function cumulativeUsageDelta(previous: LiveUsage, reported: LiveUsage) {
  const next = { ...previous };
  const usage = { ...previous };
  for (const key of ["audioIn", "textIn", "imageIn", "textOut", "audioOut"] as const) {
    next[key] = Math.max(previous[key], reported[key]);
    usage[key] = next[key] - previous[key];
  }
  usage.textIn = 0;
  return { next, usage };
}

/** Missing/malformed billable counters require reconciliation, never an assumed zero bill. */
export function hasBillableUsage(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const u = raw as Record<string, unknown>;
  if (
    !u.input_tokens_details ||
    typeof u.input_tokens_details !== "object" ||
    !u.output_tokens_details ||
    typeof u.output_tokens_details !== "object"
  )
    return false;
  const inn = u.input_tokens_details as Record<string, unknown>,
    out = u.output_tokens_details as Record<string, unknown>;
  const count = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  return (
    count(inn.audio_tokens) &&
    (count(out.text_tokens) || count(out.audio_tokens)) &&
    [inn.video_tokens, inn.image_tokens, out.text_tokens, out.audio_tokens].every(
      (n) => n === undefined || count(n),
    )
  );
}

function usdOf(row: LivePriceRow, usage: LiveUsage): number {
  // Token chữ ở đầu vào (lời dặn, từ khóa) bảng giá không niêm yết riêng nên tính theo giá âm thanh vào, nghiêng về phía an toàn.
  return (
    ((usage.audioIn + usage.textIn) * row.usdAudioIn +
      usage.imageIn * row.usdImageIn +
      usage.textOut * row.usdTextOut +
      usage.audioOut * row.usdAudioOut) /
    1_000_000
  );
}

/** Expense before rounding; customer quote/debit continues to use liveCost. */
export function liveSupplierCost(book: LiveBook, model: string, usage: LiveUsage): number | null {
  const row = book.rows.find((r) => r.id === model);
  return row && book.rate > 0 ? usdOf(row, usage) * book.rate : null;
}

/** Làm tròn lên đồng nguyên, có dùng thì tối thiểu 1 đ. */
function ceilVnd(amount: number) {
  if (!(amount > 0)) return 0;
  return Math.max(1, Math.ceil(amount - 1e-9));
}

/** Tiền một lần dùng. Từ v5.2.1 không còn cộng chênh nên `cost` bằng `base` (giữ cả hai để chỗ gọi cũ không đổi). null khi chưa có giá. */
export function liveCost(
  book: LiveBook,
  model: string,
  usage: LiveUsage,
): { cost: number; base: number } | null {
  const row = book.rows.find((item) => item.id === model);
  if (!row || !(book.rate > 0)) return null;
  const base = usdOf(row, usage) * book.rate;
  return { cost: ceilVnd(base), base: ceilVnd(base) };
}

/**
 * Chữ dịch ra ước khoảng 5 token mỗi giây lời nói. Alibaba không công bố số này; ví dụ response.done của họ
 * cho thấy token chữ ra thấp hơn nhiều token tiếng. Chỉ dùng để giữ chỗ và hiện "còn N phút";
 * tiền thật luôn tính theo token Alibaba báo.
 */
const TEXT_OUT_TOKENS_PER_SEC = 5;

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
export function liveHold(
  book: LiveBook,
  model: string,
  audioOut: boolean,
  seconds: number,
  buffer = 1.5,
) {
  const quote = liveCost(book, model, usageForSeconds(seconds * buffer, audioOut));
  return quote;
}

/** Đồng mỗi phút để hiện cho khách ("còn N phút"). */
export function livePerMinute(book: LiveBook, model: string, audioOut: boolean): number | null {
  const quote = liveCost(book, model, usageForSeconds(60, audioOut));
  return quote ? quote.cost : null;
}
