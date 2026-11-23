/**
 * Chữ ký cho lệnh quét đêm từ VPS: HMAC-SHA256(LIVE_BRIDGE_SECRET, "risk-sweep:<giây>") dạng hex.
 * Chuỗi bí mật không đi qua mạng; chữ ký chỉ dùng được trong 5 phút. Hàm thuần (nhận hàm hmac từ ngoài) để test.
 */
const SWEEP_WINDOW_S = 300;

export function sweepMessage(seconds: number): string {
  return `risk-sweep:${Math.floor(seconds)}`;
}

export function sweepTimeOk(seconds: number, nowSeconds: number): boolean {
  return Number.isFinite(seconds) && Math.abs(nowSeconds - seconds) <= SWEEP_WINDOW_S;
}
