import type { GroqLiveRow } from "./sub/groq-board.ts";
import { asrCost, asrPerSecond, chatCost, estimateHold, estimateHoldSplit, type PriceBook } from "./run-bill.ts";

/** 1 giây dịch = 1 giây nhận dạng Turbo theo giá gốc, chưa cộng chênh. */
export const TURBO_ASR = "whisper-large-v3-turbo";

/** Số giây dịch cho một khoản giá gốc. null khi chưa có giá Turbo. 0 khi khoản bằng 0. */
export function tokensForBase(baseVnd: number, turboVndPerSecond: number): number | null {
  if (!(baseVnd > 0)) return 0;
  if (!(turboVndPerSecond > 0)) return null;
  return Math.max(1, Math.ceil(baseVnd / turboVndPerSecond - 1e-9));
}

/**
 * Giá bán một gói: số giây × giá Turbo mỗi giây × (1 + phần trăm chênh) × hệ số đệm.
 * null khi thiếu giá Turbo hoặc hệ số. Không làm tròn xuống.
 */
export function packPriceVnd(tokens: number, turboVndPerSecond: number, markupPct: number, buffer: number): number | null {
  if (!(tokens > 0) || !(turboVndPerSecond > 0) || !(buffer > 0)) return null;
  const markup = Number.isFinite(markupPct) && markupPct > 0 ? markupPct : 0;
  const raw = tokens * turboVndPerSecond * (1 + markup / 100) * buffer;
  return Math.max(1, Math.ceil(raw - 1e-9));
}

export function formatGiay(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(n))) + " giây dịch";
}

/** Số giây sẽ giữ cho một lần chạy. Tính trên giá gốc, đã gồm đệm giữ chỗ. null khi thiếu giá. */
export function holdGiay(input: {
  groq: PriceBook;
  aliRows: GroqLiveRow[];
  asrProvider: string;
  asrModel: string;
  chatModel: string;
  seconds: number;
}): number | null {
  const bare: PriceBook = { rate: input.groq.rate, rows: input.groq.rows, desk: { markup: 0, custom: {} } };
  const turbo = asrPerSecond(bare, TURBO_ASR);
  if (!(turbo && turbo > 0)) return null;
  const vnd =
    input.asrProvider === "alibaba"
      ? estimateHoldSplit({ rate: input.groq.rate, rows: input.aliRows, desk: { markup: 0, custom: {} } }, bare, input.asrModel, input.chatModel, input.seconds)
      : estimateHold(bare, input.asrModel, input.chatModel, input.seconds);
  if (vnd == null) return null;
  return tokensForBase(vnd, turbo);
}

/** Giá gốc của một đoạn đã chạy, quy ra giây dịch. null khi thiếu giá Turbo. */
export function giayForBaseCost(groq: PriceBook, baseVnd: number): number | null {
  const bare: PriceBook = { rate: groq.rate, rows: groq.rows, desk: { markup: 0, custom: {} } };
  const turbo = asrPerSecond(bare, TURBO_ASR);
  if (!(turbo && turbo > 0)) return null;
  return tokensForBase(baseVnd, turbo);
}

export function bareAsrVnd(book: PriceBook, model: string, seconds: number): number {
  const bare: PriceBook = { rate: book.rate, rows: book.rows, desk: { markup: 0, custom: {} } };
  return asrCost(bare, model, seconds) ?? 0;
}

export function bareChatVnd(book: PriceBook, model: string, inn: number, out: number): number {
  const bare: PriceBook = { rate: book.rate, rows: book.rows, desk: { markup: 0, custom: {} } };
  return chatCost(bare, model, inn, out) ?? 0;
}
