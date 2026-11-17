import { asrHouse } from "./sub/asr-house.ts";
import { PROVIDER_IDS, type ProviderId } from "./sub/provider.ts";

/** Model Chủ mở cho thuê phòng, theo từng nhà cung cấp. Nhà mới trong PROVIDERS tự có một danh sách. */
export type RentShow = Record<ProviderId, string[]>;

const ID_RE = /^[a-z0-9./_-]{2,80}$/i;

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && ID_RE.test(id)).slice(0, 80);
}

export function parseRentShow(raw: string | null | undefined): RentShow | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object") return null;
    return Object.fromEntries(PROVIDER_IDS.map((id) => [id, idList(data[id])])) as RentShow;
  } catch {
    return null;
  }
}

/** null = Chủ chưa lưu danh sách, không khóa thêm. */
export function rentOpen(allow: string[] | null, id: string) {
  if (!allow) return true;
  return allow.includes(id);
}

export function ownKeyAvailable(userIds: string[] | null, allow: string[] | null): { ids: Set<string> | null; known: boolean } {
  if (!allow) return { ids: userIds ? new Set(userIds) : null, known: Boolean(userIds) };
  if (!userIds) return { ids: new Set(allow), known: true };
  return { ids: new Set(userIds.filter((id) => allow.includes(id))), known: true };
}

export function rentUseProblem(show: RentShow | null, pick: { asr: string; chat: string }): string {
  if (!show) return "";
  const house = asrHouse(pick.asr);
  if (house && !show[house].includes(pick.asr)) return "Chủ chưa mở model nhận dạng này cho thuê phòng.";
  if (!house) return "Model nhận dạng này chưa được mở cho thuê phòng.";
  const chat = pick.chat.trim();
  if (chat && !PROVIDER_IDS.some((id) => show[id].includes(chat))) return "Chủ chưa mở model dịch này cho thuê phòng.";
  return "";
}

/** Model Orpheus (Groq) cho từng ngôn ngữ giọng đọc. Cùng mã với danh mục model-catalog. */
export function orpheusModelId(lang: "en" | "ar") {
  return lang === "ar" ? "canopylabs/orpheus-arabic-saudi" : "canopylabs/orpheus-v1-english";
}

/**
 * Giọng đọc Orpheus bằng key riêng của khách có được mở không. Chỉ Groq có giọng thuê phòng được;
 * Aura (Deepgram) chỉ trả bằng Token dịch nên không qua cửa này.
 * show = null: Chủ chưa lưu danh sách, không khóa thêm.
 */
export function rentVoiceProblem(show: RentShow | null, voiceModel: string): string {
  if (!show) return "";
  if (show.groq.includes(voiceModel)) return "";
  return "Chủ chưa mở giọng đọc này cho thuê phòng. Đang dùng giọng khác.";
}
