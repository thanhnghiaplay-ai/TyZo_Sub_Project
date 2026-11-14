export const LINK_WARN = "Link này trông không phải file video trực tiếp. Hãy chọn file từ máy hoặc dùng link .mp4/.mkv công khai.";

const MEDIA_EXT = /\.(mp4|mkv|webm|mov|m4v|avi|flv|wmv|ts|mp3|m4a|aac|wav|flac|ogg|opus|ac3|dts)$/i;

/** null nếu link trông như file video/âm thanh trực tiếp hoặc ô còn trống. */
export function videoLinkProblem(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return LINK_WARN;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return LINK_WARN;
  return MEDIA_EXT.test(parsed.pathname) ? null : LINK_WARN;
}

/** Chỉ chặn khi link hỏng hẳn (không đọc được hoặc không phải http/https). Link lạ nhưng đọc được chỉ cảnh báo. */
export function videoLinkBroken(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol !== "http:" && parsed.protocol !== "https:";
  } catch {
    return true;
  }
}
