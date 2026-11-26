import { asrCost, chatCost, speechCost, HOLD_BUFFER, type PriceBook } from "./run-bill.ts";
import { isProviderId, PROVIDER_IDS, providerHas, type ProviderCap, type ProviderId } from "./sub/provider.ts";

export const PACK_ROLES = ["asr", "translate", "context", "review", "summary", "narration"] as const;
export type PackRole = (typeof PACK_ROLES)[number];

export const PACK_ROLE_LABEL: Record<PackRole, string> = {
  asr: "Nhận dạng",
  translate: "Dịch",
  context: "Ngữ cảnh",
  review: "Đối chiếu",
  summary: "Tóm tắt",
  narration: "Thuyết minh",
};

export const DOORS = ["turn", "rent"] as const;
type ServiceDoor = (typeof DOORS)[number];

export const DOOR_LABEL: Record<ServiceDoor, string> = {
  turn: "Trả theo lượt",
  rent: "Thuê phòng",
};

/**
 * Mỗi việc cần một khả năng của nhà: nhận dạng cần asr, các việc chữ (dịch, ngữ cảnh, đối chiếu, tóm tắt) cần chat,
 * thuyết minh cần tts. Kiểu Record bắt buộc mọi việc mới phải khai khả năng.
 */
export const ROLE_CAP: Record<PackRole, ProviderCap> = {
  asr: "asr",
  translate: "chat",
  context: "chat",
  review: "chat",
  summary: "chat",
  narration: "tts",
};

/** Nhà được chọn cho từng việc trong gói: mọi nhà (đã ready) có khả năng việc đó cần. Nhà mới tự hiện ở đây theo khả năng khai. */
export function providersForRole(role: PackRole): ProviderId[] {
  return PROVIDER_IDS.filter((id) => providerHas(id, ROLE_CAP[role]));
}

export type RoleAssign = { provider: ProviderId; model: string };

export type ServicePack = {
  id: string;
  name: string;
  note: string;
  enabled: boolean;
  doors: ServiceDoor[];
  roles: Partial<Record<PackRole, RoleAssign>>;
};

type QuoteLine = {
  role: PackRole;
  provider: ProviderId;
  model: string;
  /** Giá gốc, chưa chênh. null khi nhà cung cấp chưa niêm yết. */
  base: number | null;
  /** Giá khách trả ở cửa trả theo lượt. null khi chưa đủ giá. */
  marked: number | null;
};

type PackQuote = {
  lines: QuoteLine[];
  base: number | null;
  marked: number | null;
  /** Khoản giữ ví. Chỉ cửa trả theo lượt. Không gồm thuyết minh (thuyết minh trừ ví lúc đọc). */
  hold: number;
  narration: number | null;
  ready: boolean;
};

const MODEL_RE = /^[a-z0-9./_-]{2,80}$/i;
const PACK_RE = /^pack_[a-z0-9]{4,24}$/;

/** Một lần phân tích ngữ cảnh, không theo từng giây. */
export const CONTEXT_TOKENS = { inn: 8000, out: 2000 };
/** Lượt tóm tắt riêng, khi model khác model ngữ cảnh. */
const SUMMARY_TOKENS = { inn: 4000, out: 800 };
const TRANSLATE_IN_PER_SEC = 12;
const TRANSLATE_OUT_PER_SEC = 8;
const TRANSLATE_IN_FIXED = 1500;
const TRANSLATE_OUT_FIXED = 500;
/** Phần đối chiếu ước bằng 35% lượt dịch. */
const REVIEW_SHARE = 0.35;
/** Ký tự thuyết minh ước theo giây hình. */
const NARRATION_CHARS_PER_SEC = 14;

export function translateTokens(seconds: number) {
  const span = Math.max(0, seconds);
  return {
    inn: Math.ceil(span * TRANSLATE_IN_PER_SEC) + TRANSLATE_IN_FIXED,
    out: Math.ceil(span * TRANSLATE_OUT_PER_SEC) + TRANSLATE_OUT_FIXED,
  };
}

export function reviewTokens(seconds: number) {
  const base = translateTokens(seconds);
  return { inn: Math.ceil(base.inn * REVIEW_SHARE), out: Math.ceil(base.out * REVIEW_SHARE) };
}

function bareBook(book: PriceBook): PriceBook {
  return { ...book, desk: { markup: 0, custom: {} } };
}

function sameAssign(a: RoleAssign | undefined, b: RoleAssign | undefined) {
  return Boolean(a && b && a.provider === b.provider && a.model === b.model);
}

function moneyOf(book: PriceBook | undefined, role: PackRole, model: string, seconds: number, inn = 0, out = 0): { base: number | null; marked: number | null } {
  if (!book) return { base: null, marked: null };
  const raw = bareBook(book);
  if (role === "asr") return { base: asrCost(raw, model, seconds), marked: asrCost(book, model, seconds) };
  if (role === "narration") {
    const chars = Math.ceil(Math.max(0, seconds) * NARRATION_CHARS_PER_SEC);
    return { base: speechCost(raw, model, chars), marked: speechCost(book, model, chars) };
  }
  return { base: chatCost(raw, model, inn, out), marked: chatCost(book, model, inn, out) };
}

export function quotePack(input: {
  pack: ServicePack;
  seconds: number;
  door: ServiceDoor;
  narration: boolean;
  books: Partial<Record<ProviderId, PriceBook>>;
  /** full: cả lần chạy. translate: chỉ dịch lại, không tính nhận dạng hay thuyết minh. */
  scope?: "full" | "translate";
}): PackQuote {
  const seconds = Math.max(0, input.seconds);
  const bookFor = (provider: ProviderId) => input.books[provider];
  const roles = input.pack.roles;
  const lines: QuoteLine[] = [];
  const scope = input.scope ?? "full";

  const push = (role: PackRole, assign: RoleAssign, inn = 0, out = 0) => {
    const book = bookFor(assign.provider);
    const priced = book ? moneyOf(input.door === "rent" ? bareBook(book) : book, role, assign.model, seconds, inn, out) : { base: null, marked: null };
    if (input.door === "rent" && book) {
      const only = moneyOf(bareBook(book), role, assign.model, seconds, inn, out);
      lines.push({ role, provider: assign.provider, model: assign.model, base: only.base, marked: only.base });
      return;
    }
    lines.push({ role, provider: assign.provider, model: assign.model, base: priced.base, marked: priced.marked });
  };

  if (scope === "full" && roles.asr) push("asr", roles.asr);

  const spoken = translateTokens(seconds);
  const review = reviewTokens(seconds);
  let inn = spoken.inn;
  let out = spoken.out;
  if (!roles.context) {
    inn += CONTEXT_TOKENS.inn;
    out += CONTEXT_TOKENS.out;
  }
  if (!roles.review) {
    inn += review.inn;
    out += review.out;
  }
  if (roles.translate) push("translate", roles.translate, inn, out);
  if (scope === "full" && roles.context) push("context", roles.context, CONTEXT_TOKENS.inn, CONTEXT_TOKENS.out);
  if (roles.review) push("review", roles.review, review.inn, review.out);
  if (scope === "full" && roles.summary && !sameAssign(roles.summary, roles.context)) push("summary", roles.summary, SUMMARY_TOKENS.inn, SUMMARY_TOKENS.out);

  const narrationOn = scope === "full" && input.narration && Boolean(roles.narration);
  if (narrationOn && roles.narration) push("narration", roles.narration);

  const narrationLine = lines.find((line) => line.role === "narration") ?? null;
  const ticketLines = lines.filter((line) => line.role !== "narration");
  const sum = (rows: QuoteLine[], key: "base" | "marked") => {
    if (rows.some((line) => line[key] == null)) return null;
    return rows.reduce((total, line) => total + (line[key] ?? 0), 0);
  };
  const marked = sum(ticketLines, "marked");
  const base = sum(lines, "base");
  const ready =
    scope === "translate"
      ? Boolean(roles.translate && ticketLines.length > 0 && marked != null && marked > 0)
      : Boolean(roles.asr && roles.translate && ticketLines.length > 0 && marked != null && marked > 0 && (!narrationOn || narrationLine?.marked != null));
  const hold = input.door === "turn" && ready && marked != null ? Math.ceil(marked * HOLD_BUFFER) : 0;
  return {
    lines,
    base,
    marked: ready ? (marked ?? 0) + (narrationOn ? narrationLine?.marked ?? 0 : 0) : marked,
    hold,
    narration: narrationOn ? narrationLine?.marked ?? null : 0,
    ready,
  };
}

function assignOf(value: unknown): RoleAssign | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { provider?: unknown; model?: unknown };
  if (typeof row.provider !== "string" || !isProviderId(row.provider)) return null;
  if (typeof row.model !== "string" || !MODEL_RE.test(row.model)) return null;
  return { provider: row.provider, model: row.model };
}

export function checkServicePack(input: ServicePack): ServicePack {
  const id = String(input.id || "").trim();
  if (!PACK_RE.test(id)) throw new Error("Mã gói không đúng.");
  const name = String(input.name || "").trim().slice(0, 60);
  if (name.length < 2) throw new Error("Hãy đặt tên gói.");
  const note = String(input.note || "").trim().slice(0, 180);
  const doors = (Array.isArray(input.doors) ? input.doors : []).filter((door): door is ServiceDoor => door === "turn" || door === "rent");
  if (!doors.length) throw new Error("Gói phải mở ít nhất một cửa.");
  const roles: ServicePack["roles"] = {};
  for (const role of PACK_ROLES) {
    const assign = assignOf(input.roles?.[role]);
    if (assign) roles[role] = assign;
  }
  if (!roles.asr || !roles.translate) throw new Error("Gói cần model nhận dạng và model dịch.");
  for (const role of PACK_ROLES) {
    const assign = roles[role];
    if (assign && !providersForRole(role).includes(assign.provider)) throw new Error(`Việc ${PACK_ROLE_LABEL[role]} chưa chạy bằng ${assign.provider}.`);
  }
  // TyZo chạy bằng máy GPU của phòng, chỉ thu tiền qua phiếu Trả theo lượt; Thuê phòng dùng key của khách nên không có TyZo.
  if (roles.asr.provider === "tyzo-modal" && doors.includes("rent")) throw new Error("TyZo chỉ mở ở cửa Trả theo lượt.");
  return { id, name, note, enabled: Boolean(input.enabled), doors: [...new Set(doors)], roles };
}

export function checkServicePacks(input: unknown): ServicePack[] {
  if (!Array.isArray(input) || input.length > 24) throw new Error("Danh sách gói không đúng.");
  const packs = input.map((item) => checkServicePack(item as ServicePack));
  const ids = new Set(packs.map((pack) => pack.id));
  if (ids.size !== packs.length) throw new Error("Hai gói đang trùng mã.");
  return packs;
}

/**
 * Đọc gói đã lưu. Mỗi gói đọc riêng: một gói hỏng không làm mất các gói khác. Việc phụ (thuyết minh, ngữ cảnh,
 * đối chiếu, tóm tắt) giao cho nhà đã tắt (ready: false) thì bỏ việc đó, giữ gói; nhận dạng hoặc dịch giao cho nhà
 * đã tắt thì bỏ gói đó (Admin sửa lại ở Cấu hình → Gói).
 */
export function parseServicePacks(raw: string | null | undefined): ServicePack[] {
  if (!raw) return [];
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const out: ServicePack[] = [];
  for (const item of list.slice(0, 24)) {
    if (!item || typeof item !== "object") continue;
    const pack = item as ServicePack;
    const roles: ServicePack["roles"] = { ...(pack.roles ?? {}) };
    for (const role of PACK_ROLES) {
      const assign = assignOf(roles[role]);
      if (role !== "asr" && role !== "translate" && assign && !providersForRole(role).includes(assign.provider)) delete roles[role];
    }
    try {
      const checked = checkServicePack({ ...pack, roles });
      if (!out.some((p) => p.id === checked.id)) out.push(checked);
    } catch {
      // gói này không dùng được nữa; các gói khác vẫn giữ
    }
  }
  return out;
}

export function packsForDoor(packs: ServicePack[], door: ServiceDoor) {
  return packs.filter((pack) => pack.enabled && pack.doors.includes(door));
}

export function providersIn(pack: ServicePack): ProviderId[] {
  const found = new Set<ProviderId>();
  for (const role of PACK_ROLES) {
    const assign = pack.roles[role];
    if (assign) found.add(assign.provider);
  }
  return [...found];
}
