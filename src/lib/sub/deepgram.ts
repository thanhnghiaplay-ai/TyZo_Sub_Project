import type { Seg } from "@/lib/sub/types";
import { DEEPGRAM_API } from "./provider.ts";

/**
 * Lõi nhận dạng Deepgram. Hàm thuần, không gọi mạng, chạy được trong test Node.
 * Tài liệu: POST /v1/listen, thân JSON {"url": ...} hoặc byte âm thanh. Nova-3 có en, ja, ko, zh.
 * Mặc định của Deepgram là language=en nên PHẢI luôn gửi language.
 */

/** Mã model của app (hiện ở ô chọn, lưu trong phiếu, gói dịch). */
export const DEEPGRAM_ASR = "deepgram-nova-3";
/** Mã Deepgram nhận. */
const DEEPGRAM_MODEL = "nova-3";

export type DgSentence = { start: number; end: number; text: string };

const LANGS: Record<string, string> = { zh: "zh", ko: "ko", ja: "ja", en: "en" };

/** Ngôn ngữ nguồn của app → mã Deepgram. Không rõ thì để Deepgram tự đoán (multi). */
export function deepgramLanguage(language: string): string {
  return LANGS[language.trim().toLowerCase()] ?? "multi";
}

export function deepgramListenUrl(language: string): string {
  const query = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    language: deepgramLanguage(language),
    punctuate: "true",
    smart_format: "true",
    utterances: "true",
  });
  return `${DEEPGRAM_API}/listen?${query.toString()}`;
}

type Word = { word?: string; punctuated_word?: string; start?: number; end?: number };

const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

/** Gộp từng từ thành câu khi Deepgram không trả utterances. */
function sentencesFromWords(words: Word[]): DgSentence[] {
  const out: DgSentence[] = [];
  let text = "";
  let start = 0;
  let end = 0;
  const flush = () => {
    const clean = text.trim();
    if (clean) out.push({ start, end: Math.max(end, start + 0.1), text: clean });
    text = "";
  };
  for (const word of words) {
    const piece = (word.punctuated_word || word.word || "").trim();
    if (!piece || !isNum(word.start) || !isNum(word.end)) continue;
    if (text && word.start - end > 0.8) flush();
    if (!text) start = word.start;
    text += (text ? " " : "") + piece;
    end = word.end;
    if (/[.!?。！？]$/.test(piece) || text.length >= 84) flush();
  }
  flush();
  return out;
}

/** Đọc phản hồi /v1/listen thành câu (giây) và thời lượng (giây). */
export function sentencesFromDeepgram(payload: unknown): { sentences: DgSentence[]; seconds: number } {
  const root = obj(payload);
  const results = obj(root.results);
  const seconds = isNum(obj(root.metadata).duration) ? (obj(root.metadata).duration as number) : 0;
  const utterances = Array.isArray(results.utterances) ? results.utterances : [];
  let sentences: DgSentence[] = utterances
    .map((row) => {
      const item = obj(row);
      const text = typeof item.transcript === "string" ? item.transcript.trim() : "";
      if (!text || !isNum(item.start) || !isNum(item.end)) return null;
      return { start: Math.max(0, item.start), end: Math.max(item.end, item.start + 0.1), text };
    })
    .filter((row): row is DgSentence => row !== null);
  if (!sentences.length) {
    const channels = Array.isArray(results.channels) ? results.channels : [];
    const alts = Array.isArray(obj(channels[0]).alternatives) ? (obj(channels[0]).alternatives as unknown[]) : [];
    const words = Array.isArray(obj(alts[0]).words) ? (obj(alts[0]).words as Word[]) : [];
    sentences = sentencesFromWords(words);
  }
  const last = sentences.length ? sentences[sentences.length - 1].end : 0;
  return { sentences, seconds: seconds || last };
}

/** Câu Deepgram → Seg để dịch. */
export function segsFromDeepgram(sentences: DgSentence[]): Seg[] {
  return sentences
    .map((s) => {
      const text = (s.text || "").trim();
      if (!text) return null;
      const start = Math.max(0, s.start);
      return { start, end: Math.max(start + 0.1, s.end), original: text, raw: text, translation: null } as Seg;
    })
    .filter((s): s is Seg => s !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/** Câu báo lỗi tiếng Việt từ mã HTTP và thân phản hồi lỗi của Deepgram ({err_code, err_msg}). */
export function deepgramErrorText(status: number, payload: unknown): string {
  const row = obj(payload);
  const code = typeof row.err_code === "string" ? row.err_code : "";
  const message = typeof row.err_msg === "string" ? row.err_msg.trim().slice(0, 160) : "";
  if (status === 401 || status === 403) return "Key Deepgram không hợp lệ hoặc chưa được cấp quyền. Kiểm tra lại ở console.deepgram.com.";
  if (status === 402) return "Tài khoản Deepgram hết tín dụng. Hãy nạp thêm hoặc dùng key khác.";
  if (status === 429) return "Deepgram đang giới hạn tốc độ. Chờ một lát rồi chạy lại.";
  if (code === "REMOTE_CONTENT_ERROR") return "Deepgram không tải được link này. Cần link file công khai, mở được không cần đăng nhập.";
  if (code === "UNSUPPORTED_AUDIO" || /unsupported|corrupt/i.test(message)) return "Deepgram không đọc được định dạng file này.";
  if (status >= 500) return "Deepgram đang bận. Hãy thử lại sau.";
  return message ? `Deepgram báo lỗi: ${message}` : `Deepgram từ chối yêu cầu (mã ${status}).`;
}

/** Key khách dán. Không nhận "room" (cửa trả theo lượt chưa chạy Deepgram), khoảng trắng hay độ dài lạ. */
export function cleanDeepgramKey(key: string): string {
  const value = (key || "").trim();
  if (value.length < 20 || value.length > 200 || /\s/.test(value) || value === "room") throw new Error("Key Deepgram không đúng.");
  return value;
}
