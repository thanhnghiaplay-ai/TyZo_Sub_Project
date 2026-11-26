/**
 * Chữ ký cho lệnh quét đêm từ VPS (AZ-006): HMAC-SHA256(LIVE_BRIDGE_SECRET, chuỗi ký) dạng hex, với
 *   chuỗi ký = "risk-sweep:v2:<giây>:<mã dùng một lần>:<phương thức>:<đường dẫn>:<sha256 hex của thân>"
 * Chữ ký gắn với đúng thân yêu cầu (không đổi được «after»), đúng đường, chỉ dùng được một lần (mã lưu ở sweep_nonces)
 * và trong 5 phút. Chuỗi bí mật không đi qua mạng. Hàm thuần để test và để script VPS ký giống hệt (deploy/vps/tyzo.sh).
 */
const SWEEP_WINDOW_S = 300;
export const SWEEP_PATH = "/api/risk-sweep";

export function sweepMessage(seconds: number, nonce: string, method: string, path: string, bodySha256Hex: string): string {
  return `risk-sweep:v2:${Math.floor(seconds)}:${nonce}:${method.toUpperCase()}:${path}:${bodySha256Hex}`;
}

export function sweepTimeOk(seconds: number, nowSeconds: number): boolean {
  return Number.isFinite(seconds) && Math.abs(nowSeconds - seconds) <= SWEEP_WINDOW_S;
}

export function sweepNonceOk(nonce: string): boolean {
  return /^[a-f0-9]{32}$/.test(nonce);
}
