// Khoản giữ Token dịch cho một lần trau chuốt (bước A5.3/A5.4). File thuần, chỉ import tương đối.
// Máy chủ tự tính khoản giữ từ số token ước khách gửi lên (có chặn trên), KHÔNG tin số Token khách tự khai.
// Trừ thật theo lượng token model báo về do `/api/room-groq` làm (đã có sẵn, xem `chargeWith` ở run-gate.ts);
// phần giữ dư nhả khi đóng phiếu, lỗi nhà cung cấp thì không bị trừ.

import { bareChatVnd, giayForBaseCost } from "./billing/token-math.ts";
import { chatPerMillion, HOLD_BUFFER, type PriceBook } from "./billing/run-bill.ts";

/** Chặn trên số token ước khách gửi lên: ~ vài nghìn câu. Quá mức này là dữ liệu bất thường. */
export const POLISH_MAX_TOKENS = 3_000_000;

export function validPolishTokens(inn: unknown, out: unknown): { inn: number; out: number } | null {
  const a = Math.ceil(Number(inn));
  const b = Math.ceil(Number(out));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 1 || b < 1 || a > POLISH_MAX_TOKENS || b > POLISH_MAX_TOKENS) return null;
  return { inn: a, out: b };
}

/** Token dịch cần giữ. null khi model chưa có giá hoặc chưa có giá Turbo: khi đó KHÔNG mở phiếu. */
export function polishHold(book: PriceBook, model: string, inn: number, out: number, unitBook: PriceBook = book): number | null {
  // `book`: giá của nhà chạy model (mọi nhà). `unitBook`: bảng Groq có Whisper Turbo để quy ra Token dịch.
  const bare: PriceBook = { rate: book.rate, rows: book.rows, desk: { markup: 0, custom: {} } };
  if (!chatPerMillion(bare, model)) return null;
  const base = bareChatVnd(book, model, inn, out);
  if (!(base > 0)) return null;
  const tokens = giayForBaseCost(unitBook, base);
  if (tokens == null || tokens < 1) return null;
  return Math.max(1, Math.ceil(tokens * HOLD_BUFFER));
}
