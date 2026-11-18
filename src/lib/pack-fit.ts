/**
 * Model nào hợp việc nào trong gói dịch. MỘT luật duy nhất, dùng cho cả «Dựng gói tự động» (pack-auto.ts)
 * lẫn các ô chọn model ở Admin (service-pack-board.tsx), để hai nơi không lệch nhau.
 * Nhận dạng chỉ model nhận dạng. Dịch, Ngữ cảnh, Đối chiếu, Tóm tắt chỉ model dịch (không phải kiểm duyệt).
 * Thuyết minh chỉ giọng đọc của nhà có giọng (hiện chỉ Groq).
 */
import { providersForRole, type PackRole, type RoleAssign } from "./service-pack.ts";
import { modelRoleOf } from "./sub/model-role.ts";
import { chatModel } from "./sub/models.ts";
import type { ProviderId } from "./sub/provider.ts";

export function fitsRole(role: PackRole, c: RoleAssign): boolean {
  const kind = modelRoleOf(c.model);
  if (role === "asr") return kind === "asr" && providersForRole("asr").includes(c.provider);
  if (!providersForRole(role).includes(c.provider)) return false;
  if (role === "narration") return kind === "tts" && c.provider === "groq";
  if (kind !== "translate") return false;
  const tier = chatModel(c.model)?.tier;
  return tier !== "safety";
}

/** Model của một nhà hợp với việc này. Rỗng nghĩa là nhà đó chưa có model cho việc này. */
export function modelsForRole(role: PackRole, provider: ProviderId, ids: readonly string[]): string[] {
  return ids.filter((model) => fitsRole(role, { provider, model }));
}
