import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vé vào cầu nối. Máy chủ chính (đã biết ai đăng nhập) ký vé; cầu nối chỉ kiểm chữ ký.
 * Nhờ vậy cầu nối chạy riêng được ngay bây giờ, và sau này gắn chung một máy chủ vẫn dùng đúng vé này.
 */
export type LiveTicket = {
  uid: string;
  /** Mã phiên, dùng làm gốc cho mã phiếu tiền. */
  sid: string;
  model: string;
  target: string;
  source: string;
  audio: boolean;
  /** Hết hạn, mili giây kể từ epoch. */
  exp: number;
};

const b64 = (buf: Buffer) => buf.toString("base64url");

function mac(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest();
}

export function signLiveTicket(secret: string, ticket: LiveTicket): string {
  const body = b64(Buffer.from(JSON.stringify(ticket), "utf8"));
  return `${body}.${b64(mac(secret, body))}`;
}

export function verifyLiveTicket(secret: string, token: string, now: number): LiveTicket | null {
  if (!secret || typeof token !== "string") return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const want = mac(secret, body);
  let got: Buffer;
  try {
    got = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<LiveTicket>;
    if (typeof data.uid !== "string" || typeof data.sid !== "string" || typeof data.model !== "string") return null;
    if (typeof data.target !== "string" || typeof data.exp !== "number" || data.exp <= now) return null;
    return {
      uid: data.uid,
      sid: data.sid,
      model: data.model,
      target: data.target,
      source: typeof data.source === "string" ? data.source : "",
      audio: data.audio === true,
      exp: data.exp,
    };
  } catch {
    return null;
  }
}
