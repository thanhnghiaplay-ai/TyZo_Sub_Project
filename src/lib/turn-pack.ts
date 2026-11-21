import { PACK_ROLE_LABEL, PACK_ROLES, ROLE_CAP, packsForDoor, type ServicePack } from "./service-pack.ts";
import { PROVIDERS, providerHas } from "./sub/provider.ts";
import { asrHouse } from "./sub/asr-house.ts";
import type { AsrModel } from "./sub/types.ts";

export function turnPacks(packs: ServicePack[]) {
  return packsForDoor(packs, "turn");
}


export function turnPackModels(pack: ServicePack): { asr: AsrModel | null; chat: string } {
  const asr = pack.roles.asr?.model;
  const known: AsrModel | null = asr && asrHouse(asr) ? (asr as AsrModel) : null;
  return { asr: known, chat: pack.roles.translate?.model || "" };
}

/** Khách chỉ thấy số đã cộng phần chênh. Không ghi giá gốc, không ghi phần trăm. */
export function customerVisiblePrice(total: number | null, hold: number, running = false): string {
  if (total == null || !(total > 0)) return "Chưa có giá";
  const n = (value: number) => new Intl.NumberFormat("vi-VN").format(Math.round(value));
  // Lượt đang chạy đã giữ Token rồi: không nói «giữ trước khi chạy» nữa (số thực trừ khi xong, phần thừa trả lại).
  if (running) return `Ước tính ${n(total)} Token dịch. Lượt đang chạy đã giữ Token, xong thì trả phần thừa.`;
  return `Ước tính ${n(total)} Token dịch. Giữ ${n(hold)} trước khi chạy.`;
}
export function turnPackProblem(packs: ServicePack[], pick: { asr: string; chat: string }): string {
  const open = turnPacks(packs);
  if (!open.length) return "";
  const hit = open.find((pack) => pack.roles.asr?.model === pick.asr && pack.roles.translate?.model === pick.chat);
  if (!hit) return "Hãy chọn một gói trả theo lượt. Cửa này không tự chọn model.";
  // Luật chung cho mọi nhà: việc nào trong gói cũng phải giao cho nhà có khả năng làm việc đó (ROLE_CAP).
  for (const role of PACK_ROLES) {
    const assign = hit.roles[role];
    if (assign && !providerHas(assign.provider, ROLE_CAP[role])) {
      const label = PROVIDERS[assign.provider].label;
      return `Gói này giao việc ${PACK_ROLE_LABEL[role]} cho ${label}, nhưng ${label} không làm việc đó.`;
    }
  }
  return "";
}
