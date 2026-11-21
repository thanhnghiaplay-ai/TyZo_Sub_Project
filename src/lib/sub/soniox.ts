import type { Seg } from "@/lib/sub/types";

/**
 * Lõi nhận dạng Soniox (máy chủ bất đồng bộ). Hàm thuần, không gọi mạng, chạy được trong test Node.
 * Hình dạng API theo tài liệu và ghi chú bước 1 (18/11/2026), CHƯA ĐỐI CHIẾU với phản hồi key thật (trang docs
 * không mở được từ môi trường làm việc): POST /v1/transcriptions (Bearer) với `model`, `audio_url`, `language_hints`,
 * `enable_language_identification`; trả `id` và `status` (queued, processing, completed, error);
 * GET /v1/transcriptions/{id} cho `status`, `audio_duration_ms`, `error_message`; GET /v1/transcriptions/{id}/transcript
 * trả `tokens[]` (`text` có thể bắt đầu bằng khoảng trắng, `start_ms`, `end_ms` tính bằng MILI GIÂY, `confidence`,
 * `translation_status` original, translation hoặc none); DELETE /v1/transcriptions/{id} xóa bản phiên âm.
 * Tên model gửi API tách thành hằng số để sửa một chỗ (docs ghi stt-async-v5, Chủ thấy giới thiệu STT v6).
 */

/** Mã model của app (hiện ở ô chọn, lưu trong phiếu, gói dịch). */
export const SONIOX_ASYNC_ASR = "soniox-stt-async";
export const SONIOX_ASR_IDS = [SONIOX_ASYNC_ASR] as const;

/** Tên model gửi cho Soniox. Kiểm danh sách /models khi có key thật rồi sửa tại đây nếu lệch. */
export const SONIOX_API_MODEL = "stt-async-v5";

/** Mã model Soniox nhận, theo mã của app. Không phải model Soniox thì trả chuỗi rỗng. */
export function sonioxModel(appId: string): string {
  return appId === SONIOX_ASYNC_ASR ? SONIOX_API_MODEL : "";
}

const LANGS = new Set(["zh", "ko", "ja", "en"]);
const CJK = new Set(["zh", "ko", "ja"]);

/** Ngôn ngữ nguồn của app → mã gợi ý Soniox. Lạ thì null = để Soniox tự nhận diện ngôn ngữ. */
export function sonioxLanguage(language: string): string | null {
  const code = (language || "").trim().toLowerCase();
  return LANGS.has(code) ? code : null;
}

export type SonioxSentence = { start: number; end: number; text: string };

export type SonioxBody = {
  model: string;
  audio_url: string;
  language_hints?: string[];
  enable_language_identification: boolean;
};

/** Thân POST /v1/transcriptions. Link phải công khai; không gửi file, không gửi header đăng nhập của khách. */
export function sonioxSubmitBody(input: { audioUrl: string; appModel: string; language: string }): SonioxBody {
  const model = sonioxModel(input.appModel);
  if (!model) throw new Error("Model không phải của Soniox.");
  const url = (input.audioUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("Soniox cần link file công khai (http hoặc https).");
  const code = sonioxLanguage(input.language);
  return code
    ? { model, audio_url: url, language_hints: [code], enable_language_identification: false }
    : { model, audio_url: url, enable_language_identification: true };
}

export type SonioxStatus = "queued" | "processing" | "completed" | "error" | "unknown";

const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

/** Trạng thái bản phiên âm, đọc từ phản hồi POST hoặc GET /v1/transcriptions/{id}. */
export function sonioxStatus(payload: unknown): SonioxStatus {
  const value = obj(payload).status;
  return value === "queued" || value === "processing" || value === "completed" || value === "error" ? value : "unknown";
}

/** Mã bản phiên âm (để hỏi lại bằng GET). Rỗng nếu phản hồi không có. */
export function sonioxId(payload: unknown): string {
  const value = obj(payload).id;
  return typeof value === "string" ? value.trim() : "";
}

/** Lý do lỗi khi status = error (`error_message`). Rỗng nếu không có. */
export function sonioxJobProblem(payload: unknown): string {
  const message = obj(payload).error_message;
  return typeof message === "string" ? message.trim().slice(0, 200) : "";
}

type Token = { text?: unknown; start_ms?: unknown; end_ms?: unknown; translation_status?: unknown };

const END_MARK = /[.!?。！？…]\s*$/u;

/** Gộp token (mảnh từ) thành câu. Chữ đã có khoảng trắng đầu mảnh nên nối thẳng, tiếng Trung, Nhật, Hàn cũng nối liền. */
function sentencesFromTokens(tokens: Token[], cjk: boolean): SonioxSentence[] {
  const out: SonioxSentence[] = [];
  const longest = cjk ? 36 : 84;
  let text = "";
  let start = 0;
  let end = 0;
  const flush = () => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean) out.push({ start, end: Math.max(end, start + 0.1), text: clean });
    text = "";
  };
  for (const token of tokens) {
    if (token.translation_status === "translation") continue;
    const piece = typeof token.text === "string" ? token.text : "";
    if (!piece.trim() || !isNum(token.start_ms) || !isNum(token.end_ms)) continue;
    const from = token.start_ms / 1000;
    const to = token.end_ms / 1000;
    if (text && from - end > 0.8) flush();
    if (!text) start = from;
    text += piece;
    end = to;
    if (END_MARK.test(piece) || text.length >= longest) flush();
  }
  flush();
  return out;
}

/**
 * Đọc transcript thành câu (giây) và thời lượng (giây). Thời lượng lấy `audio_duration_ms` nếu phản hồi có
 * (người gọi có thể gộp thêm từ GET /transcriptions/{id}), thiếu thì lấy giờ kết thúc câu cuối.
 */
export function sentencesFromSoniox(payload: unknown, language = ""): { sentences: SonioxSentence[]; seconds: number } {
  const root = obj(payload);
  const cjk = CJK.has((language || "").trim().toLowerCase());
  const tokens = Array.isArray(root.tokens) ? (root.tokens as Token[]) : [];
  const sentences = sentencesFromTokens(tokens, cjk);
  const last = sentences.length ? sentences[sentences.length - 1].end : 0;
  const duration = root.audio_duration_ms;
  return { sentences, seconds: isNum(duration) && duration > 0 ? duration / 1000 : last };
}

/** Câu Soniox → Seg để dịch. */
export function segsFromSoniox(sentences: SonioxSentence[]): Seg[] {
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

/** Câu báo lỗi tiếng Việt từ mã HTTP và thân lỗi (`error_message`, `message`, `detail`) hoặc lý do bản phiên âm lỗi. */
export function sonioxErrorText(status: number, payload: unknown): string {
  const root = obj(payload);
  const raw = root.error_message ?? root.message ?? root.detail ?? root.error;
  const message = typeof raw === "string" ? raw.trim().slice(0, 200) : "";
  if (status === 401 || status === 403) return "Key Soniox không hợp lệ hoặc không có quyền. Kiểm tra lại ở console.soniox.com.";
  if (status === 402 || /quota|credit|balance|billing|insufficient|payment/i.test(message)) return "Tài khoản Soniox hết hạn mức hoặc chưa nạp tiền. Hãy nạp thêm hoặc dùng key khác.";
  if (status === 429) return "Soniox đang giới hạn tốc độ. Chờ một lát rồi chạy lại.";
  if (/fetch|download|url|unable to access|http/i.test(message)) return "Soniox không tải được link này. Cần link file công khai, mở được không cần đăng nhập.";
  if (/unsupported|invalid.*(audio|file|format)|no audio|corrupt|decode/i.test(message)) return "Soniox không đọc được định dạng file này.";
  if (/model/i.test(message)) return "Soniox không nhận model này. Admin cần kiểm tên model ở danh sách model của Soniox.";
  if (status >= 500) return "Soniox đang bận. Hãy thử lại sau.";
  return message ? `Soniox báo lỗi: ${message}` : `Soniox từ chối yêu cầu (mã ${status}).`;
}

/** Key khách dán. Không nhận "room", khoảng trắng hay độ dài lạ. */
export function cleanSonioxKey(key: string): string {
  const value = (key || "").trim();
  if (value.length < 20 || value.length > 200 || /\s/.test(value) || value === "room") throw new Error("Key Soniox không đúng.");
  return value;
}
