import type { Sql } from "./db";
import { parseRunDesk } from "./run-desk";
import type { PriceBook } from "./run-bill";
import { withDeadline } from "./retry-load";
import type { GroqBoard } from "./sub/groq-board";

const FRESH_MS = 6 * 3600 * 1000;
const FETCH_MS = 4000;

let refreshing = false;

/**
 * Bảng giá dùng để tính tiền. Có bản đã lưu thì trả ngay, không chờ tải trang giá.
 * Bản cũ thì làm mới nền. Chưa có bản nào thì thử tải ngắn, quá hạn thì trả null.
 */
export async function loadPriceBook(sql: Sql): Promise<PriceBook | null> {
  const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_board'`;
  const deskRaw = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
  const desk = parseRunDesk(deskRaw[0]?.value);
  let stored: { at: number; board: GroqBoard } | null = null;
  try {
    stored = saved[0]?.value ? (JSON.parse(saved[0].value) as { at: number; board: GroqBoard }) : null;
  } catch {
    stored = null;
  }
  const board = stored?.board ?? null;
  const stale = !stored || Date.now() - stored.at > FRESH_MS;
  if (board && stale) void refreshBoard(sql);
  const fixRaw = await sql<{ value: string }>`select value from room_settings where key = 'usd_fix'`;
  const { applyUsdFix, parseUsdFix } = await import("./usd-fix");
  const rows = board ? applyUsdFix(board.rows, parseUsdFix(fixRaw[0]?.value)) : null;
  if (board && rows) return { rate: board.rate, rows, desk: { markup: desk.markup, custom: desk.custom } };
  const fresh = await pullBoard(sql);
  if (!fresh) return null;
  return { rate: fresh.rate, rows: applyUsdFix(fresh.rows, parseUsdFix(fixRaw[0]?.value)), desk: { markup: desk.markup, custom: desk.custom } };
}

async function refreshBoard(sql: Sql) {
  if (refreshing) return;
  refreshing = true;
  try {
    await pullBoard(sql);
  } finally {
    refreshing = false;
  }
}

async function pullBoard(sql: Sql): Promise<GroqBoard | null> {
  try {
    const { fetchGroqBoard } = await import("./sub/groq-board-load");
    const board = await withDeadline(fetchGroqBoard(), FETCH_MS);
    const value = JSON.stringify({ at: Date.now(), board });
    await sql`
      insert into room_settings (key, value) values ('run_board', ${value})
      on conflict (key) do update set value = ${value}
    `;
    return board;
  } catch {
    return null;
  }
}
