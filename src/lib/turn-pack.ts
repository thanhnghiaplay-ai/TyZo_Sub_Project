import { packsForDoor, type ServicePack } from "./service-pack.ts";
import type { AsrModel } from "./sub/types.ts";

export function turnPacks(packs: ServicePack[]) {
  return packsForDoor(packs, "turn");
}

export function packUsesAlibaba(pack: ServicePack) {
  return Object.values(pack.roles).some((role) => role?.provider === "alibaba");
}

export function turnPackModels(pack: ServicePack): { asr: AsrModel | null; chat: string } {
  const asr = pack.roles.asr?.model;
  const known: AsrModel | null =
    asr === "whisper-large-v3" || asr === "whisper-large-v3-turbo" || asr === "qwen-audio-3.0-asr-flash-filetrans" ? asr : null;
  return { asr: known, chat: pack.roles.translate?.model || "" };
}

/** Không có gói thì cửa cũ vẫn chạy. Có gói thì model phải khớp một gói Groq. */
export function turnPackProblem(packs: ServicePack[], pick: { asr: string; chat: string }): string {
  const open = turnPacks(packs);
  if (!open.length) return "";
  const hit = open.find((pack) => pack.roles.asr?.model === pick.asr && pack.roles.translate?.model === pick.chat);
  if (!hit) return "Hãy chọn một gói trả theo lượt. Cửa này không tự chọn model.";
  if (packUsesAlibaba(hit)) return "Gói này có việc Alibaba. Cửa trả theo lượt chưa gọi key Alibaba của phòng.";
  return "";
}
