import type { Seg } from "@/lib/sub/types";

/**
 * Lõi nhận dạng Speechmatics (máy chủ batch). Hàm thuần, không gọi mạng, chạy được trong test Node.
 * Tài liệu (đã tra 18/11/2026): POST {vùng}/v2/jobs (multipart, trường `config` là JSON; tải file bằng `fetch_data.url`
 * trong config), trả HTTP 201 kèm `id`; GET /jobs/{id} cho `job.status` (running, done, rejected, deleted, expired);
 * GET /jobs/{id}/transcript?format=json-v2 trả `results[]` (mỗi mục `type` word hoặc punctuation, `start_time`, `end_time`
 * tính bằng GIÂY, `alternatives[0].content`; dấu câu có `is_eos` và `attaches_to`); DELETE /jobs/{id} xóa job.
 * CHƯA ĐỐI CHIẾU với phản hồi key thật. Hai điểm tài liệu chưa rõ, đã tách thành hằng số để sửa một chỗ:
 * tên trường chọn model (đang dùng `operating_point`) và mã tiếng Trung (đang dùng `cmn`).
 */

/** Mã model của app (hiện ở ô chọn, lưu trong phiếu, gói dịch). */
export const SPEECHMATICS_STANDARD_ASR = "speechmatics-standard";
export const SPEECHMATICS_ENHANCED_ASR = "speechmatics-enhanced";

/** Tên trường trong `transcription_config` để chọn mức model (standard hoặc enhanced). */
export const SPEECHMATICS_MODEL_FIELD = "operating_point";

/** Mã model Speechmatics nhận, theo mã của app. Không phải model Speechmatics thì trả chuỗi rỗng. */
export function speechmaticsModel(appId: string): string {
  if (appId === SPEECHMATICS_STANDARD_ASR) return "standard";
  if (appId === SPEECHMATICS_ENHANCED_ASR) return "enhanced";
  return "";
}

const LANGS: Record<string, string> = { zh: "cmn", ko: "ko", ja: "ja", en: "en" };
const CJK = new Set(["zh", "cmn", "ko", "ja"]);

/** Ngôn ngữ nguồn của app → mã Speechmatics. Speechmatics cần biết ngôn ngữ, lạ thì null (người dùng phải chọn). */
export function speechmaticsLanguage(language: string): string | null {
  return LANGS[(language || "").trim().toLowerCase()] ?? null;
}

export type SmSentence = { start: number; end: number; text: string };

export type SpeechmaticsConfig = {
  type: "transcription";
  transcription_config: { language: string } & Record<string, string>;
  fetch_data: { url: string };
};

/** `config` gửi kèm POST /v2/jobs. Link phải công khai; không gửi file, không gửi header đăng nhập của khách. */
export function speechmaticsJobConfig(input: { audioUrl: string; appModel: string; language: string }): SpeechmaticsConfig {
  const model = speechmaticsModel(input.appModel);
  if (!model) throw new Error("Model không phải của Speechmatics.");
  const url = (input.audioUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("Speechmatics cần link file công khai (http hoặc https).");
  const code = speechmaticsLanguage(input.language);
  if (!code) throw new Error("Speechmatics cần biết ngôn ngữ gốc của file. Hãy chọn ngôn ngữ gốc rồi chạy lại.");
  return {
    type: "transcription",
    transcription_config: { language: code, [SPEECHMATICS_MODEL_FIELD]: model },
    fetch_data: { url },
  };
}

export type SmStatus = "running" | "done" | "rejected" | "deleted" | "expired" | "unknown";

const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

/** Trạng thái job, đọc từ GET /jobs/{id} (`job.status`). Phản hồi phẳng `status` cũng nhận. */
export function speechmaticsStatus(payload: unknown): SmStatus {
  const root = obj(payload);
  const value = obj(root.job).status ?? root.status;
  return value === "running" || value === "done" || value === "rejected" || value === "deleted" || value === "expired" ? value : "unknown";
}

/** Mã job (để hỏi lại bằng GET). POST trả `id`; GET trả `job.id`. Rỗng nếu phản hồi không có. */
export function speechmaticsId(payload: unknown): string {
  const root = obj(payload);
  const value = root.id ?? obj(root.job).id;
  return typeof value === "string" ? value.trim() : "";
}

type Item = {
  type?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  is_eos?: unknown;
  attaches_to?: unknown;
  alternatives?: unknown;
};

function contentOf(item: Item): string {
  const list = Array.isArray(item.alternatives) ? item.alternatives : [];
  const first = obj(list[0]).content;
  return typeof first === "string" ? first.trim() : "";
}

/** Gộp từng từ và dấu câu thành câu. Tiếng Trung, Nhật, Hàn không có khoảng trắng giữa từ nên nối liền. */
function sentencesFromItems(items: Item[], cjk: boolean): SmSentence[] {
  const out: SmSentence[] = [];
  const longest = cjk ? 36 : 84;
  let text = "";
  let start = 0;
  let end = 0;
  const flush = () => {
    const clean = text.trim();
    if (clean) out.push({ start, end: Math.max(end, start + 0.1), text: clean });
    text = "";
  };
  for (const item of items) {
    const piece = contentOf(item);
    if (!piece) continue;
    if (item.type === "punctuation") {
      if (!text) continue;
      const before = item.attaches_to === "next" ? " " : "";
      text += before + piece;
      if (isNum(item.end_time)) end = Math.max(end, item.end_time);
      if (item.is_eos === true) flush();
      continue;
    }
    if (item.type !== "word" && item.type !== "entity") continue;
    if (!isNum(item.start_time) || !isNum(item.end_time)) continue;
    if (text && item.start_time - end > 0.8) flush();
    if (!text) start = item.start_time;
    text += (text && !cjk ? " " : "") + piece;
    end = item.end_time;
    if (text.length >= longest) flush();
  }
  flush();
  return out;
}

/**
 * Đọc transcript json-v2 thành câu (giây) và thời lượng (giây). `language` là mã ngôn ngữ nguồn của app,
 * dùng để biết có nối từ liền không. Thời lượng lấy `job.duration`, thiếu thì lấy giờ kết thúc câu cuối.
 */
export function sentencesFromSpeechmatics(payload: unknown, language = ""): { sentences: SmSentence[]; seconds: number } {
  const root = obj(payload);
  const cjk = CJK.has((language || "").trim().toLowerCase());
  const items = Array.isArray(root.results) ? (root.results as Item[]) : [];
  const sentences = sentencesFromItems(items, cjk);
  const last = sentences.length ? sentences[sentences.length - 1].end : 0;
  const duration = obj(root.job).duration;
  return { sentences, seconds: isNum(duration) && duration > 0 ? duration : last };
}

/** Câu Speechmatics → Seg để dịch. */
export function segsFromSpeechmatics(sentences: SmSentence[]): Seg[] {
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

/** Lý do job bị từ chối, đọc từ `job.errors[].message` của GET /jobs/{id}. Rỗng nếu không có. */
export function speechmaticsJobProblem(payload: unknown): string {
  const errors = obj(obj(payload).job).errors;
  if (!Array.isArray(errors)) return "";
  const message = obj(errors[0]).message;
  return typeof message === "string" ? message.trim().slice(0, 200) : "";
}

/** Câu báo lỗi tiếng Việt từ mã HTTP và thân lỗi (`error`, `detail`) hoặc lý do job bị từ chối. */
export function speechmaticsErrorText(status: number, payload: unknown): string {
  const root = obj(payload);
  const raw = root.detail ?? root.error ?? speechmaticsJobProblem(payload);
  const message = typeof raw === "string" ? raw.trim().slice(0, 200) : "";
  if (status === 401 || status === 403) return "Key Speechmatics không hợp lệ hoặc không đúng vùng. Kiểm tra lại ở portal.speechmatics.com.";
  if (status === 402 || /quota|credit|balance|billing|insufficient/i.test(message)) return "Tài khoản Speechmatics hết hạn mức. Hãy nạp thêm hoặc dùng key khác.";
  if (status === 429) return "Speechmatics đang giới hạn tốc độ. Chờ một lát rồi chạy lại.";
  if (/fetch|download|url|unable to access|http/i.test(message)) return "Speechmatics không tải được link này. Cần link file công khai, mở được không cần đăng nhập.";
  if (/unsupported|invalid.*(audio|file|format)|no audio|corrupt/i.test(message)) return "Speechmatics không đọc được định dạng file này.";
  if (/language/i.test(message)) return "Speechmatics không nhận ngôn ngữ này. Hãy chọn ngôn ngữ gốc khác rồi chạy lại.";
  if (status >= 500) return "Speechmatics đang bận. Hãy thử lại sau.";
  return message ? `Speechmatics báo lỗi: ${message}` : `Speechmatics từ chối yêu cầu (mã ${status}).`;
}

/** Key khách dán. Không nhận "room", khoảng trắng hay độ dài lạ. */
export function cleanSpeechmaticsKey(key: string): string {
  const value = (key || "").trim();
  if (value.length < 20 || value.length > 200 || /\s/.test(value) || value === "room") throw new Error("Key Speechmatics không đúng.");
  return value;
}
