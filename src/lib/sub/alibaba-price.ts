import { pageText } from "../live/live-price.ts";
import { ALIBABA_ROWS } from "./alibaba-catalog.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/** Trang giá chính thức. Chỉ lấy khối Singapore (vùng quốc tế). */
export const ALIBABA_PRICE_PAGE = "https://www.alibabacloud.com/help/en/model-studio/model-pricing";

export type AliQuote = {
  id: string;
  usdIn: number | null;
  usdOut: number | null;
  usdPerHour: number | null;
  usdPerMillionChars: number | null;
};

const REGION = /Singapore|China\s*\(|US\s*\(|Hong Kong|Germany|Japan\s*\(/gi;

function headingAt(text: string, index: number): boolean {
  const start = text.lastIndexOf("\n", index - 1) + 1;
  const end = text.indexOf("\n", index);
  const line = text.slice(start, end < 0 ? text.length : end).trim();
  return line.length > 0 && line.length < 40;
}

/** Ghép mọi khối đứng sau tiêu đề Singapore, dừng trước vùng khác. */
export function singaporeText(raw: string): string {
  const text = pageText(raw);
  const marks = [...text.matchAll(REGION)].filter((mark) => headingAt(text, mark.index ?? 0));
  let out = "";
  for (let i = 0; i < marks.length; i += 1) {
    if (!/^Singapore/i.test(marks[i][0])) continue;
    const start = (marks[i].index ?? 0) + marks[i][0].length;
    const end = marks[i + 1]?.index ?? text.length;
    out += `\n${text.slice(start, end)}`;
  }
  return out;
}

function lineOf(text: string, id: string): string | null {
  const re = new RegExp(`(?<![A-Za-z0-9-])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9-])`);
  for (const line of text.split("\n")) {
    if (re.test(line)) return line;
  }
  return null;
}

function quoteOf(id: string, line: string): AliQuote | null {
  const sec = line.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*second|per second)/i);
  if (sec) {
    const per = Number(sec[1]);
    if (!(per > 0)) return null;
    return { id, usdIn: null, usdOut: null, usdPerHour: per * 3600, usdPerMillionChars: null };
  }
  const dollars = [...line.matchAll(/\$\s*(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1])).filter((n) => n > 0);
  if (/character/i.test(line) && dollars[0]) {
    return { id, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: dollars[0] };
  }
  if (dollars.length >= 2) {
    return { id, usdIn: dollars[0], usdOut: dollars[1], usdPerHour: null, usdPerMillionChars: null };
  }
  return null;
}

/** Đọc giá Singapore của các model được hỏi. Model không thấy thì bỏ, không đoán. */
export function parseSingaporePrices(raw: string, ids: string[]): AliQuote[] {
  const text = singaporeText(raw);
  const out: AliQuote[] = [];
  for (const id of ids) {
    const line = lineOf(text, id);
    if (!line) continue;
    const quote = quoteOf(id, line);
    if (quote) out.push(quote);
  }
  return out;
}

function inBand(got: number | null, base: number | null, looseMax: number): boolean {
  if (got == null) return true;
  if (!(got > 0)) return false;
  if (base != null && base > 0) return got >= base / 5 && got <= base * 5;
  return got <= looseMax && got >= looseMax / 1000;
}

/** Giá lệch quá xa giá dự phòng thì bỏ. Model chưa có giá dự phòng chỉ nhận mức hợp lý. */
export function acceptQuote(quote: AliQuote, base: GroqLiveRow | undefined): AliQuote | null {
  if (!inBand(quote.usdPerHour, base?.usdPerHour ?? null, 20)) return null;
  if (!inBand(quote.usdIn, base?.usdIn ?? null, 50)) return null;
  if (!inBand(quote.usdOut, base?.usdOut ?? null, 80)) return null;
  if (!inBand(quote.usdPerMillionChars, base?.usdPerMillionChars ?? null, 100)) return null;
  if (quote.usdPerHour == null && quote.usdIn == null && quote.usdOut == null && quote.usdPerMillionChars == null) return null;
  return quote;
}

/** Phủ giá đã nhận lên bảng dự phòng. Ô không lấy được thì giữ số cũ. */
export function mergeAlibaba(quotes: AliQuote[]): GroqLiveRow[] {
  return ALIBABA_ROWS.map((row) => {
    const got = quotes.find((item) => item.id === row.id);
    const ok = got ? acceptQuote(got, row) : null;
    if (!ok) return { ...row };
    return {
      ...row,
      usdIn: ok.usdIn ?? row.usdIn,
      usdOut: ok.usdOut ?? row.usdOut,
      usdPerHour: ok.usdPerHour ?? row.usdPerHour,
      usdPerMillionChars: ok.usdPerMillionChars ?? row.usdPerMillionChars,
    };
  });
}

/** Đọc JSON khóa `ali_board`. Hỏng hoặc trống thì null (người gọi giữ bảng dự phòng). */
export function parseAliBoard(raw: string | null | undefined): { at: number; quotes: AliQuote[] } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { at: number; quotes: AliQuote[] };
  } catch {
    return null;
  }
}

/** Bảng Alibaba đã gộp giá tự kéo. Chưa phủ số Chủ sửa tay (`usd_fix`). */
export function rowsFromStoredAlibaba(raw: string | null | undefined): GroqLiveRow[] {
  const stored = parseAliBoard(raw);
  const quotes = stored && typeof stored === "object" && Array.isArray(stored.quotes) ? stored.quotes : [];
  return mergeAlibaba(quotes);
}
