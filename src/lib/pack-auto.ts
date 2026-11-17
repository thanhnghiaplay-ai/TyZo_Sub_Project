/**
 * TỰ CHỌN MODEL CHO GÓI THEO BA MỨC (Tiết kiệm / Cân bằng / Chất lượng) cho từng việc.
 * Hàm thuần, không gọi mạng. Người gọi đưa vào danh sách model đang mở và bảng giá; hàm trả model cho từng việc.
 * Điểm model ở model-grade.ts (phần ước lượng cần Chủ xem lại). Model thiếu điểm hoặc thiếu giá bị bỏ qua, không đoán.
 * Ba mức lồng nhau nên giá không bao giờ đảo: Tiết kiệm ≤ Cân bằng ≤ Chất lượng (cùng một danh sách model).
 */
import { asrCost, chatCost, speechCost, type PriceBook } from "./run-bill.ts";
import { PACK_ROLES, providersForRole, translateTokens, type PackRole, type RoleAssign } from "./service-pack.ts";
import { gradeOf } from "./sub/model-grade.ts";
import { modelRoleOf } from "./sub/model-role.ts";
import { chatModel } from "./sub/models.ts";
import type { ProviderId } from "./sub/provider.ts";

export const AUTO_LEVELS = ["save", "balanced", "best"] as const;
export type AutoLevel = (typeof AUTO_LEVELS)[number];
/** off chỉ dùng được cho việc không bắt buộc (không phải nhận dạng và dịch). */
export type AutoChoice = AutoLevel | "off";

export const AUTO_LEVEL_LABEL: Record<AutoChoice, string> = {
  off: "Tắt",
  save: "Tiết kiệm",
  balanced: "Cân bằng",
  best: "Chất lượng",
};

export const REQUIRED_ROLES: readonly PackRole[] = ["asr", "translate"];

/** Điểm tối thiểu để được xét ở mức Tiết kiệm, tránh chọn model rẻ nhưng quá yếu. */
export const SAVE_FLOOR = 6;
/** Mức Cân bằng: chọn model rẻ nhất trong nhóm cách model tốt nhất không quá ngần này điểm. */
export const BALANCED_BAND = 1.5;

export type AutoLang = "cjk" | "other";
export type AutoCandidate = RoleAssign;

export type AutoInput = {
  levels: Partial<Record<PackRole, AutoChoice>>;
  /** Model đang mở (Chủ đã tick, key chạy được). Người gọi lọc trước. */
  candidates: AutoCandidate[];
  books: Partial<Record<ProviderId, PriceBook>>;
  /** cjk: lời gốc tiếng Trung, Nhật, Hàn, điểm tiếng Á được tính nặng hơn. */
  lang?: AutoLang;
};

export type AutoResult = {
  roles: Partial<Record<PackRole, RoleAssign>>;
  /** Việc được yêu cầu (không tắt) nhưng không có model hợp lệ có điểm và giá. */
  missing: PackRole[];
};

function fitsRole(role: PackRole, c: AutoCandidate): boolean {
  const kind = modelRoleOf(c.model);
  if (role === "asr") return kind === "asr" && providersForRole("asr").includes(c.provider);
  if (!providersForRole(role).includes(c.provider)) return false;
  if (role === "narration") return kind === "tts" && c.provider === "groq";
  if (kind !== "translate") return false;
  const tier = chatModel(c.model)?.tier;
  return tier !== "safety";
}

/** Giá một phút để so sánh giữa các model cùng việc. Đồng. null khi thiếu giá. */
function unitCost(role: PackRole, c: AutoCandidate, books: AutoInput["books"]): number | null {
  const book = books[c.provider];
  if (!book) return null;
  if (role === "asr") return asrCost(book, c.model, 60);
  if (role === "narration") return speechCost(book, c.model, 60 * 14);
  const t = translateTokens(60);
  return chatCost(book, c.model, t.inn, t.out);
}

type Scored = { c: AutoCandidate; eff: number; speed: number; cost: number };

function score(role: PackRole, list: AutoCandidate[], books: AutoInput["books"], lang: AutoLang): Scored[] {
  const out: Scored[] = [];
  for (const c of list) {
    if (!fitsRole(role, c)) continue;
    const grade = gradeOf(c.model);
    const cost = unitCost(role, c, books);
    if (!grade || cost == null || !(cost > 0)) continue;
    const eff = lang === "cjk" ? grade.quality * 0.6 + grade.asian * 0.4 : grade.quality;
    out.push({ c, eff, speed: grade.speed, cost });
  }
  return out;
}

const byCostThenQuality = (a: Scored, b: Scored) => a.cost - b.cost || b.eff - a.eff || b.speed - a.speed;
const byQualityThenCost = (a: Scored, b: Scored) => b.eff - a.eff || a.cost - b.cost || b.speed - a.speed;

export function pickForRole(role: PackRole, level: AutoLevel, input: Pick<AutoInput, "candidates" | "books" | "lang">): RoleAssign | null {
  const scored = score(role, input.candidates, input.books, input.lang ?? "other");
  if (!scored.length) return null;
  const top = [...scored].sort(byQualityThenCost)[0];
  let pool: Scored[];
  if (level === "best") {
    pool = scored.filter((s) => s.eff === top.eff);
    pool.sort(byCostThenQuality);
  } else {
    const floor = level === "save" ? SAVE_FLOOR : Math.max(SAVE_FLOOR, top.eff - BALANCED_BAND);
    pool = scored.filter((s) => s.eff >= floor);
    if (!pool.length) pool = [top];
    pool.sort(byCostThenQuality);
  }
  const pick = pool[0];
  return { provider: pick.c.provider, model: pick.c.model };
}

export function autoRoles(input: AutoInput): AutoResult {
  const roles: AutoResult["roles"] = {};
  const missing: PackRole[] = [];
  for (const role of PACK_ROLES) {
    const raw = input.levels[role];
    const choice: AutoChoice = raw ?? (REQUIRED_ROLES.includes(role) ? "balanced" : "off");
    if (choice === "off" && !REQUIRED_ROLES.includes(role)) continue;
    const level: AutoLevel = choice === "off" ? "balanced" : choice;
    const pick = pickForRole(role, level, input);
    if (pick) roles[role] = pick;
    else missing.push(role);
  }
  return { roles, missing };
}
