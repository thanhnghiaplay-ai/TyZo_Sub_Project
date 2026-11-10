import { createHash, timingSafeEqual } from "node:crypto";

/** So hai khóa bí mật không lộ độ dài hay vị trí khác nhau. Chỉ chạy trên máy chủ: `node:crypto` không có trong trình duyệt. */
export function sameSecret(given: string, expected: string) {
  if (!expected || !given) return false;
  const left = createHash("sha256").update(given).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}
