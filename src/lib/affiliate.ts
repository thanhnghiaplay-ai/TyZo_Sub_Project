import { PAYOUT_BANKS } from "./payment/pay-match.ts";

/**
 * Hoa hồng cộng tác viên TÍNH TRÊN LỜI, không tính trên doanh thu (Chủ chốt 22/11/2026:
 * «phần lời thật sự của web không thể thấp sau khi trừ hoa hồng»).
 *
 *   doanh thu R (tiền khách chuyển)
 *   − giá vốn C (Token dịch: số Token × giá gốc Turbo mỗi giây lúc mua; gói thuê phòng: 0, khách dùng key của mình)
 *   − chi phí vận hành O = R × opexBp (máy chủ, cơ sở dữ liệu, VPS, phí cổng…)
 *   = lời gộp P
 *   Hoa hồng K = P × tỷ lệ, nhưng không quá P × maxShareBp, và maxShareBp không bao giờ quá MAX_SHARE_CAP_BP (50%).
 *   Lời gộp dưới minMarginBp của doanh thu (đơn quá mỏng, đang giảm giá…) thì không có hoa hồng.
 * Nên web luôn giữ ít nhất một nửa lời gộp của mỗi đơn có hoa hồng.
 */
export type AffiliateRules = {
  /** Tỷ lệ trên lời gộp của gói thuê phòng. */
  ratePlanBp: number;
  /** Tỷ lệ trên lời gộp của đơn mua Token dịch (tên cũ «lượt», giữ để không đổi dữ liệu đã lưu). */
  rateRunBp: number;
  holdDays: number;
  windowDays: number;
  minPayout: number;
  /** Chi phí vận hành ước tính, phần vạn của doanh thu. */
  opexBp: number;
  /** Hoa hồng tối đa, phần vạn của lời gộp (kẹp ≤ MAX_SHARE_CAP_BP). */
  maxShareBp: number;
  /** Lời gộp tối thiểu, phần vạn của doanh thu, để đơn có hoa hồng. */
  minMarginBp: number;
};

/** Trần cứng: hoa hồng không bao giờ quá nửa lời gộp, dù Admin đặt gì. */
export const MAX_SHARE_CAP_BP = 5000;

export const AFFILIATE_DEFAULT: AffiliateRules = {
  ratePlanBp: 2000,
  rateRunBp: 2000,
  holdDays: 14,
  windowDays: 0,
  minPayout: 200000,
  opexBp: 1500,
  maxShareBp: 4000,
  minMarginBp: 1500,
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
      opexBp: clampInt(data.opexBp, 0, 5000, AFFILIATE_DEFAULT.opexBp),
      maxShareBp: clampInt(data.maxShareBp, 0, MAX_SHARE_CAP_BP, AFFILIATE_DEFAULT.maxShareBp),
      minMarginBp: clampInt(data.minMarginBp, 0, 9000, AFFILIATE_DEFAULT.minMarginBp),
    };
  } catch {
    return { ...AFFILIATE_DEFAULT };
  }
}

type CommissionCalc = {
  revenue: number;
  cost: number;
  opex: number;
  /** Lời gộp sau giá vốn và chi phí vận hành. */
  profit: number;
  amount: number;
  /** Phần web giữ lại = profit − amount. */
  kept: number;
  /** Vì sao bằng 0 (rỗng khi có hoa hồng). */
  reason: "" | "lo" | "mong" | "ty-le-0";
};

/** Hoa hồng của một đơn. Hàm thuần, mọi đường tính hoa hồng đều qua đây. */
export function commissionFor(input: { revenue: number; cost: number; rateBp: number; rules: AffiliateRules }): CommissionCalc {
  const revenue = Math.max(0, Math.round(Number(input.revenue) || 0));
  const cost = Math.max(0, Math.round(Number(input.cost) || 0));
  const opex = Math.ceil((revenue * clampInt(input.rules.opexBp, 0, 5000, AFFILIATE_DEFAULT.opexBp)) / 10000);
  const profit = revenue - cost - opex;
  const base = { revenue, cost, opex, profit, amount: 0, kept: Math.max(0, profit) };
  if (profit <= 0) return { ...base, reason: "lo" };
  if (profit * 10000 < revenue * clampInt(input.rules.minMarginBp, 0, 9000, AFFILIATE_DEFAULT.minMarginBp)) return { ...base, reason: "mong" };
  const rate = clampBp(input.rateBp, 0);
  if (rate <= 0) return { ...base, reason: "ty-le-0" };
  const share = Math.min(clampInt(input.rules.maxShareBp, 0, MAX_SHARE_CAP_BP, AFFILIATE_DEFAULT.maxShareBp), MAX_SHARE_CAP_BP);
  const amount = Math.min(Math.floor((profit * rate) / 10000), Math.floor((profit * share) / 10000));
  return { ...base, amount, kept: profit - amount, reason: amount > 0 ? "" : "ty-le-0" };
}

export const COMMISSION_REASON: Record<CommissionCalc["reason"], string> = {
  "": "",
  lo: "Đơn không có lời sau giá vốn và chi phí vận hành",
  mong: "Lời quá mỏng so với doanh thu",
  "ty-le-0": "Tỷ lệ bằng 0",
};

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

export type PayoutBank = { bank: string; account: string; holder: string };

/** Kiểm tài khoản nhận tiền. Ném lỗi tiếng Việt khi sai. Tên chủ tài khoản viết hoa, bỏ dấu như trên thẻ. */
export function cleanPayoutBank(input: Partial<PayoutBank> | null | undefined): PayoutBank {
  const bank = String(input?.bank ?? "").trim().toLowerCase();
  if (!PAYOUT_BANKS.some((item) => item.id === bank)) throw new Error("Chọn ngân hàng trong danh sách.");
  const account = String(input?.account ?? "").replace(/[\s.-]/g, "");
  if (!/^\d{6,19}$/.test(account)) throw new Error("Số tài khoản gồm 6 đến 19 chữ số.");
  const holder = String(input?.holder ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (holder.length < 2 || holder.length > 60) throw new Error("Nhập tên chủ tài khoản như trên thẻ.");
  return { bank, account, holder };
}

export function bankName(id: string): string {
  return PAYOUT_BANKS.find((item) => item.id === id)?.name ?? id;
}

/** Che số tài khoản khi hiện lại: 0123456789 → ******6789. */
export function maskAccount(account: string): string {
  return account.length <= 4 ? account : "*".repeat(Math.min(6, account.length - 4)) + account.slice(-4);
}

export const SOURCE_LABEL: Record<string, string> = {
  goi: "Thuê phòng",
  token: "Mua Token dịch",
  luot: "Trả theo lượt (cách tính cũ)",
};

export const EVENT_STATUS_LABEL: Record<string, string> = {
  treo: "Đang chờ",
  "da-duyet": "Rút được",
  "cho-rut": "Đang rút",
  "da-chi": "Đã nhận",
  huy: "Đã hủy",
};
