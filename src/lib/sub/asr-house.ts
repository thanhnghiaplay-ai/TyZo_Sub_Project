/** Nhà nhận dạng. Danh sách model Groq không quyết định nhà khác. */

export const ALI_FILETRANS_ASR = "qwen-audio-3.0-asr-flash-filetrans";

export type AsrHouse = "groq" | "alibaba";

export function asrHouse(id: string): AsrHouse | null {
  if (id === "whisper-large-v3" || id === "whisper-large-v3-turbo") return "groq";
  if (id === ALI_FILETRANS_ASR) return "alibaba";
  return null;
}

/** Danh sách model key Groq của phòng chỉ khóa Whisper. */
export function groqListHolds(offered: string[] | null, id: string): boolean {
  if (asrHouse(id) !== "groq") return false;
  return Boolean(offered && !offered.includes(id));
}

export function alibabaAsrOnRoomPayProblem(): string {
  return "Cửa trả theo lượt chưa nhận dạng bằng Alibaba. Hãy chọn Key của tôi.";
}
