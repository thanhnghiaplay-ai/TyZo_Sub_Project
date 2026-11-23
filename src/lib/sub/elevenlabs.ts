import type { Seg } from "@/lib/sub/types";

/**
 * Lõi nhận dạng ElevenLabs (Scribe). Hàm thuần, không gọi mạng, chạy được trong test Node.
 * Theo tài liệu chính thức (đọc 21/11/2026, CHƯA đối chiếu với phản hồi key thật):
 * POST /v1/speech-to-text, multipart/form-data, header `xi-api-key`. Trường: `model_id` (scribe_v3, scribe_v2),
 * đúng một trong `file` hoặc `source_url` (link công khai; `cloud_storage_url` cũ đã bị đánh dấu bỏ, link dưới 2 GB),
 * `language_code` (ISO-639-1, bỏ trống = tự nhận), `tag_audio_events`, `timestamps_granularity`.
 * Trả kết quả ngay trong một yêu cầu: `language_code`, `text`, `words[]` (`text`, `start`, `end` theo GIÂY,
 * `type` word, spacing hoặc audio_event), có thể kèm `audio_duration_secs`. Lỗi kiểm dữ liệu 422 `{detail: [{msg}]}`,
 * lỗi khác thường dạng `{detail: {status, message}}`.
 * Phản hồi có `transcription_id`: phòng gửi DELETE /v1/speech-to-text/transcripts/{id} ngay sau khi đọc xong (như các nhà khác).
 */

/** Mã model của app (hiện ở ô chọn, lưu trong phiếu, gói dịch). */
export const ELEVENLABS_V3_ASR = "elevenlabs-scribe-v3";
export const ELEVENLABS_V2_ASR = "elevenlabs-scribe-v2";

const API_MODEL: Record<string, string> = { [ELEVENLABS_V3_ASR]: "scribe_v3", [ELEVENLABS_V2_ASR]: "scribe_v2" };

/** Mã model ElevenLabs nhận, theo mã của app. Không phải model ElevenLabs thì trả chuỗi rỗng. */
export function elevenlabsModel(appId: string): string {
  return Object.prototype.hasOwnProperty.call(API_MODEL, appId) ? API_MODEL[appId] : "";
}

const LANGS = new Set(["zh", "ko", "ja", "en"]);
const CJK = new Set(["zh", "ko", "ja", "zho", "kor", "jpn", "cmn", "yue"]);

/** Ngôn ngữ nguồn của app → `language_code`. Lạ thì null = để ElevenLabs tự nhận ngôn ngữ. */
export function elevenlabsLanguage(language: string): string | null {
  const code = (language || "").trim().toLowerCase();
  return LANGS.has(code) ? code : null;
}

export type ElevenlabsSentence = { start: number; end: number; text: string };

/**
 * Các trường của form gửi đi (tên, giá trị). Link phải là https công khai; không gửi file, không gửi header đăng nhập của khách.
 * Tắt nhãn âm thanh (tiếng cười, tiếng bước chân) để phụ đề chỉ có lời thoại.
 */
export function elevenlabsFormFields(input: { audioUrl: string; appModel: string; language: string }): Array<[string, string]> {
  const model = elevenlabsModel(input.appModel);
  if (!model) throw new Error("Model không phải của ElevenLabs.");
  const url = (input.audioUrl || "").trim();
  if (!/^https:\/\//i.test(url)) throw new Error("ElevenLabs cần link file công khai bắt đầu bằng https://.");
  const fields: Array<[string, string]> = [
    ["model_id", model],
    ["source_url", url],
    ["tag_audio_events", "false"],
    ["timestamps_granularity", "word"],
  ];
  const code = elevenlabsLanguage(input.language);
  if (code) fields.push(["language_code", code]);
  return fields;
}

type Word = { text?: unknown; start?: unknown; end?: unknown; type?: unknown };

const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

const END_MARK = /[.!?。！？…]\s*$/u;

/** Gộp từ thành câu. Khoảng trắng giữa các từ là mục `spacing` riêng nên nối thẳng; tiếng Trung, Nhật, Hàn nối liền. */
function sentencesFromWords(words: Word[], cjk: boolean): ElevenlabsSentence[] {
  const out: ElevenlabsSentence[] = [];
  const longest = cjk ? 36 : 84;
  let text = "";
  let start = 0;
  let end = 0;
  const flush = () => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean) out.push({ start, end: Math.max(end, start + 0.1), text: clean });
    text = "";
  };
  for (const word of words) {
    const piece = typeof word.text === "string" ? word.text : "";
    if (word.type === "audio_event") continue;
    if (word.type === "spacing") {
      if (text) text += piece || " ";
      continue;
    }
    if (!piece.trim() || !isNum(word.start) || !isNum(word.end)) continue;
    if (text && word.start - end > 0.8) flush();
    if (!text) start = Math.max(0, word.start);
    text += piece;
    end = word.end;
    if (END_MARK.test(piece) || text.trim().length >= longest) flush();
  }
  flush();
  return out;
}

/**
 * Đọc phản hồi /v1/speech-to-text thành câu (giây) và thời lượng (giây). Thời lượng lấy `audio_duration_secs` nếu có,
 * thiếu thì giờ kết thúc từ cuối. Phản hồi nhiều kênh (`transcripts[]`) chỉ đọc kênh đầu (app không bật nhiều kênh).
 */
export function sentencesFromElevenlabs(payload: unknown, language = ""): { sentences: ElevenlabsSentence[]; seconds: number } {
  const root = obj(payload);
  const chunk = Array.isArray(root.transcripts) && root.transcripts.length ? obj(root.transcripts[0]) : root;
  const said = typeof chunk.language_code === "string" ? chunk.language_code.toLowerCase() : "";
  const cjk = CJK.has((language || "").trim().toLowerCase()) || CJK.has(said);
  const words = Array.isArray(chunk.words) ? (chunk.words as Word[]) : [];
  const sentences = sentencesFromWords(words, cjk);
  const last = sentences.length ? sentences[sentences.length - 1].end : 0;
  const duration = isNum(root.audio_duration_secs) ? root.audio_duration_secs : chunk.audio_duration_secs;
  return { sentences, seconds: isNum(duration) && duration > 0 ? duration : last };
}

/** Mã bản nhận dạng (`transcription_id`) để xóa ở ElevenLabs. Rỗng nếu thiếu hoặc lạ. */
export function elevenlabsTranscriptId(payload: unknown): string {
  const value = obj(payload).transcription_id;
  return typeof value === "string" && /^[A-Za-z0-9_-]{4,100}$/.test(value.trim()) ? value.trim() : "";
}

/** Đường xóa một bản nhận dạng (nối sau địa chỉ API của nhà). */
export function elevenlabsDeletePath(id: string): string {
  if (!/^[A-Za-z0-9_-]{4,100}$/.test(id)) throw new Error("Mã bản nhận dạng không hợp lệ.");
  return `/speech-to-text/transcripts/${id}`;
}

/** Câu ElevenLabs → Seg để dịch. */
export function segsFromElevenlabs(sentences: ElevenlabsSentence[]): Seg[] {
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

/** Lấy `status` và câu lỗi từ thân lỗi ElevenLabs (`detail` là chuỗi, đối tượng hoặc danh sách lỗi kiểm dữ liệu). */
function errorParts(payload: unknown): { code: string; message: string } {
  const detail = obj(payload).detail;
  if (typeof detail === "string") return { code: "", message: detail };
  if (Array.isArray(detail)) {
    const first = obj(detail[0]);
    return { code: "", message: typeof first.msg === "string" ? first.msg : "" };
  }
  const row = obj(detail);
  return { code: typeof row.status === "string" ? row.status : "", message: typeof row.message === "string" ? row.message : "" };
}

/** Tên quyền key còn thiếu khi ElevenLabs báo «missing the permission X» (rỗng nếu không phải lỗi thiếu quyền). */
export function elevenlabsMissingPermission(text: string): string {
  const hit = /missing the permission ([a-z_]+)/i.exec(text);
  if (hit) return hit[1];
  return /missing_permissions?/i.test(text) ? "?" : "";
}

/** Câu báo thiếu quyền (dùng chung cho nhận dạng và đọc giọng). */
export function elevenlabsPermissionText(permission: string): string {
  const name = permission && permission !== "?" ? ` ${permission}` : "";
  return `Key ElevenLabs đúng nhưng thiếu quyền${name}. Mở elevenlabs.io/app/settings/api-keys, sửa key và bật quyền này (hoặc bỏ giới hạn quyền).`;
}

/** Câu báo lỗi tiếng Việt từ mã HTTP và thân phản hồi lỗi của ElevenLabs. */
export function elevenlabsErrorText(status: number, payload: unknown): string {
  const { code, message: raw } = errorParts(payload);
  const message = raw.trim().slice(0, 200);
  const both = `${code} ${message}`;
  const missing = elevenlabsMissingPermission(`${code} ${raw}`);
  if (missing) return elevenlabsPermissionText(missing);
  if (status === 401 || /invalid_api_key|api key/i.test(both)) return "Key ElevenLabs không hợp lệ hoặc chưa được cấp quyền nhận dạng giọng. Kiểm tra lại ở elevenlabs.io.";
  if (status === 402 || /quota|credit|insufficient|payment|subscription/i.test(both)) return "Tài khoản ElevenLabs hết hạn mức. Hãy nạp thêm hoặc dùng key khác.";
  if (status === 403) return "Key ElevenLabs chưa được cấp quyền nhận dạng giọng (Speech to Text). Bật quyền này cho key ở elevenlabs.io.";
  if (status === 429) return "ElevenLabs đang giới hạn tốc độ. Chờ một lát rồi chạy lại.";
  if (/source_url|cloud_storage_url|download|fetch|url/i.test(both)) return "ElevenLabs không tải được link này. Cần link file công khai (https), mở được không cần đăng nhập, dưới 2 GB.";
  if (/unsupported|format|corrupt|decode|audio/i.test(both)) return "ElevenLabs không đọc được định dạng file này.";
  if (/model/i.test(both)) return "ElevenLabs không nhận model này. Admin cần kiểm tên model nhận dạng của ElevenLabs.";
  if (status >= 500) return "ElevenLabs đang bận. Hãy thử lại sau.";
  return message ? `ElevenLabs báo lỗi: ${message}` : `ElevenLabs từ chối yêu cầu (mã ${status}).`;
}

/** Key khách dán. Không nhận "room", khoảng trắng hay độ dài lạ. */
export function cleanElevenlabsKey(key: string): string {
  const value = (key || "").trim();
  if (value.length < 20 || value.length > 200 || /\s/.test(value) || value === "room") throw new Error("Key ElevenLabs không đúng.");
  if (value.length !== 51) throw new Error(`Key ElevenLabs phải dài đúng 51 ký tự (key đang dùng dài ${value.length}).`);
  return value;
}
