/** Nhà nhận dạng. Danh sách model Groq không quyết định nhà khác. */
import { ASSEMBLYAI_PRO_ASR, ASSEMBLYAI_V2_ASR } from "./assemblyai.ts";
import { DEEPGRAM_ASR } from "./deepgram.ts";
import { SPEECHMATICS_ENHANCED_ASR, SPEECHMATICS_STANDARD_ASR } from "./speechmatics.ts";
import { PROVIDERS, type ProviderId, type ProviderIntake } from "./provider.ts";

export const ALI_FILETRANS_ASR = "qwen-audio-3.0-asr-flash-filetrans";

export type AsrHouse = ProviderId;

/** Mỗi model nhận dạng thuộc đúng một nhà. Thêm model nhận dạng mới thì thêm một dòng ở đây. */
const HOUSES: Record<string, AsrHouse> = {
  "whisper-large-v3": "groq",
  "whisper-large-v3-turbo": "groq",
  [ALI_FILETRANS_ASR]: "alibaba",
  [DEEPGRAM_ASR]: "deepgram",
  [ASSEMBLYAI_PRO_ASR]: "assemblyai",
  [ASSEMBLYAI_V2_ASR]: "assemblyai",
  [SPEECHMATICS_STANDARD_ASR]: "speechmatics",
  [SPEECHMATICS_ENHANCED_ASR]: "speechmatics",
};

export function asrHouse(id: string): AsrHouse | null {
  return Object.prototype.hasOwnProperty.call(HOUSES, id) ? HOUSES[id] : null;
}

/** Cách app đưa âm thanh cho model này, đọc từ khai `intake` của nhà (provider.ts). Model lạ thì null. */
export function asrIntake(id: string): ProviderIntake | null {
  const house = asrHouse(id);
  return house ? PROVIDERS[house].intake : null;
}

/** Model nhận cả file từ link công khai, không nhận đoạn cắt trên máy. */
export function asrTakesLink(id: string): boolean {
  return asrIntake(id) === "link";
}

/** Danh sách model key Groq của phòng chỉ khóa Whisper. */
export function groqListHolds(offered: string[] | null, id: string): boolean {
  if (asrHouse(id) !== "groq") return false;
  return Boolean(offered && !offered.includes(id));
}
