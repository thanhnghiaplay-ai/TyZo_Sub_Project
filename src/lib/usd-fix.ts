import type { GroqLiveRow } from "./sub/groq-board.ts";

/** Số đô la Chủ gõ khi bảng tự lấy sai. Trống thì dùng số tự lấy. */
export type UsdSlot = { hour: number | null; inn: number | null; out: number | null; chars: number | null };

export type UsdFix = Record<string, UsdSlot>;

const ID_RE = /^[a-z0-9./_-]{2,80}$/i;

function usd(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return null;
  return Math.round(n * 1e6) / 1e6;
}

export function emptySlot(): UsdSlot {
  return { hour: null, inn: null, out: null, chars: null };
}

export function parseUsdFix(raw: string | null | undefined): UsdFix {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return {};
    const out: UsdFix = {};
    for (const [id, value] of Object.entries(data)) {
      if (!ID_RE.test(id) || !value || typeof value !== "object") continue;
      const row = value as Partial<UsdSlot>;
      const slot: UsdSlot = {
        hour: usd(row.hour),
        inn: usd(row.inn),
        out: usd(row.out),
        chars: usd(row.chars),
      };
      if (slot.hour || slot.inn || slot.out || slot.chars) out[id] = slot;
    }
    return out;
  } catch {
    return {};
  }
}

/** Phủ số Chủ sửa lên bảng tự lấy. Ô trống giữ số tự lấy. */
export function applyUsdFix(rows: GroqLiveRow[], fix: UsdFix): GroqLiveRow[] {
  return rows.map((row) => {
    const slot = fix[row.id];
    if (!slot) return row;
    return {
      ...row,
      usdPerHour: slot.hour ?? row.usdPerHour,
      usdIn: slot.inn ?? row.usdIn,
      usdOut: slot.out ?? row.usdOut,
      usdPerMillionChars: slot.chars ?? row.usdPerMillionChars,
    };
  });
}

/** Token dịch cho một khoản đô la. 1 Token dịch = 1 giây tiếng của Turbo theo giá niêm yết. */
export function tokensForUsd(usdAmount: number, turboUsdPerHour: number): number | null {
  if (!(usdAmount > 0) || !(turboUsdPerHour > 0)) return null;
  const perSecond = turboUsdPerHour / 3600;
  return Math.max(1, Math.ceil(usdAmount / perSecond - 1e-9));
}

export function tokenPriceLine(row: GroqLiveRow, turboUsdPerHour: number): string {
  const n = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
  if (row.usdPerHour != null && row.usdPerHour > 0) {
    const tokens = tokensForUsd(row.usdPerHour, turboUsdPerHour);
    return tokens == null ? "Chưa có giá Turbo" : `${n(tokens)} Token dịch mỗi giờ tiếng`;
  }
  if (row.usdPerMillionChars != null && row.usdPerMillionChars > 0) {
    const tokens = tokensForUsd(row.usdPerMillionChars, turboUsdPerHour);
    return tokens == null ? "Chưa có giá Turbo" : `${n(tokens)} Token dịch mỗi triệu ký tự`;
  }
  const inn = row.usdIn != null && row.usdIn > 0 ? tokensForUsd(row.usdIn, turboUsdPerHour) : null;
  const out = row.usdOut != null && row.usdOut > 0 ? tokensForUsd(row.usdOut, turboUsdPerHour) : null;
  if (inn == null && out == null) return "Chưa có giá";
  return `${inn == null ? "—" : n(inn)} vào / ${out == null ? "—" : n(out)} ra Token dịch mỗi triệu token chữ`;
}
