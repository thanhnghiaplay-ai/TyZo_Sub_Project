import { createHash, timingSafeEqual } from "node:crypto";

export type PayHit = { ref: string; amount: number; text: string; account?: string };

const CODE = /^TZ[A-Z0-9]{6}$/;

/** Đơn chuyển khoản còn hiệu lực bao lâu, tính từ lúc tạo. */
export const PAY_MINUTES = 15;

export function makePayCode(seed: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "TZ";
  for (let i = 0; i < 6; i += 1) {
    const n = seed.charCodeAt(i % seed.length) + i * 17;
    out += alphabet[Math.abs(n) % alphabet.length];
  }
  return out;
}

export function isPayCode(value: string) {
  return CODE.test(value);
}

export function codesIn(text: string) {
  const found = text.toUpperCase().match(/TZ[A-Z0-9]{6}/g) ?? [];
  return [...new Set(found)];
}

export function sepayHit(body: unknown): PayHit | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (String(row.transferType ?? "in").toLowerCase() === "out") return null;
  const amount = Number(row.transferAmount ?? row.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const text = [row.code, row.content, row.description].filter((item) => item != null).join(" ");
  const ref = String(row.id ?? row.referenceCode ?? "");
  if (!ref) return null;
  return { ref, amount: Math.round(amount), text, account: accountOf(row) };
}

export function cassoHits(body: unknown): PayHit[] {
  if (!body || typeof body !== "object") return [];
  const data = (body as { data?: unknown }).data;
  const rows = Array.isArray(data) ? data : [body];
  const hits: PayHit[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const ref = String(row.id ?? row.tid ?? "");
    if (!ref) continue;
    hits.push({
      ref,
      amount: Math.round(amount),
      text: String(row.description ?? row.content ?? ""),
      account: accountOf(row),
    });
  }
  return hits;
}

export function sameSecret(given: string, expected: string) {
  if (!expected || !given) return false;
  const left = createHash("sha256").update(given).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function accountOf(row: Record<string, unknown>) {
  return String(row.accountNumber ?? row.account_number ?? row.bank_sub_acc_id ?? "");
}

/** Khớp số tài khoản nhận khi cả hai bên đều có số. Thiếu một bên thì không chặn. */
export function accountMatches(payloadAccount: string | undefined, expected: string) {
  const want = digits(expected || "");
  const got = digits(payloadAccount || "");
  if (!want || !got) return true;
  return got === want || got.endsWith(want) || want.endsWith(got);
}

const VIETQR_BIN: Record<string, string> = {
  vcb: "970436",
  vietcombank: "970436",
  tcb: "970407",
  techcombank: "970407",
  mb: "970422",
  mbbank: "970422",
  mbb: "970422",
  acb: "970416",
  bidv: "970418",
  vietinbank: "970415",
  ctg: "970415",
  icb: "970415",
  vpb: "970432",
  vpbank: "970432",
  tpb: "970423",
  tpbank: "970423",
  agribank: "970405",
  vba: "970405",
  stb: "970403",
  sacombank: "970403",
  msb: "970426",
  ocb: "970448",
  shb: "970443",
  hdb: "970437",
  hdbank: "970437",
  vib: "970441",
  seabank: "970440",
  eib: "970431",
  eximbank: "970431",
};

function tlv(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

function crc16(text: string) {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Chuỗi EMV VietQR, hoặc null nếu không nhận ra ngân hàng / số tài khoản. */
export function vietqrPayload(input: { bank: string; account: string; amount: number; info: string }): string | null {
  const account = digits(input.account || "");
  if (account.length < 6 || account.length > 19) return null;
  const key = input.bank.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const bin = /^\d{6}$/.test(key) ? key : VIETQR_BIN[key];
  if (!bin) return null;
  const amount = String(Math.round(input.amount));
  if (!/^\d{1,13}$/.test(amount)) return null;
  const info = input.info.replace(/[^\w .-]/g, "").slice(0, 25);
  const merchant = tlv("00", "A000000727") + tlv("01", tlv("00", bin) + tlv("01", account)) + tlv("02", "QRIBFTTA");
  let body = tlv("00", "01") + tlv("01", "12") + tlv("38", merchant) + tlv("53", "704") + tlv("54", amount) + tlv("58", "VN");
  if (info) body += tlv("62", tlv("08", info));
  body += "6304";
  return body + crc16(body);
}
