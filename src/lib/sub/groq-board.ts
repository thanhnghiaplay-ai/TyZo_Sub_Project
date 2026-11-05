export type GroqLiveRow = {
  id: string;
  speed: number | null;
  usdIn: number | null;
  usdOut: number | null;
  usdPerHour: number | null;
  usdPerMillionChars: number | null;
  unlisted: boolean;
  limits: Array<{ value: string; unit: string }>;
  contextTokens: number | null;
  maxCompletionTokens: number | null;
  maxFile: string | null;
};

export type GroqBoard = {
  rate: number;
  rateDate: string;
  rows: GroqLiveRow[];
};

const ID_RE = /\b((?:[a-z0-9]+[./_-])+[a-z0-9]+)\s+(?=-|\d+\s)/;
const LIMIT_UNITS = "TPM|RPM|ASH|ASD|RPD|TPD";

const UNIT_VI: Record<string, string> = {
  TPM: "token/phút",
  RPM: "yêu cầu/phút",
  ASH: "giây/giờ",
  ASD: "giây/ngày",
  RPD: "yêu cầu/ngày",
  TPD: "token/ngày",
};

export function parseGroqModelsHtml(html: string): GroqLiveRow[] {
  const rows: GroqLiveRow[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const text = match[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const row = parseGroqModelLine(text);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return rows;
}

export function parseGroqModelLine(text: string): GroqLiveRow | null {
  const idMatch = text.match(ID_RE);
  if (!idMatch || idMatch.index == null) return null;
  const id = idMatch[1];
  const rest = text.slice(idMatch.index + id.length).trim();
  const tail = rest.match(/^(?<speed>-|\d+)\s+(?<mid>.+?)\s+(?<context>[\d,]+|-)\s+(?<max>[\d,]+|-)\s+(?<file>\d+(?:\.\d+)?\s*MB|-)$/);
  if (!tail?.groups) return null;
  const mid = tail.groups.mid;
  const unlisted = /contact sales/i.test(mid);
  const hour = mid.match(/\$(\d+(?:\.\d+)?)\s+per hour/i);
  const chars = mid.match(/\$(\d+(?:\.\d+)?)\s+per 1M characters/i);
  const input = mid.match(/\$(\d+(?:\.\d+)?)\s+input/i);
  const output = mid.match(/\$(\d+(?:\.\d+)?)\s+output/i);
  const limits = [...mid.matchAll(new RegExp(`(\\d+(?:\\.\\d+)?[KMB]?)\\s+(${LIMIT_UNITS})`, "g"))].map((item) => ({
    value: item[1],
    unit: item[2],
  }));
  return {
    id,
    speed: tail.groups.speed === "-" ? null : Number(tail.groups.speed),
    usdIn: input ? Number(input[1]) : null,
    usdOut: output ? Number(output[1]) : null,
    usdPerHour: hour ? Number(hour[1]) : null,
    usdPerMillionChars: chars ? Number(chars[1]) : null,
    unlisted,
    limits,
    contextTokens: tokenCount(tail.groups.context),
    maxCompletionTokens: tokenCount(tail.groups.max),
    maxFile: tail.groups.file === "-" ? null : tail.groups.file.replace(/\s+/g, " "),
  };
}

export function formatLivePrice(row: GroqLiveRow, rate: number): string {
  if (row.unlisted || (row.usdIn == null && row.usdOut == null && row.usdPerHour == null && row.usdPerMillionChars == null)) {
    return "Groq không niêm yết";
  }
  if (row.usdPerHour != null) return `${vnd(row.usdPerHour * rate)}/giờ`;
  if (row.usdPerMillionChars != null) return `${vnd(row.usdPerMillionChars * rate)} mỗi triệu ký tự`;
  const inn = row.usdIn == null ? "—" : vnd(row.usdIn * rate);
  const out = row.usdOut == null ? "—" : vnd(row.usdOut * rate);
  return `${inn} vào / ${out} ra mỗi triệu token`;
}

export function formatLiveDetail(row: GroqLiveRow): string {
  const bits: string[] = [];
  if (row.speed) bits.push(`${count(row.speed)} token/giây`);
  if (row.contextTokens) bits.push(`cửa sổ ${count(row.contextTokens)} token`);
  if (row.maxCompletionTokens) bits.push(`tối đa ${count(row.maxCompletionTokens)} token mỗi lần trả lời`);
  for (const limit of row.limits) bits.push(`${expandAmount(limit.value)} ${UNIT_VI[limit.unit] || limit.unit}`);
  if (row.maxFile) bits.push(`file tối đa ${row.maxFile}`);
  return bits.join(" · ");
}

export function formatUsdCost(usd: number, rate: number): string {
  const amount = usd * rate;
  if (!(amount > 0)) return "0 đ";
  if (amount < 1) return "dưới 1 đ";
  return `khoảng ${vnd(amount)}`;
}

export function liveAsrPerSecond(rows: GroqLiveRow[], model: string, fallback: number): number {
  const row = rows.find((item) => item.id === model);
  if (row?.usdPerHour) return row.usdPerHour / 3600;
  return fallback;
}

function tokenCount(value: string): number | null {
  if (value === "-") return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function count(value: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function vnd(amount: number): string {
  return `${count(Math.round(amount))} đ`;
}

function expandAmount(token: string): string {
  const match = token.match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
  if (!match) return token;
  let n = Number(match[1]);
  const unit = (match[2] || "").toUpperCase();
  if (unit === "K") n *= 1000;
  if (unit === "M") n *= 1_000_000;
  if (unit === "B") n *= 1_000_000_000;
  return count(n);
}
