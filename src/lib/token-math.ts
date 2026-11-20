import { bareBookOf, type ProviderRows } from "./price-rows.ts";
import { isProviderId, type ProviderId } from "./sub/provider.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import { asrCost, asrPerSecond, chatCost, estimateHoldSplit, type PriceBook } from "./run-bill.ts";

/** 1 Token dịch = 1 giây nhận dạng Turbo theo giá gốc, chưa cộng chênh. */
export const TURBO_ASR = "whisper-large-v3-turbo";

/** Số Token dịch cho một khoản giá gốc. null khi chưa có giá Turbo. 0 khi khoản bằng 0. */
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
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(n))) + " Token dịch";
}

/** Số Token dịch sẽ giữ cho một lần chạy. Tính trên giá gốc, đã gồm đệm giữ chỗ. null khi thiếu giá. */
export function holdGiay(input: {
  groq: PriceBook;
  /** Bảng giá đã kéo theo từng nhà. Thiếu nhà nào thì dùng giá gốc trong code (price-rows.ts). */
  rows?: ProviderRows;
  /** Các trường cũ, vẫn nhận để không vỡ chỗ gọi cũ: gộp vào `rows`. */
  aliRows?: GroqLiveRow[];
  dgRows?: GroqLiveRow[];
  aaiRows?: GroqLiveRow[];
  smRows?: GroqLiveRow[];
  sxRows?: GroqLiveRow[];
  asrProvider: string;
  asrModel: string;
  /** Nhà chạy model dịch. Thiếu = Groq. Giá dịch tính theo bảng của đúng nhà này. */
  chatProvider?: string;
  chatModel: string;
  seconds: number;
}): number | null {
  const bare: PriceBook = { rate: input.groq.rate, rows: input.groq.rows, desk: { markup: 0, custom: {} } };
  const turbo = asrPerSecond(bare, TURBO_ASR);
  if (!(turbo && turbo > 0)) return null;
  const rows: ProviderRows = {
    ...(input.aliRows && input.aliRows.length ? { alibaba: input.aliRows } : {}),
    ...(input.dgRows ? { deepgram: input.dgRows } : {}),
    ...(input.aaiRows ? { assemblyai: input.aaiRows } : {}),
    ...(input.smRows ? { speechmatics: input.smRows } : {}),
    ...(input.sxRows ? { soniox: input.sxRows } : {}),
    ...input.rows,
  };
  const asrHouse = isProviderId(input.asrProvider) ? input.asrProvider : null;
  const chatHouse = isProviderId(input.chatProvider ?? "groq") ? ((input.chatProvider ?? "groq") as ProviderId) : null;
  if (!asrHouse || !chatHouse) return null;
  const vnd = estimateHoldSplit(bareBookOf(asrHouse, input.groq, rows), bareBookOf(chatHouse, input.groq, rows), input.asrModel, input.chatModel, input.seconds);
  if (vnd == null) return null;
  return tokensForBase(vnd, turbo);
}

/** Giá gốc của một đoạn đã chạy, quy ra Token dịch. null khi thiếu giá Turbo. */
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

/**
 * Giá một model ở cửa Trả theo lượt, nói bằng Token dịch (từ giá gốc, không cộng chênh).
 * 1 Token dịch = giá gốc 1 giây nhận dạng Turbo. null khi chưa có giá Turbo.
 */
export function formatRoomTokens(
  row: { usdPerHour: number | null; usdPerMillionChars: number | null; usdIn: number | null; usdOut: number | null },
  groq: { rate: number; rows: GroqLiveRow[] },
): string | null {
  const bare: PriceBook = { rate: groq.rate, rows: groq.rows, desk: { markup: 0, custom: {} } };
  const turbo = asrPerSecond(bare, TURBO_ASR);
  if (!(turbo && turbo > 0)) return null;
  const tokens = (usd: number | null) => (usd == null || !(usd > 0) ? null : tokensForBase(usd * groq.rate, turbo));
  const num = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
  if (row.usdPerHour != null) {
    const n = tokens(row.usdPerHour);
    return n ? `${num(n)} Token dịch/giờ` : "Chưa niêm yết";
  }
  if (row.usdPerMillionChars != null) {
    const n = tokens(row.usdPerMillionChars);
    return n ? `${num(n)} Token dịch mỗi triệu ký tự` : "Chưa niêm yết";
  }
  const inn = tokens(row.usdIn);
  const out = tokens(row.usdOut);
  if (!inn && !out) return "Chưa niêm yết";
  return `${inn ? num(inn) : "—"} vào / ${out ? num(out) : "—"} ra Token dịch mỗi triệu token`;
}
