import type { Sql } from "../db.ts";
import { ALIBABA_ROWS } from "./alibaba-catalog.ts";
import { ALIBABA_PRICE_PAGE, acceptQuote, mergeAlibaba, parseSingaporePrices, type AliQuote } from "./alibaba-price.ts";
import type { GroqLiveRow } from "./groq-board.ts";

const FRESH_MS = 6 * 3600 * 1000;
let refreshing = false;

type Stored = { at: number; quotes: AliQuote[] };

async function save(sql: Sql, board: Stored) {
  const value = JSON.stringify(board);
  await sql`insert into room_settings (key, value) values ('ali_board', ${value}) on conflict (key) do update set value = ${value}`;
}

const fetchText = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

/** Kéo giá Singapore và lưu. Lỗi thì giữ bảng cũ. */
export async function refreshAlibabaBoard(sql: Sql, fetchPage: (url: string) => Promise<string> = fetchText, now = Date.now()) {
  if (refreshing) return;
  refreshing = true;
  try {
    const raw = await fetchPage(ALIBABA_PRICE_PAGE);
    const quotes = parseSingaporePrices(raw, ALIBABA_ROWS.map((row) => row.id)).filter((quote) =>
      acceptQuote(quote, ALIBABA_ROWS.find((row) => row.id === quote.id)),
    );
    await save(sql, { at: now, quotes });
  } catch {
    /* giữ giá đã lưu */
  } finally {
    refreshing = false;
  }
}

/** Bảng giá Alibaba để tính giây. Chưa kéo được thì dùng giá dự phòng trong app. */
export async function loadAlibabaRows(sql: Sql, fetchPage: (url: string) => Promise<string> = fetchText): Promise<GroqLiveRow[]> {
  const raw = await sql<{ value: string }>`select value from room_settings where key = 'ali_board'`;
  let stored: Stored | null = null;
  try {
    stored = raw[0]?.value ? (JSON.parse(raw[0].value) as Stored) : null;
  } catch {
    stored = null;
  }
  if (!stored || Date.now() - stored.at > FRESH_MS) void refreshAlibabaBoard(sql, fetchPage);
  return mergeAlibaba(Array.isArray(stored?.quotes) ? stored.quotes : []);
}
