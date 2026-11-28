/**
 * TỰ CHỌN MODEL CHO GÓI THEO BA MỨC (Tiết kiệm / Cân bằng / Chất lượng) cho từng việc.
 * Hàm thuần, không gọi mạng. Người gọi đưa vào danh sách model đang mở và bảng giá; hàm trả model cho từng việc.
 * Điểm model ở model-grade.ts (phần ước lượng cần Chủ xem lại). Model thiếu điểm hoặc thiếu giá bị bỏ qua, không đoán.
 * Ba mức lồng nhau nên giá không bao giờ đảo: Tiết kiệm ≤ Cân bằng ≤ Chất lượng (cùng một danh sách model).
 */
import { asrCost, chatCost, speechCost, type PriceBook } from "../billing/run-bill.ts";
import { PACK_ROLES, PACK_ROLE_LABEL, translateTokens, type PackRole, type RoleAssign, type ServicePack } from "../service-pack.ts";
import { gradeOf } from "../sub/model-grade.ts";
import { fitsRole } from "./pack-fit.ts";
import type { RentShow } from "../rent-show-rule.ts";
import type { ProviderId } from "../sub/provider.ts";

export const AUTO_LEVELS = ["save", "balanced", "best"] as const;
type AutoLevel = (typeof AUTO_LEVELS)[number];
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
const SAVE_FLOOR = 6;
/** Mức Cân bằng: chọn model rẻ nhất trong nhóm cách model tốt nhất không quá ngần này điểm. */
const BALANCED_BAND = 1.5;

export type AutoLang = "cjk" | "other";
export type AutoCandidate = RoleAssign;

type AutoInput = {
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

function chooseScored(role: PackRole, level: AutoLevel, input: Pick<AutoInput, "candidates" | "books" | "lang">): Scored | null {
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
  return pool[0];
}

export function pickForRole(role: PackRole, level: AutoLevel, input: Pick<AutoInput, "candidates" | "books" | "lang">): RoleAssign | null {
  const pick = chooseScored(role, level, input);
  return pick ? { provider: pick.c.provider, model: pick.c.model } : null;
}

/** Một mức khi đặt cạnh nhau: model chọn được, điểm đang tính (đã tính tiếng Á nếu cjk) và giá một phút theo giá gốc (đồng). */
type LevelView = { provider: ProviderId; model: string; score: number; cost: number };

/** Ba mức của một việc, cùng đường chọn với pickForRole. Mức không có model hợp lệ là null. */
export function compareLevels(role: PackRole, input: Pick<AutoInput, "candidates" | "books" | "lang">): Record<AutoLevel, LevelView | null> {
  const out = { save: null, balanced: null, best: null } as Record<AutoLevel, LevelView | null>;
  for (const level of AUTO_LEVELS) {
    const pick = chooseScored(role, level, input);
    out[level] = pick ? { provider: pick.c.provider, model: pick.c.model, score: pick.eff, cost: pick.cost } : null;
  }
  return out;
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

/**
 * Dựng gói nháp từ kết quả tự chọn. Gói LƯU CỐ ĐỊNH model đã chọn (giá model đổi thì gói không tự đổi).
 * enabled luôn false: Chủ xem lại rồi mới mở. Ghi chú liệt kê mức đã dùng. Trả null khi thiếu nhận dạng hoặc dịch.
 */
export function buildAutoPack(input: { id: string; levels: AutoInput["levels"]; lang?: AutoLang; roles: AutoResult["roles"] }): ServicePack | null {
  if (!input.roles.asr || !input.roles.translate) return null;
  const parts: string[] = [];
  for (const role of PACK_ROLES) {
    if (!input.roles[role]) continue;
    const raw = input.levels[role];
    const level: AutoChoice = raw && raw !== "off" ? raw : REQUIRED_ROLES.includes(role) ? "balanced" : "save";
    parts.push(`${PACK_ROLE_LABEL[role]}: ${AUTO_LEVEL_LABEL[level]}`);
  }
  const head = AUTO_LEVEL_LABEL[input.levels.translate && input.levels.translate !== "off" ? input.levels.translate : "balanced"];
  const note = `Tự động${input.lang === "cjk" ? " (Trung, Nhật, Hàn)" : ""}. ${parts.join(" · ")}`.slice(0, 180);
  const doors: ServicePack["doors"] = input.roles.asr.provider === "tyzo-modal" ? ["turn"] : ["turn", "rent"];
  return { id: input.id, name: `Gói tự động · ${head}`, note, enabled: false, doors, roles: { ...input.roles } };
}

/** Chỉ giữ model Chủ đã mở cho thuê phòng. show = null (Chủ chưa lưu danh sách) thì không lọc. */
export function onlyRentOpen(candidates: AutoCandidate[], show: RentShow | null): AutoCandidate[] {
  if (!show) return candidates;
  return candidates.filter((c) => show[c.provider].includes(c.model));
}

/**
 * Chỉ giữ model của nhà Chủ đã lưu key phòng (nhà chưa có key không chạy được).
 * keyed = null (chưa đọc được key) thì không lọc. Nhà vắng trong keyed coi như chưa có key.
 */
export function onlyKeyed(candidates: AutoCandidate[], keyed: Partial<Record<ProviderId, boolean>> | null): AutoCandidate[] {
  if (!keyed) return candidates;
  return candidates.filter((c) => keyed[c.provider] === true);
}
