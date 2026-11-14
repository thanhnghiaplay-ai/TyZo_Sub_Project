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

/** Khách chỉ thấy số đã cộng phần chênh. Không ghi giá gốc, không ghi phần trăm. */
export function customerVisiblePrice(total: number | null, hold: number): string {
  if (total == null || !(total > 0)) return "Chưa có giá";
  const dong = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " đ";
  return `Ước tính ${dong(total)}. Giữ ví ${dong(hold)}.`;
}
export function turnPackProblem(packs: ServicePack[], pick: { asr: string; chat: string }): string {
  const open = turnPacks(packs);
  if (!open.length) return "";
  const hit = open.find((pack) => pack.roles.asr?.model === pick.asr && pack.roles.translate?.model === pick.chat);
  if (!hit) return "Hãy chọn một gói trả theo lượt. Cửa này không tự chọn model.";
  const other = Object.entries(hit.roles).find(([role, assign]) => role !== "asr" && assign?.provider === "alibaba");
  if (other) return "Gói này có việc Alibaba ngoài nhận dạng. Cửa trả theo lượt chưa chạy việc đó.";
  return "";
}
