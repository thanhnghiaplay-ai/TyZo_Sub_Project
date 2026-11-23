/**
 * Liên kết ứng dụng Android với tài khoản. Hàm thuần, không import máy chủ.
 *
 * Mã liên kết: 8 ký tự, bỏ chữ dễ nhầm (0/O, 1/I/L), hiện dạng ABCD-EFGH, sống 10 phút, dùng một lần.
 * Khóa máy: 32 byte ngẫu nhiên, ứng dụng giữ, máy chủ chỉ lưu băm.
 */
export const LINK_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LINK_CODE_LENGTH = 8;
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
export const ANDROID_APP = { code: 11, name: "0.11" } as const;

/**
 * Nơi GitHub Actions đăng tệp cài (bản phát hành mới nhất của kho, ai cũng tải được).
 * Mỗi bản phát hành có tyzo-sub.apk và tyzo-sub.json ({"code": 5, "name": "0.5"}).
 */
const ANDROID_RELEASE_BASE = "https://github.com/thanhnghiaplay-ai/TyZo_Sub_Project/releases/latest/download";
export const ANDROID_APK_LATEST = `${ANDROID_RELEASE_BASE}/tyzo-sub.apk`;
export const ANDROID_INFO_LATEST = `${ANDROID_RELEASE_BASE}/tyzo-sub.json`;

export type AndroidRelease = { code: number; name: string; url: string };

/** Đọc tyzo-sub.json của bản phát hành. null khi sai dạng. */
export function parseReleaseInfo(raw: unknown): { code: number; name: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const code = Number(row.code);
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!Number.isInteger(code) || code < 1 || code > 100000 || !/^[0-9][0-9A-Za-z.-]{0,19}$/.test(name)) return null;
  return { code, name };
}

/**
 * Bản ứng dụng web báo cho khách. Có ANDROID_APK_URL thì dùng địa chỉ đó (số bản theo mã);
 * không có thì dùng bản phát hành trên GitHub (số bản theo tyzo-sub.json); chưa phát hành thì không có đường tải.
 */
export function pickRelease(envUrl: string, released: { code: number; name: string } | null): AndroidRelease {
  if (envUrl) return { code: ANDROID_APP.code, name: ANDROID_APP.name, url: envUrl };
  if (released) return { ...released, url: ANDROID_APK_LATEST };
  return { code: ANDROID_APP.code, name: ANDROID_APP.name, url: "" };
}

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
