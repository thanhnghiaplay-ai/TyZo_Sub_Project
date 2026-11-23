import { pageText } from "../live/live-price.ts";
import { AURA_PRICE_ID } from "./aura.ts";
import { DEEPGRAM_BASE_ROWS, DEEPGRAM_MULTI_ID, DEEPGRAM_NOVA_ID } from "./deepgram-base.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/** Trang giá chính thức của Deepgram. Cột đầu (Pay as you go) là giá lấy. */
export const DEEPGRAM_PRICE_PAGE = "https://deepgram.com/pricing";

export type DgQuote = { id: string; usdPerHour: number | null; usdPerMillionChars: number | null };

/** Chủ chỉnh cách tự cập nhật. `auto` tắt thì không kéo giá nữa, dùng số đã lưu hoặc dự phòng. */
export type DgPriceConfig = { auto: boolean; everyHours: number };
export const DG_CONFIG_KEY = "dg_price_cfg";
const DG_CONFIG_DEFAULT: DgPriceConfig = { auto: true, everyHours: 6 };
const DG_EVERY_MIN = 1;
const DG_EVERY_MAX = 168;

export function parseDgConfig(raw: string | null | undefined): DgPriceConfig {
  if (!raw) return { ...DG_CONFIG_DEFAULT };
  try {
    const data = JSON.parse(raw) as Partial<DgPriceConfig> | null;
    const hours = Math.round(Number(data?.everyHours));
    return {
      auto: data?.auto === false ? false : true,
      everyHours: Number.isFinite(hours) ? Math.min(DG_EVERY_MAX, Math.max(DG_EVERY_MIN, hours)) : DG_CONFIG_DEFAULT.everyHours,
    };
  } catch {
    return { ...DG_CONFIG_DEFAULT };
  }
}

/** Bỏ giá cũ bị gạch (thẻ s/del/strike hoặc ~~markdown~~) để không lấy nhầm giá khuyến mãi đã hết. */
export function withoutStruck(raw: string): string {
  return raw
    .replace(/<(s|del|strike)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/~~[\s\S]*?~~/g, " ");
}

function lineOf(text: string, label: RegExp): string | null {
  for (const line of text.split("\n")) {
    if (label.test(line)) return line;
  }
  return null;
}

function firstDollar(line: string): number | null {
  const match = line.match(/\$\s*(\d+(?:\.\d+)?)/);
  const n = match ? Number(match[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Đọc giá Nova-3 (đơn ngữ, đa ngữ) và Aura-2 từ trang giá. Dòng nào không thấy thì bỏ, không đoán. */
export function parseDeepgramPrices(raw: string): DgQuote[] {
  const text = pageText(withoutStruck(raw));
  const out: DgQuote[] = [];
  const mono = lineOf(text, /Nova-?3\s*Monolingual/i);
  const multi = lineOf(text, /Nova-?3\s*Multilingual/i);
  const aura = lineOf(text, /(?<![A-Za-z0-9-])Aura-?2(?![A-Za-z0-9-])/i);
  const perMin = (line: string | null) => {
    if (!line || !/\/\s*min/i.test(line)) return null;
    const usd = firstDollar(line);
    return usd == null ? null : Math.round(usd * 60 * 1e6) / 1e6;
  };
  const monoHour = perMin(mono);
  if (monoHour != null) out.push({ id: DEEPGRAM_NOVA_ID, usdPerHour: monoHour, usdPerMillionChars: null });
  const multiHour = perMin(multi);
  if (multiHour != null) out.push({ id: DEEPGRAM_MULTI_ID, usdPerHour: multiHour, usdPerMillionChars: null });
  if (aura && /1k\s*char|1,000\s*char/i.test(aura)) {
    const usd = firstDollar(aura);
    if (usd != null) out.push({ id: AURA_PRICE_ID, usdPerHour: null, usdPerMillionChars: Math.round(usd * 1000 * 1e6) / 1e6 });
  }
  return out;
}

function inBand(got: number | null, base: number | null): boolean {
  if (got == null) return true;
  if (!(got > 0)) return false;
  if (base != null && base > 0) return got >= base / 5 && got <= base * 5;
  return false;
}

/** Giá lệch quá xa giá dự phòng (dưới 1/5 hoặc trên 5 lần) coi là đọc sai trang, không nhận. */
export function acceptDgQuote(quote: DgQuote, base: GroqLiveRow | undefined): DgQuote | null {
  if (!base) return null;
  if (quote.usdPerHour == null && quote.usdPerMillionChars == null) return null;
  if (!inBand(quote.usdPerHour, base.usdPerHour) || !inBand(quote.usdPerMillionChars, base.usdPerMillionChars)) return null;
  return quote;
}

/** Phủ giá đã nhận lên bảng dự phòng. Ô không lấy được thì giữ số cũ. */
export function mergeDeepgram(quotes: DgQuote[]): GroqLiveRow[] {
  return DEEPGRAM_BASE_ROWS.map((row) => {
    const got = quotes.find((item) => item.id === row.id);
    const ok = got ? acceptDgQuote(got, row) : null;
    if (!ok) return { ...row };
    return { ...row, usdPerHour: ok.usdPerHour ?? row.usdPerHour, usdPerMillionChars: ok.usdPerMillionChars ?? row.usdPerMillionChars };
  });
}

/** Đọc JSON khóa `dg_board`. Hỏng hoặc trống thì null. */
export function parseDgBoard(raw: string | null | undefined): { at: number; quotes: DgQuote[] } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { at: number; quotes: DgQuote[] };
  } catch {
    return null;
  }
}

/** Bảng Deepgram đã gộp giá tự kéo. Chưa phủ số Chủ sửa tay (`usd_fix`). */
export function rowsFromDgStored(stored: { quotes?: DgQuote[] } | null | undefined): GroqLiveRow[] {
  const quotes = stored && typeof stored === "object" && Array.isArray(stored.quotes) ? stored.quotes : [];
  return mergeDeepgram(quotes);
}

export function rowsFromStoredDeepgram(raw: string | null | undefined): GroqLiveRow[] {
  return rowsFromDgStored(parseDgBoard(raw));
}
