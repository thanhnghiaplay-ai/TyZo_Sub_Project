import type { Sql } from "../db.ts";
import { DEEPGRAM_BASE_ROWS } from "./deepgram-base.ts";
import { DEEPGRAM_PRICE_PAGE, DG_CONFIG_KEY, acceptDgQuote, parseDeepgramPrices, parseDgBoard, parseDgConfig, rowsFromDgStored, type DgQuote } from "./deepgram-price.ts";
import type { GroqLiveRow } from "./groq-board.ts";

const KEY = "dg_board";
let refreshing = false;

export type DgStored = { at: number; quotes: DgQuote[] };

const fetchText = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

export async function readDgStored(sql: Sql): Promise<DgStored | null> {
  const raw = await sql<{ value: string }>`select value from room_settings where key = ${KEY}`;
  return parseDgBoard(raw[0]?.value);
}

/** Kéo giá từ trang Deepgram và lưu. Lỗi thì giữ bảng cũ. Trả true nếu lưu được ít nhất một giá. */
export async function refreshDeepgramBoard(sql: Sql, fetchPage: (url: string) => Promise<string> = fetchText, now = Date.now()): Promise<boolean> {
  if (refreshing) return false;
  refreshing = true;
  try {
    const raw = await fetchPage(DEEPGRAM_PRICE_PAGE);
    const quotes = parseDeepgramPrices(raw).filter((quote) => acceptDgQuote(quote, DEEPGRAM_BASE_ROWS.find((row) => row.id === quote.id)));
    if (!quotes.length) return false;
    const value = JSON.stringify({ at: now, quotes } satisfies DgStored);
    await sql`insert into room_settings (key, value) values (${KEY}, ${value}) on conflict (key) do update set value = ${value}`;
    return true;
  } catch {
    return false;
  } finally {
    refreshing = false;
  }
}

/** Bảng giá Deepgram để tính tiền: dự phòng, phủ giá tự lấy, rồi phủ số Chủ sửa tay. Hết hạn thì kéo lại ngầm (nếu Chủ để tự động). */
export async function loadDeepgramRows(sql: Sql, fetchPage: (url: string) => Promise<string> = fetchText): Promise<GroqLiveRow[]> {
  const stored = await readDgStored(sql);
  const cfgRaw = await sql<{ value: string }>`select value from room_settings where key = ${DG_CONFIG_KEY}`;
  const cfg = parseDgConfig(cfgRaw[0]?.value);
  if (cfg.auto && (!stored || Date.now() - stored.at > cfg.everyHours * 3600 * 1000)) void refreshDeepgramBoard(sql, fetchPage);
  const merged = rowsFromDgStored(stored);
  const fixRaw = await sql<{ value: string }>`select value from room_settings where key = 'usd_fix'`;
  const { applyUsdFix, parseUsdFix } = await import("../usd-fix.ts");
  return applyUsdFix(merged, parseUsdFix(fixRaw[0]?.value));
}
