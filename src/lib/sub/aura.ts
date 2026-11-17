import { DEEPGRAM_API } from "./provider.ts";

/**
 * Giọng đọc Deepgram Aura-2. Lõi thuần (không import máy chủ): chọn giọng, dựng tên model, địa chỉ, cắt câu, đọc lỗi.
 * Aura-2 hiện đọc nhiều tiếng nhưng ở đây mới bật Anh (en) và Tây Ban Nha (es) với giọng đã biết tên.
 * Danh sách giọng phải đối chiếu với `/v1/models` của key khi bật thêm tiếng.
 */
export type AuraLang = "en" | "es";

export type AuraVoice = { id: string; name: string; gender: "female" | "male" };

/** Giá niêm yết Aura-2: 0,030 đô mỗi 1.000 ký tự = 30 đô mỗi triệu ký tự (một mức cho mọi giọng). */
export const AURA_USD_PER_MILLION_CHARS = 30;
/** Mã dòng giá chung cho mọi giọng Aura-2 trong bảng giá của Chủ. */
export const AURA_PRICE_ID = "aura-2";
/** Deepgram nhận tối đa 2.000 ký tự mỗi yêu cầu. */
export const AURA_MAX_CHARS = 2000;

export const AURA_VOICES: Record<AuraLang, readonly AuraVoice[]> = {
  en: [
    { id: "thalia", name: "Thalia", gender: "female" },
    { id: "andromeda", name: "Andromeda", gender: "female" },
    { id: "helena", name: "Helena", gender: "female" },
    { id: "apollo", name: "Apollo", gender: "male" },
    { id: "arcas", name: "Arcas", gender: "male" },
    { id: "aries", name: "Aries", gender: "male" },
  ],
  es: [
    { id: "celeste", name: "Celeste", gender: "female" },
    { id: "estrella", name: "Estrella", gender: "female" },
    { id: "nestor", name: "Néstor", gender: "male" },
    { id: "sirio", name: "Sirio", gender: "male" },
  ],
};

/** Tiếng đích mà Aura đọc được. Tên tiếng theo ô chọn ngôn ngữ của app (English, Spanish). */
export function auraReady(target: string): AuraLang | null {
  if (/english/i.test(target)) return "en";
  if (/spanish|español/i.test(target)) return "es";
  return null;
}

export function auraVoices(lang: AuraLang): readonly AuraVoice[] {
  return AURA_VOICES[lang];
}

export function defaultAuraVoice(lang: AuraLang, gender: "female" | "male" | "any"): string {
  const list = AURA_VOICES[lang];
  if (gender === "any") return list[0].id;
  return list.find((voice) => voice.gender === gender)?.id ?? list[0].id;
}

export function auraVoiceOk(lang: AuraLang, voice: string): boolean {
  return AURA_VOICES[lang].some((item) => item.id === voice);
}

/** Tên model gửi Deepgram, ví dụ `aura-2-thalia-en`. */
export function auraModel(voice: string, lang: AuraLang): string {
  return `aura-2-${voice}-${lang}`;
}

export function isAuraModel(model: string): boolean {
  return /^aura-2-[a-z]{3,20}-(en|es)$/.test(model);
}

export function auraSpeakUrl(model: string): string {
  if (!isAuraModel(model)) throw new Error("Giọng Aura không đúng.");
  return `${DEEPGRAM_API}/speak?model=${encodeURIComponent(model)}&encoding=mp3`;
}

/** Cắt theo dấu câu, mỗi mảnh tối đa `max` ký tự (ngắn thì tiếng đến nhanh hơn). */
export function auraPieces(text: string, max = 400): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const limit = Math.max(20, Math.min(max, AURA_MAX_CHARS));
  const out: string[] = [];
  let rest = clean;
  while (rest.length > limit) {
    const head = rest.slice(0, limit);
    const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf("? "), head.lastIndexOf("! "), head.lastIndexOf(", "), head.lastIndexOf(" "));
    const at = cut > limit * 0.4 ? cut + 1 : limit;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Câu báo lỗi tiếng Việt cho phản hồi lỗi của Deepgram. */
export function auraErrorText(status: number, payload: unknown): string {
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const detail = typeof body.err_msg === "string" ? body.err_msg : typeof body.message === "string" ? body.message : "";
  if (status === 401 || status === 403) return "Key Deepgram không đúng hoặc không được đọc giọng.";
  if (status === 402) return "Tài khoản Deepgram hết tiền hoặc hết hạn mức.";
  if (status === 429) return "Deepgram đang giới hạn tốc độ. Hãy thử lại sau ít giây.";
  if (status === 400 || status === 422) return `Deepgram không nhận yêu cầu đọc${detail ? `: ${detail}` : "."}`;
  return `Giọng đọc Deepgram lỗi (${status})${detail ? `: ${detail}` : "."}`;
}
