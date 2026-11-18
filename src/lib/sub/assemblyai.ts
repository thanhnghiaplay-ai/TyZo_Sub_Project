import type { Seg } from "@/lib/sub/types";

/**
 * Lõi nhận dạng AssemblyAI. Hàm thuần, không gọi mạng, chạy được trong test Node.
 * Tài liệu (đã tra 18/11/2026): POST /v2/transcript với `audio_url` và `speech_models` (BẮT BUỘC),
 * rồi GET /v2/transcript/{id} tới khi status là completed hoặc error. Giờ của từng từ tính bằng MILLI GIÂY,
 * `audio_duration` tính bằng GIÂY. Ví dụ phản hồi trong test dựng theo tài liệu, chưa đối chiếu với phản hồi key thật.
 */

/** Mã model của app (hiện ở ô chọn, lưu trong phiếu, gói dịch). */
export const ASSEMBLYAI_PRO_ASR = "assemblyai-universal-3-5-pro";
export const ASSEMBLYAI_V2_ASR = "assemblyai-universal-2";
export const ASSEMBLYAI_ASR_IDS = [ASSEMBLYAI_PRO_ASR, ASSEMBLYAI_V2_ASR] as const;

/** Mã model AssemblyAI nhận, theo mã của app. Không phải model AssemblyAI thì trả chuỗi rỗng. */
export function assemblyaiModel(appId: string): string {
  if (appId === ASSEMBLYAI_PRO_ASR) return "universal-3-5-pro";
  if (appId === ASSEMBLYAI_V2_ASR) return "universal-2";
  return "";
}

const LANGS: Record<string, string> = { zh: "zh", ko: "ko", ja: "ja", en: "en" };
const CJK = new Set(["zh", "ko", "ja"]);

/** Ngôn ngữ nguồn của app → mã AssemblyAI. Không rõ thì null: để AssemblyAI tự nhận (language_detection). */
export function assemblyaiLanguage(language: string): string | null {
  return LANGS[(language || "").trim().toLowerCase()] ?? null;
}

export type AaiSentence = { start: number; end: number; text: string };

export type AssemblyaiSubmit = {
  audio_url: string;
  speech_models: string[];
  language_code?: string;
  language_detection?: boolean;
  punctuate: boolean;
  format_text: boolean;
};

/**
 * Thân gửi POST /v2/transcript. `speech_models` là danh sách ưu tiên: model Pro lùi về Universal-2 khi ngôn ngữ không được hỗ trợ.
 * Luôn gửi ngôn ngữ (hoặc bật tự nhận), không để mặc định.
 */
export function assemblyaiSubmitBody(input: { audioUrl: string; appModel: string; language: string }): AssemblyaiSubmit {
  const model = assemblyaiModel(input.appModel);
  if (!model) throw new Error("Model không phải của AssemblyAI.");
  const url = (input.audioUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("AssemblyAI cần link file công khai (http hoặc https).");
  const code = assemblyaiLanguage(input.language);
  const body: AssemblyaiSubmit = {
    audio_url: url,
    speech_models: model === "universal-2" ? ["universal-2"] : [model, "universal-2"],
    punctuate: true,
    format_text: true,
  };
  if (code) body.language_code = code;
  else body.language_detection = true;
  return body;
}

export type AaiStatus = "queued" | "processing" | "completed" | "error" | "unknown";

const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

/** Trạng thái của một bản phiên âm, đọc từ phản hồi POST hoặc GET. */
export function assemblyaiStatus(payload: unknown): AaiStatus {
  const value = obj(payload).status;
  return value === "queued" || value === "processing" || value === "completed" || value === "error" ? value : "unknown";
}

/** Mã bản phiên âm (để hỏi lại bằng GET). Rỗng nếu phản hồi không có. */
export function assemblyaiId(payload: unknown): string {
  const value = obj(payload).id;
  return typeof value === "string" ? value.trim() : "";
}

type Word = { text?: unknown; start?: unknown; end?: unknown };

const STOP = /[.!?。！？…]$/;

/** Gộp từng từ thành câu. Tiếng Trung, Nhật, Hàn không có khoảng trắng giữa từ nên nối liền. */
function sentencesFromWords(words: Word[], cjk: boolean): AaiSentence[] {
  const out: AaiSentence[] = [];
  const longest = cjk ? 36 : 84;
  let text = "";
  let start = 0;
  let end = 0;
  const flush = () => {
    const clean = text.trim();
    if (clean) out.push({ start, end: Math.max(end, start + 0.1), text: clean });
    text = "";
  };
  for (const word of words) {
    const piece = typeof word.text === "string" ? word.text.trim() : "";
    if (!piece || !isNum(word.start) || !isNum(word.end)) continue;
    const from = word.start / 1000;
    const to = word.end / 1000;
    if (text && from - end > 0.8) flush();
    if (!text) start = from;
    text += (text && !cjk ? " " : "") + piece;
    end = to;
    if (STOP.test(piece) || text.length >= longest) flush();
  }
  flush();
  return out;
}

/** Đọc bản phiên âm đã xong thành câu (giây) và thời lượng (giây). `language` là mã ngôn ngữ nguồn của app, dùng để biết có nối từ liền không. */
export function sentencesFromAssemblyai(payload: unknown, language = ""): { sentences: AaiSentence[]; seconds: number } {
  const root = obj(payload);
  const detected = typeof root.language_code === "string" ? root.language_code.toLowerCase().slice(0, 2) : "";
  const cjk = CJK.has((language || "").trim().toLowerCase()) || CJK.has(detected);
  const words = Array.isArray(root.words) ? (root.words as Word[]) : [];
  let sentences = sentencesFromWords(words, cjk);
  if (!sentences.length) {
    const utterances = Array.isArray(root.utterances) ? root.utterances : [];
    sentences = utterances
      .map((row) => {
        const item = obj(row);
        const text = typeof item.text === "string" ? item.text.trim() : "";
        if (!text || !isNum(item.start) || !isNum(item.end)) return null;
        const start = Math.max(0, item.start / 1000);
        return { start, end: Math.max(item.end / 1000, start + 0.1), text };
      })
      .filter((row): row is AaiSentence => row !== null);
  }
  const last = sentences.length ? sentences[sentences.length - 1].end : 0;
  return { sentences, seconds: isNum(root.audio_duration) && root.audio_duration > 0 ? root.audio_duration : last };
}

/** Câu AssemblyAI → Seg để dịch. */
export function segsFromAssemblyai(sentences: AaiSentence[]): Seg[] {
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

/** Câu báo lỗi tiếng Việt từ mã HTTP và thân lỗi của AssemblyAI ({"error": "..."}), cũng dùng cho bản phiên âm có status error. */
export function assemblyaiErrorText(status: number, payload: unknown): string {
  const raw = obj(payload).error;
  const message = typeof raw === "string" ? raw.trim().slice(0, 200) : "";
  if (status === 401 || status === 403) return "Key AssemblyAI không hợp lệ hoặc chưa được cấp quyền. Kiểm tra lại ở assemblyai.com/dashboard.";
  if (status === 402 || /insufficient|credit|balance|billing/i.test(message)) return "Tài khoản AssemblyAI hết tín dụng. Hãy nạp thêm hoặc dùng key khác.";
  if (status === 429) return "AssemblyAI đang giới hạn tốc độ. Chờ một lát rồi chạy lại.";
  if (/download|unable to access|not accessible|url/i.test(message)) return "AssemblyAI không tải được link này. Cần link file công khai, mở được không cần đăng nhập.";
  if (/does not appear to contain|no audio|unsupported|corrupt|invalid file/i.test(message)) return "AssemblyAI không đọc được định dạng file này.";
  if (/language/i.test(message)) return "AssemblyAI không nhận ra ngôn ngữ của file này. Hãy chọn ngôn ngữ gốc rồi chạy lại.";
  if (status >= 500) return "AssemblyAI đang bận. Hãy thử lại sau.";
  return message ? `AssemblyAI báo lỗi: ${message}` : `AssemblyAI từ chối yêu cầu (mã ${status}).`;
}

/** Key khách dán. Không nhận "room", khoảng trắng hay độ dài lạ. */
export function cleanAssemblyaiKey(key: string): string {
  const value = (key || "").trim();
  if (value.length < 20 || value.length > 200 || /\s/.test(value) || value === "room") throw new Error("Key AssemblyAI không đúng.");
  return value;
}
