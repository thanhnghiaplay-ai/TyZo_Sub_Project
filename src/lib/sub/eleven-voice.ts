import { elevenlabsMissingPermission, elevenlabsPermissionText } from "./elevenlabs.ts";

/**
 * Giọng đọc ElevenLabs. Lõi thuần (không import máy chủ): model, tiếng đọc được, đọc danh sách giọng, dựng đường gọi, cắt câu, lỗi.
 * Theo tài liệu đọc 21/11/2026, CHƯA đối chiếu với key thật:
 * POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128, header `xi-api-key`, JSON `{text, model_id, language_code}`, trả mp3.
 * Model eleven_flash_v2_5: 32 tiếng (gồm tiếng Việt), tối đa 40.000 ký tự mỗi lần, giá 0,04 đô/1.000 ký tự.
 * Danh sách giọng: GET /v2/voices (`voices[]`: `voice_id`, `name`, `labels.gender`). Giọng mặc định của ElevenLabs hết hạn
 * 31/12/2026, nên app luôn đọc danh sách giọng của key, không ghi cứng mã giọng.
 */

/** Mã model của app (danh mục, bảng giá, gói dịch, danh sách thuê phòng). */
export const ELEVEN_TTS_ID = "elevenlabs-flash-v2-5";
/** Mã model ElevenLabs nhận. */
const ELEVEN_TTS_API_MODEL = "eleven_flash_v2_5";
/** Giá niêm yết Flash: 0,04 đô mỗi 1.000 ký tự = 40 đô mỗi triệu ký tự. */
export const ELEVEN_TTS_USD_PER_MILLION_CHARS = 40;
/** Mỗi mảnh gửi đi tối đa từng này ký tự (ngắn thì tiếng tới nhanh hơn; trần của model là 40.000). */
const ELEVEN_PIECE_MAX = 400;
/** Cửa phòng nhận tối đa từng này ký tự mỗi yêu cầu. */
export const ELEVEN_REQUEST_MAX = 2000;

/** Tiếng đích của app → mã ISO 639-1 mà Flash v2.5 đọc được. Tiếng Thái không có trong danh sách của Flash v2.5. */
const LANGS: Record<string, string> = {
  Vietnamese: "vi",
  English: "en",
  Chinese: "zh",
  Japanese: "ja",
  Korean: "ko",
  Indonesian: "id",
  French: "fr",
  Spanish: "es",
  German: "de",
  Portuguese: "pt",
  Russian: "ru",
  Italian: "it",
  Hindi: "hi",
  Arabic: "ar",
};

/** Tiếng đích ElevenLabs đọc được (mã gửi `language_code`), null khi không đọc được. */
export function elevenReady(target: string): string | null {
  return Object.prototype.hasOwnProperty.call(LANGS, target) ? LANGS[target] : null;
}

export type ElevenVoice = { id: string; name: string; gender: "female" | "male" | "any" };

const VOICE_ID = /^[A-Za-z0-9]{8,40}$/;

function elevenVoiceIdOk(id: string): boolean {
  return VOICE_ID.test(id);
}

const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

/** Đọc `voices[]` của GET /v2/voices thành danh sách giọng gọn (tối đa 100, bỏ mục lạ). */
export function parseElevenVoices(payload: unknown): ElevenVoice[] {
  const rows = Array.isArray(obj(payload).voices) ? (obj(payload).voices as unknown[]) : [];
  const out: ElevenVoice[] = [];
  for (const row of rows) {
    const item = obj(row);
    const id = typeof item.voice_id === "string" ? item.voice_id.trim() : "";
    if (!elevenVoiceIdOk(id) || out.some((voice) => voice.id === id)) continue;
    const name = (typeof item.name === "string" ? item.name : id).replace(/\s+/g, " ").trim().slice(0, 60) || id;
    const raw = typeof obj(item.labels).gender === "string" ? String(obj(item.labels).gender).toLowerCase() : "";
    const gender = raw === "female" ? "female" : raw === "male" ? "male" : "any";
    out.push({ id, name, gender });
    if (out.length >= 100) break;
  }
  return out;
}

/** Giọng dùng cho một câu: giọng đã chọn nếu còn trong danh sách (và hợp giới khi đọc theo phim), không thì giọng đầu hợp giới. */
export function pickElevenVoice(list: readonly ElevenVoice[], wanted: string, gender: "female" | "male" | "any", matchCast: boolean): string | null {
  if (!list.length) return null;
  const chosen = list.find((voice) => voice.id === wanted);
  if (chosen && (!matchCast || gender === "any" || chosen.gender === gender || chosen.gender === "any")) return chosen.id;
  if (gender !== "any") {
    const same = list.find((voice) => voice.gender === gender);
    if (same) return same.id;
  }
  return chosen?.id ?? list[0].id;
}

/** Đường đọc một mảnh (nối sau địa chỉ API của nhà). */
export function elevenSpeakPath(voiceId: string): string {
  if (!elevenVoiceIdOk(voiceId)) throw new Error("Giọng ElevenLabs không đúng.");
  return `/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
}

/** Thân yêu cầu đọc gửi ElevenLabs. */
export function elevenSpeakBody(text: string, lang: string): { text: string; model_id: string; language_code?: string } {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("Không có chữ để đọc.");
  const code = /^[a-z]{2}$/.test(lang) ? lang : "";
  return code ? { text: clean, model_id: ELEVEN_TTS_API_MODEL, language_code: code } : { text: clean, model_id: ELEVEN_TTS_API_MODEL };
}

/** Cắt theo dấu câu, mỗi mảnh tối đa `max` ký tự. */
export function elevenPieces(text: string, max = ELEVEN_PIECE_MAX): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const limit = Math.max(20, Math.min(max, ELEVEN_REQUEST_MAX));
  const out: string[] = [];
  let rest = clean;
  while (rest.length > limit) {
    const head = rest.slice(0, limit);
    const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "), head.lastIndexOf(", "), head.lastIndexOf(" "), head.lastIndexOf("。"), head.lastIndexOf("，"));
    const at = cut > limit * 0.4 ? cut + 1 : limit;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Câu báo lỗi tiếng Việt cho phản hồi lỗi khi đọc giọng ElevenLabs. */
export function elevenTtsErrorText(status: number, payload: unknown): string {
  const detail = obj(payload).detail;
  const row = obj(detail);
  const code = typeof row.status === "string" ? row.status : "";
  const message = (typeof detail === "string" ? detail : typeof row.message === "string" ? row.message : "").trim().slice(0, 160);
  const both = `${code} ${message}`;
  const missing = elevenlabsMissingPermission(`${code} ${typeof detail === "string" ? detail : typeof row.message === "string" ? row.message : ""}`);
  if (missing) return elevenlabsPermissionText(missing);
  if (status === 401 || /invalid_api_key/i.test(both)) return "Key ElevenLabs không đúng.";
  if (status === 402 || /quota|credit|insufficient|payment/i.test(both)) return "Tài khoản ElevenLabs hết hạn mức.";
  if (status === 403) return "Key ElevenLabs chưa được cấp quyền đọc giọng (Text to Speech).";
  if (status === 404 || /voice_not_found|voice/i.test(code)) return "Không tìm thấy giọng ElevenLabs này. Hãy chọn giọng khác.";
  if (status === 429) return "ElevenLabs đang giới hạn tốc độ. Hãy thử lại sau ít giây.";
  if (status === 400 || status === 422) return `ElevenLabs không nhận yêu cầu đọc${message ? `: ${message}` : "."}`;
  return `Giọng đọc ElevenLabs lỗi (${status})${message ? `: ${message}` : "."}`;
}
