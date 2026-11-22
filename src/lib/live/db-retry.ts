/**
 * Lỗi do kết nối cơ sở dữ liệu bị cắt (không phải do câu lệnh sai): thử lại một lần bằng kết nối mới là an toàn
 * vì câu lệnh chưa tới được máy chủ hoặc kết nối đã chết. Dùng ở cầu nối (scripts/live-bridge.ts).
 */
const CODES = new Set(["ECONNRESET", "EPIPE", "ETIMEDOUT", "ECONNREFUSED", "57P01", "57P02", "57P03", "08000", "08003", "08006"]);

export function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: unknown }).code ?? "");
  if (CODES.has(code)) return true;
  const message = String((error as { message?: unknown }).message ?? "");
  return /Connection terminated|connection is closed|Client has encountered a connection error|socket hang up/i.test(message);
}
