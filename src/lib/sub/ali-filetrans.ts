function pageLink(url: string): boolean {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  return (
    /(?:^|\.)((?:youtube|youtu)\.be|youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|facebook\.com|instagram\.com|dailymotion\.com)$/i.test(host) ||
    /youtube\.com|youtu\.be|vimeo\.com|tiktok\.com/i.test(url)
  );
}

/** Nhận dạng cả file từ một link. Không nhận file cắt trên máy. */
export const ALI_FILETRANS_MODEL = "qwen-audio-3.0-asr-flash-filetrans";

/** $0.000035 mỗi giây, niêm yết Singapore trên trang model. */
export const ALI_FILETRANS_USD_PER_SECOND = 0.000035;

export type AliSentence = { start: number; end: number; text: string };

const HINTS = new Set(["zh", "ko", "ja", "en"]);

export function languageHint(language: string): string[] | undefined {
  const code = language.trim().toLowerCase();
  return HINTS.has(code) ? [code] : undefined;
}

function privateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "0.0.0.0" || host === "::" || host === "::1") return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;
  const n = v4.slice(1).map(Number);
  if (n.some((part) => part > 255)) return true;
  const [a, b] = n;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** Link file công khai. Trang xem, luồng và địa chỉ nội bộ thì trả câu lỗi. */
export function directFileUrlProblem(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return "Link không hợp lệ.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "Link phải bắt đầu bằng http:// hoặc https://.";
  if (parsed.username || parsed.password) return "Link không được kèm tài khoản.";
  if (pageLink(parsed.toString())) return "Đây là trang xem, không phải file trực tiếp.";
  if (/\/(xem-phim|watch|phim|play)\b/i.test(parsed.pathname) && !/\.(mp4|mkv|mp3|wav|m4a|webm|aac|flac)(\?|#|$)/i.test(parsed.pathname)) {
    return "Đây là trang xem, không phải file trực tiếp.";
  }
  if (/\.m3u8(\?|#|$)/i.test(parsed.pathname + parsed.search)) return "Link luồng chưa hỗ trợ. Hãy dùng link file trực tiếp.";
  if (privateHost(parsed.hostname)) return "Link này không phải file công khai.";
  return null;
}

const RESULT_HOST = /(^|\.)(aliyuncs\.com|aliyun\.com|alibabacloud\.com|qwencloudapi\.com|qwencloud\.com)$/i;

export function resultUrlProblem(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Kết quả nhận dạng không có địa chỉ hợp lệ.";
  }
  if (parsed.protocol !== "https:") return "Kết quả nhận dạng không mở được.";
  if (parsed.username || parsed.password || privateHost(parsed.hostname)) return "Kết quả nhận dạng không mở được.";
  if (!RESULT_HOST.test(parsed.hostname)) return "Kết quả nhận dạng nằm ngoài nhà cung cấp.";
  return null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Mốc trong JSON là mili-giây. */
export function sentencesFromTranscript(payload: unknown): { sentences: AliSentence[]; seconds: number } {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const transcripts = Array.isArray(root.transcripts) ? root.transcripts : [];
  const sentences: AliSentence[] = [];
  for (const transcript of transcripts) {
    const rows = transcript && typeof transcript === "object" ? (transcript as Record<string, unknown>).sentences : null;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      const text = typeof item.text === "string" ? item.text.trim() : "";
      const begin = num(item.begin_time);
      const end = num(item.end_time);
      if (!text || begin === null || end === null) continue;
      const start = Math.max(0, begin / 1000);
      const stop = Math.max(start + 0.2, end / 1000);
      sentences.push({ start, end: stop, text });
    }
  }
  sentences.sort((a, b) => a.start - b.start || a.end - b.end);
  const properties = root.properties && typeof root.properties === "object" ? (root.properties as Record<string, unknown>) : {};
  const original = num(properties.original_duration_in_milliseconds);
  const last = sentences.length ? sentences[sentences.length - 1].end : 0;
  const seconds = original && original > 0 ? original / 1000 : last;
  return { sentences, seconds: Math.max(seconds, last) };
}
