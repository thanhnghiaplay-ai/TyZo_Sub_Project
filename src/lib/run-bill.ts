import type { GroqLiveRow } from "./sub/groq-board.ts";
import { emptyOverride, quoteVnd, type PriceOverride, type RunDesk } from "./run-desk.ts";

/** Groq tính tối thiểu 10 giây cho mỗi lần nhận dạng. */
export const MIN_BILLED_SECONDS = 10;
/** Đệm khi giữ chỗ, vì số token dịch chỉ biết sau khi chạy. */
export const HOLD_BUFFER = 1.5;
export const MAX_RUN_SECONDS = 6 * 3600;

export type PriceBook = { rate: number; rows: GroqLiveRow[]; desk: Pick<RunDesk, "markup" | "custom"> };

function rowOf(book: PriceBook, model: string) {
  return book.rows.find((row) => row.id === model) ?? null;
}

function overrideOf(book: PriceBook, model: string): PriceOverride {
  return book.desk.custom[model] ?? emptyOverride();
}

/** Đơn giá nhận dạng, đồng mỗi giây âm thanh, đã gồm phần chênh. null khi model chưa có giá. */
export function asrPerSecond(book: PriceBook, model: string): number | null {
  const row = rowOf(book, model);
  const over = overrideOf(book, model);
  const perHour = quoteVnd(row?.usdPerHour == null ? null : row.usdPerHour * book.rate, book.desk.markup, over.hour);
  return perHour > 0 ? perHour / 3600 : null;
}

/** Đơn giá dịch: đồng mỗi triệu token vào và ra, đã gồm phần chênh. null khi thiếu giá. */
export function chatPerMillion(book: PriceBook, model: string): { inn: number; out: number } | null {
  const row = rowOf(book, model);
  const over = overrideOf(book, model);
  const inn = quoteVnd(row?.usdIn == null ? null : row.usdIn * book.rate, book.desk.markup, over.inn);
  const out = quoteVnd(row?.usdOut == null ? null : row.usdOut * book.rate, book.desk.markup, over.out);
  return inn > 0 || out > 0 ? { inn, out } : null;
}

/** Đồng mỗi triệu ký tự khi đọc thuyết minh. null khi thiếu giá. */
export function speechPerMillionChars(book: PriceBook, model: string): number | null {
  const row = rowOf(book, model);
  const price = quoteVnd(row?.usdPerMillionChars == null ? null : row.usdPerMillionChars * book.rate, book.desk.markup, 0);
  return price > 0 ? price : null;
}

/** Làm tròn lên đồng nguyên. Có dùng thì tối thiểu 1 đ. */
function ceilVnd(amount: number) {
  if (!(amount > 0)) return 0;
  return Math.max(1, Math.ceil(amount - 1e-9));
}

export function asrCost(book: PriceBook, model: string, seconds: number): number | null {
  const per = asrPerSecond(book, model);
  if (per == null) return null;
  return ceilVnd(Math.max(MIN_BILLED_SECONDS, seconds) * per);
}

export function chatCost(book: PriceBook, model: string, promptTokens: number, completionTokens: number): number | null {
  const per = chatPerMillion(book, model);
  if (!per) return null;
  return ceilVnd((Math.max(0, promptTokens) * per.inn + Math.max(0, completionTokens) * per.out) / 1_000_000);
}

export function speechCost(book: PriceBook, model: string, chars: number): number | null {
  const per = speechPerMillionChars(book, model);
  if (per == null) return null;
  return ceilVnd((Math.max(0, chars) * per) / 1_000_000);
}

/**
 * Số giữ chỗ cho một lần chạy: nhận dạng theo giây thật, dịch ước theo thời lượng
 * (12 token vào và 8 token ra mỗi giây, cộng phần dặn dò cố định), nhân hệ số đệm.
 * Số trừ cuối cùng là số thật, phần giữ thừa được nhả.
 */
export function estimateHold(book: PriceBook, asrModel: string, chatModel: string, seconds: number): number | null {
  return estimateHoldSplit(book, book, asrModel, chatModel, seconds);
}

/** Giữ chỗ khi nhận dạng và dịch lấy từ hai bảng giá khác nhau. */
export function estimateHoldSplit(asrBook: PriceBook, chatBook: PriceBook, asrModel: string, chatModel: string, seconds: number): number | null {
  const asr = asrCost(asrBook, asrModel, seconds);
  const chat = chatCost(chatBook, chatModel, Math.ceil(seconds * 12) + 1500, Math.ceil(seconds * 8) + 500);
  if (asr == null || chat == null) return null;
  return Math.ceil((asr + chat) * HOLD_BUFFER);
}

/** Số giây Groq tính tiền cho một kết quả nhận dạng verbose_json. */
export function billedSecondsOf(result: { duration?: unknown; segments?: Array<{ end?: unknown }> } | null | undefined) {
  const duration = Number(result?.duration);
  if (Number.isFinite(duration) && duration > 0) return duration;
  let last = 0;
  for (const seg of result?.segments ?? []) {
    const end = Number(seg?.end);
    if (Number.isFinite(end) && end > last) last = end;
  }
  return last;
}

/** Model dịch đắt nhất trong danh sách được phép, dùng để giữ chỗ khi chế độ Auto. null khi không model nào có giá. */
export function dearestChatModel(book: PriceBook, offered: string[]): string | null {
  let best: string | null = null;
  let bestCost = -1;
  for (const id of offered) {
    const cost = chatCost(book, id, 1_000_000, 1_000_000);
    if (cost != null && cost > bestCost) {
      best = id;
      bestCost = cost;
    }
  }
  return best;
}
