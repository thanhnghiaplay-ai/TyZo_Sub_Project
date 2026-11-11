import { asrCost, chatCost, speechCost, HOLD_BUFFER, type PriceBook } from "./run-bill.ts";
import { isProviderId, type ProviderId } from "./sub/provider.ts";

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
export type ServiceDoor = (typeof DOORS)[number];

export const DOOR_LABEL: Record<ServiceDoor, string> = {
  turn: "Trả theo lượt",
  rent: "Thuê phòng",
};

export type RoleAssign = { provider: ProviderId; model: string };

export type ServicePack = {
  id: string;
  name: string;
  note: string;
  enabled: boolean;
  doors: ServiceDoor[];
  roles: Partial<Record<PackRole, RoleAssign>>;
};

export type QuoteLine = {
  role: PackRole;
  provider: ProviderId;
  model: string;
  /** Giá gốc, chưa chênh. null khi nhà cung cấp chưa niêm yết. */
  base: number | null;
  /** Giá khách trả ở cửa trả theo lượt. null khi chưa đủ giá. */
  marked: number | null;
};

export type PackQuote = {
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
export const SUMMARY_TOKENS = { inn: 4000, out: 800 };
export const TRANSLATE_IN_PER_SEC = 12;
export const TRANSLATE_OUT_PER_SEC = 8;
export const TRANSLATE_IN_FIXED = 1500;
export const TRANSLATE_OUT_FIXED = 500;
/** Phần đối chiếu ước bằng 35% lượt dịch. */
export const REVIEW_SHARE = 0.35;
/** Ký tự thuyết minh ước theo giây hình. */
export const NARRATION_CHARS_PER_SEC = 14;

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
}): PackQuote {
  const seconds = Math.max(0, input.seconds);
  const bookFor = (provider: ProviderId) => input.books[provider];
  const roles = input.pack.roles;
  const lines: QuoteLine[] = [];

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

  if (roles.asr) push("asr", roles.asr);

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
  if (roles.context) push("context", roles.context, CONTEXT_TOKENS.inn, CONTEXT_TOKENS.out);
  if (roles.review) push("review", roles.review, review.inn, review.out);
  if (roles.summary && !sameAssign(roles.summary, roles.context)) push("summary", roles.summary, SUMMARY_TOKENS.inn, SUMMARY_TOKENS.out);

  const narrationOn = input.narration && Boolean(roles.narration);
  if (narrationOn && roles.narration) push("narration", roles.narration);

  const narrationLine = lines.find((line) => line.role === "narration") ?? null;
  const ticketLines = lines.filter((line) => line.role !== "narration");
  const sum = (rows: QuoteLine[], key: "base" | "marked") => {
    if (rows.some((line) => line[key] == null)) return null;
    return rows.reduce((total, line) => total + (line[key] ?? 0), 0);
  };
  const marked = sum(ticketLines, "marked");
  const base = sum(lines, "base");
  const ready = Boolean(roles.asr && roles.translate && ticketLines.length > 0 && marked != null && marked > 0 && (!narrationOn || narrationLine?.marked != null));
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
  return { id, name, note, enabled: Boolean(input.enabled), doors: [...new Set(doors)], roles };
}

export function checkServicePacks(input: unknown): ServicePack[] {
  if (!Array.isArray(input) || input.length > 24) throw new Error("Danh sách gói không đúng.");
  const packs = input.map((item) => checkServicePack(item as ServicePack));
  const ids = new Set(packs.map((pack) => pack.id));
  if (ids.size !== packs.length) throw new Error("Hai gói đang trùng mã.");
  return packs;
}

export function parseServicePacks(raw: string | null | undefined): ServicePack[] {
  if (!raw) return [];
  try {
    return checkServicePacks(JSON.parse(raw));
  } catch {
    return [];
  }
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
