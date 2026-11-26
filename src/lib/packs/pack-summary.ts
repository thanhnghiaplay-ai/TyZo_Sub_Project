/**
 * Dòng tóm tắt một gói dịch cho danh sách thu gọn ở Admin. Ví dụ: «Nhận dạng: Alibaba · Dịch: Groq».
 * Các việc liền nhau (theo thứ tự PACK_ROLES) cùng một nhà thì gộp: «Dịch, Ngữ cảnh: Groq». Không mất thông tin.
 * Thuần, không gọi mạng.
 */
import { DOOR_LABEL, PACK_ROLE_LABEL, PACK_ROLES, type ServicePack } from "../service-pack.ts";
import { PROVIDER_LABEL } from "../sub/provider.ts";

export function packSummary(pack: Pick<ServicePack, "roles">): string {
  const groups: Array<{ provider: string; roles: string[] }> = [];
  for (const role of PACK_ROLES) {
    const assign = pack.roles[role];
    if (!assign) continue;
    const provider = PROVIDER_LABEL[assign.provider];
    const last = groups[groups.length - 1];
    if (last && last.provider === provider) last.roles.push(PACK_ROLE_LABEL[role]);
    else groups.push({ provider, roles: [PACK_ROLE_LABEL[role]] });
  }
  if (groups.length === 0) return "Chưa chọn việc nào";
  return groups.map((group) => `${group.roles.join(", ")}: ${group.provider}`).join(" · ");
}

/** Hai cửa của gói, một dòng: «Trả theo lượt · Thuê phòng». */
export function packDoorsText(pack: Pick<ServicePack, "doors">): string {
  return pack.doors.map((door) => DOOR_LABEL[door]).join(" · ");
}
