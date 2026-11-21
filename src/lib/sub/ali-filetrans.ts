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

/** Workspace mặc định (vùng Singapore) khi Chủ chưa đặt Workspace ID. */
export const ALI_FILETRANS_DEFAULT_WORKSPACE = "ws-u3mqeygepiyqd77d";

function okWorkspaceId(value: string | undefined | null): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{2,62}$/i.test(value.trim());
}

/** Địa chỉ nhận dạng file theo Workspace. ID sai dạng hoặc trống thì dùng Workspace mặc định. */
export function filetransWorkspace(workspaceId?: string | null): string {
  return okWorkspaceId(workspaceId) ? workspaceId.trim().toLowerCase() : ALI_FILETRANS_DEFAULT_WORKSPACE;
}

export function filetransOrigin(workspaceId?: string | null): string {
  return `https://${filetransWorkspace(workspaceId)}.ap-southeast-1.maas.aliyuncs.com`;
}

/** Đổi lỗi tiếng Anh của Alibaba thành lời chỉ đúng chỗ cần sửa. Lỗi khác giữ nguyên. */
export function aliErrorText(message: string, workspaceId?: string | null): string {
  if (/workspace endpoint access denied/i.test(message)) {
    return `Alibaba từ chối: key Alibaba không thuộc Workspace ${filetransWorkspace(workspaceId)}. Admin cần lưu key tạo trong đúng Workspace này, hoặc đổi Workspace ID ở Admin, Cấu hình cho khớp key.`;
  }
  if (/model access denied/i.test(message)) {
    return `Alibaba từ chối: key chưa được quyền dùng model ${ALI_FILETRANS_MODEL}. Key và Workspace đã khớp. Admin cần vào Model Studio (vùng Singapore), Workspace ${filetransWorkspace(workspaceId)}, bật quyền cho model này (hoặc chọn quyền toàn bộ model khi tạo key) và kiểm tra dịch vụ đã kích hoạt, còn hạn mức.`;
  }
  return message;
}

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

const BREAK_MARKS = /[，,。.！!？?；;…、]/;
const WORD_GAP_MS = 500;
const MIN_VISIBLE_CHARS = 2;

function visibleLength(text: string): number {
  return text.replace(/[\s，,。.！!？?；;…、:："“”"'‘’()（）\-—]/g, "").length;
}

function tidyPiece(text: string): string {
  return text.trim().replace(/[，,、；;\s]+$/g, "").trim();
}

/** Gộp mảnh quá ngắn (dưới 2 ký tự nhìn thấy) vào mảnh liền trước, hoặc mảnh liền sau nếu là mảnh đầu. */
function mergeTiny(pieces: AliSentence[]): AliSentence[] {
  const out: AliSentence[] = [];
  for (const piece of pieces) {
    if (visibleLength(piece.text) < MIN_VISIBLE_CHARS && out.length) {
      const prev = out[out.length - 1];
      out[out.length - 1] = { start: prev.start, end: Math.max(prev.end, piece.end), text: `${prev.text} ${piece.text}`.trim() };
    } else {
      out.push(piece);
    }
  }
  if (out.length > 1 && visibleLength(out[0].text) < MIN_VISIBLE_CHARS) {
    const [first, second, ...rest] = out;
    return [{ start: first.start, end: Math.max(first.end, second.end), text: `${first.text} ${second.text}`.trim() }, ...rest];
  }
  return out;
}

/**
 * Alibaba hay gộp nhiều câu liền nhau (lời thoại không có quãng lặng) thành một «câu» dài.
 * Tách lại theo dấu câu, ưu tiên mốc từng từ (words) nếu có, ngắt thêm khi hai từ cách nhau từ 0,5 giây.
 * Câu không có chỗ ngắt thì giữ nguyên.
 */
export function splitLongSentence(item: Record<string, unknown>, text: string, begin: number, end: number): AliSentence[] {
  const whole: AliSentence = { start: Math.max(0, begin / 1000), end: Math.max(begin / 1000 + 0.2, end / 1000), text };
  const words = Array.isArray(item.words) ? item.words : [];
  const usable = words
    .map((w) => (w && typeof w === "object" ? (w as Record<string, unknown>) : null))
    .filter((w): w is Record<string, unknown> => !!w && typeof w.text === "string" && num(w.begin_time) !== null && num(w.end_time) !== null);
  let pieces: AliSentence[] = [];
  if (usable.length > 1) {
    let buf = "";
    let from = 0;
    let to = 0;
    const flush = () => {
      const cleaned = tidyPiece(buf);
      if (cleaned) pieces.push({ start: Math.max(0, from / 1000), end: Math.max(from / 1000 + 0.2, to / 1000), text: cleaned });
      buf = "";
    };
    usable.forEach((w, index) => {
      const wBegin = num(w.begin_time) as number;
      const wEnd = num(w.end_time) as number;
      if (buf && wBegin - to >= WORD_GAP_MS) flush();
      if (!buf) from = wBegin;
      const mark = typeof w.punctuation === "string" ? w.punctuation : "";
      buf += `${w.text as string}${mark}`;
      to = wEnd;
      if (BREAK_MARKS.test(mark) || index === usable.length - 1) flush();
    });
  } else {
    const parts = text.match(/[^，,。.！!？?；;…]+[，,。.！!？?；;…]*/g) ?? [];
    const total = parts.reduce((sum, part) => sum + Math.max(1, visibleLength(part)), 0);
    let cursor = begin;
    for (const part of parts) {
      const cleaned = tidyPiece(part);
      const share = (Math.max(1, visibleLength(part)) / Math.max(1, total)) * (end - begin);
      if (cleaned) pieces.push({ start: Math.max(0, cursor / 1000), end: Math.max(cursor / 1000 + 0.2, (cursor + share) / 1000), text: cleaned });
      cursor += share;
    }
  }
  pieces = mergeTiny(pieces);
  return pieces.length > 1 ? pieces : [whole];
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
      sentences.push(...splitLongSentence(item, text, begin, end));
    }
  }
  sentences.sort((a, b) => a.start - b.start || a.end - b.end);
  const properties = root.properties && typeof root.properties === "object" ? (root.properties as Record<string, unknown>) : {};
  const original = num(properties.original_duration_in_milliseconds);
  const last = sentences.length ? sentences[sentences.length - 1].end : 0;
  const seconds = original && original > 0 ? original / 1000 : last;
  return { sentences, seconds: Math.max(seconds, last) };
}
