export type AffiliateRules = {
  ratePlanBp: number;
  rateRunBp: number;
  holdDays: number;
  windowDays: number;
  minPayout: number;
};

export const AFFILIATE_DEFAULT: AffiliateRules = {
  ratePlanBp: 2000,
  rateRunBp: 2000,
  holdDays: 14,
  windowDays: 0,
  minPayout: 200000,
};

export function parseAffiliateRules(raw: string | null | undefined): AffiliateRules {
  if (!raw) return { ...AFFILIATE_DEFAULT };
  try {
    const data = JSON.parse(raw) as Partial<AffiliateRules>;
    return {
      ratePlanBp: clampBp(data.ratePlanBp, AFFILIATE_DEFAULT.ratePlanBp),
      rateRunBp: clampBp(data.rateRunBp, AFFILIATE_DEFAULT.rateRunBp),
      holdDays: clampInt(data.holdDays, 0, 90, AFFILIATE_DEFAULT.holdDays),
      windowDays: clampInt(data.windowDays, 0, 3650, AFFILIATE_DEFAULT.windowDays),
      minPayout: clampInt(data.minPayout, 0, 100_000_000, AFFILIATE_DEFAULT.minPayout),
    };
  } catch {
    return { ...AFFILIATE_DEFAULT };
  }
}

function clampBp(value: unknown, fallback: number) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10000, Math.max(0, n));
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Hoa hồng gói thuê: tỷ lệ trên giá gói. Khách tự trả key, không có giá vốn Groq. */
export function planCommission(price: number, rateBp: number) {
  return Math.floor((Math.max(0, price) * clampBp(rateBp, 0)) / 10000);
}

/**
 * Hoa hồng lượt dùng key phòng: tỷ lệ trên lãi gộp, và không bao giờ quá một nửa lãi.
 * Lãi không dương thì không trả.
 */
export function runCommission(charged: number, base: number, rateBp: number) {
  const profit = Math.max(0, Math.round(charged) - Math.round(base));
  const raw = Math.floor((profit * clampBp(rateBp, 0)) / 10000);
  return Math.min(raw, Math.floor(profit / 2));
}

export function maskEmail(email: string) {
  const [name, host] = email.split("@");
  if (!name || !host) return "đã ẩn";
  return `${name.slice(0, 1)}***@${host}`;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function referralCode(bytes = new Uint8Array(8)) {
  return Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join("");
}
