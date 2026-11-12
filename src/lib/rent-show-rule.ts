import { asrHouse } from "./sub/asr-house.ts";

export type RentShow = { groq: string[]; alibaba: string[] };

const ID_RE = /^[a-z0-9./_-]{2,80}$/i;

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && ID_RE.test(id)).slice(0, 80);
}

export function parseRentShow(raw: string | null | undefined): RentShow | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { groq?: unknown; alibaba?: unknown };
    if (!data || typeof data !== "object") return null;
    return { groq: idList(data.groq), alibaba: idList(data.alibaba) };
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
  if (house === "groq" && !show.groq.includes(pick.asr)) return "Chủ chưa mở model nhận dạng này cho thuê phòng.";
  if (house === "alibaba" && !show.alibaba.includes(pick.asr)) return "Chủ chưa mở model nhận dạng này cho thuê phòng.";
  if (!house) return "Model nhận dạng này chưa được mở cho thuê phòng.";
  const chat = pick.chat.trim();
  if (chat && !show.groq.includes(chat) && !show.alibaba.includes(chat)) return "Chủ chưa mở model dịch này cho thuê phòng.";
  return "";
}
