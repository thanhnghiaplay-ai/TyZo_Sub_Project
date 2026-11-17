/** Nhà nhận dạng. Danh sách model Groq không quyết định nhà khác. */
import { DEEPGRAM_ASR } from "./deepgram.ts";
import type { ProviderId } from "./provider.ts";

export const ALI_FILETRANS_ASR = "qwen-audio-3.0-asr-flash-filetrans";

export type AsrHouse = ProviderId;

/** Mỗi model nhận dạng thuộc đúng một nhà. Thêm model nhận dạng mới thì thêm một dòng ở đây. */
const HOUSES: Record<string, AsrHouse> = {
  "whisper-large-v3": "groq",
  "whisper-large-v3-turbo": "groq",
  [ALI_FILETRANS_ASR]: "alibaba",
  [DEEPGRAM_ASR]: "deepgram",
};

export function asrHouse(id: string): AsrHouse | null {
  return Object.prototype.hasOwnProperty.call(HOUSES, id) ? HOUSES[id] : null;
}

/** Model nhận cả file từ link công khai, không nhận đoạn cắt trên máy. */
export function asrTakesLink(id: string): boolean {
  const house = asrHouse(id);
  return house === "alibaba" || house === "deepgram";
}

/** Danh sách model key Groq của phòng chỉ khóa Whisper. */
export function groqListHolds(offered: string[] | null, id: string): boolean {
  if (asrHouse(id) !== "groq") return false;
  return Boolean(offered && !offered.includes(id));
}

export function alibabaAsrOnRoomPayProblem(): string {
  return "Cửa trả theo lượt chưa nhận dạng bằng Alibaba. Hãy chọn Key của tôi.";
}
