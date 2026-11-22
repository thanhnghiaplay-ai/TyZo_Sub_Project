/**
 * Liên kết ứng dụng Android với tài khoản. Hàm thuần, không import máy chủ.
 *
 * Mã liên kết: 8 ký tự, bỏ chữ dễ nhầm (0/O, 1/I/L), hiện dạng ABCD-EFGH, sống 10 phút, dùng một lần.
 * Khóa máy: 32 byte ngẫu nhiên, ứng dụng giữ, máy chủ chỉ lưu băm.
 */
export const LINK_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LINK_CODE_LENGTH = 8;
export const LINK_CODE_TTL_SECONDS = 600;
/** Mỗi tài khoản giữ tối đa bấy nhiêu máy đang liên kết; liên kết thêm thì máy cũ nhất bị gỡ. */
export const MAX_DEVICES = 3;
export const DEVICE_TOKEN_PREFIX = "tzd_";
/** Khóa máy bỏ không quá bấy nhiêu ngày thì hết dùng được, phải liên kết lại. */
export const DEVICE_IDLE_DAYS = 90;

/**
 * Bản ứng dụng Android mới nhất. Phải khớp versionCode và versionName trong android/app/build.gradle.kts
 * (app-link.test.ts kiểm). Ứng dụng cũ hơn thấy lời mời tải bản mới.
 */
export const ANDROID_APP = { code: 4, name: "0.4" } as const;

/** Chỉ nhận địa chỉ tệp cài https. Rỗng khi chưa đặt hoặc sai. */
export function apkUrlFrom(raw: string | undefined): string {
  if (!raw) return "";
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Dựng mã từ các byte ngẫu nhiên (truyền vào để test được). */
export function codeFromBytes(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i += 1) out += LINK_ALPHABET[bytes[i % bytes.length] % LINK_ALPHABET.length];
  return out;
}

export function showCode(code: string): string {
  return code.length === LINK_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Chuẩn hóa mã khách gõ: bỏ cách, gạch, đổi chữ hoa, đổi chữ dễ nhầm. null khi không đúng dạng. */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  // 0 và 1 không có trong bảng chữ, nên mã có chúng là sai.
  if (cleaned.length !== LINK_CODE_LENGTH) return null;
  for (const ch of cleaned) if (!LINK_ALPHABET.includes(ch)) return null;
  return cleaned;
}

/** Tên máy khách gửi lên: chữ thường, tối đa 60 ký tự. */
export function cleanDeviceName(raw: unknown): string {
  if (typeof raw !== "string") return "Điện thoại Android";
  const text = Array.from(raw, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return text || "Điện thoại Android";
}

/** Đọc khóa máy từ tiêu đề Authorization. null khi thiếu hoặc sai dạng. */
export function readDeviceToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(tzd_[A-Za-z0-9_-]{40,64})$/.exec(header.trim());
  return match ? match[1] : null;
}
