import type { Sql } from "../db.ts";
import { parseRunDesk } from "../run-desk.ts";
import type { LiveBook } from "./live-cost.ts";
import { LIVE_FALLBACK_ROWS, pullLiveBoard, type LiveBoard } from "./live-price.ts";

const FRESH_MS = 6 * 3600 * 1000;
let refreshing = false;

async function save(sql: Sql, board: LiveBoard) {
  const value = JSON.stringify(board);
  await sql`insert into room_settings (key, value) values ('live_board', ${value}) on conflict (key) do update set value = ${value}`;
}

/** Kéo giá từ trang Alibaba và lưu lại. Chạy nền, lỗi thì giữ giá cũ. */
export async function refreshLiveBoard(sql: Sql, stored: LiveBoard | null, fetchPage: (url: string) => Promise<string>, now = Date.now()) {
  if (refreshing) return;
  refreshing = true;
  try {
    const { board } = await pullLiveBoard(fetchPage, stored, now);
    await save(sql, board);
  } catch {
    /* giữ giá đã lưu */
  } finally {
    refreshing = false;
  }
}

const fetchText = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

/**
 * Bảng giá để tính tiền dịch trực tiếp: tỉ giá lấy từ bảng giá Groq đã lưu (cùng tỉ giá với cửa trả theo lượt),
 * phần chênh lấy từ cấu hình Alibaba. Chưa có tỉ giá thì trả null, không đoán.
 */
export async function loadLiveBook(sql: Sql, fetchPage: (url: string) => Promise<string> = fetchText): Promise<LiveBook | null> {
  const boardRaw = await sql<{ value: string }>`select value from room_settings where key = 'run_board'`;
  let rate = 0;
  try {
    rate = Number((JSON.parse(boardRaw[0]?.value ?? "null") as { board?: { rate?: unknown } } | null)?.board?.rate);
  } catch {
    rate = 0;
  }
  if (!(rate > 0)) return null;
  const deskRaw = await sql<{ value: string }>`select value from room_settings where key = 'alibaba_desk'`;
  const markup = parseRunDesk(deskRaw[0]?.value).markup;
  const liveRaw = await sql<{ value: string }>`select value from room_settings where key = 'live_board'`;
  let stored: LiveBoard | null = null;
  try {
    stored = liveRaw[0]?.value ? (JSON.parse(liveRaw[0].value) as LiveBoard) : null;
  } catch {
    stored = null;
  }
  if (!stored || Date.now() - stored.at > FRESH_MS) void refreshLiveBoard(sql, stored, fetchPage);
  return { rate, markup, rows: stored?.rows?.length ? stored.rows : LIVE_FALLBACK_ROWS };
}

export async function loadLiveCap(sql: Sql): Promise<number> {
  const raw = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
  return parseRunDesk(raw[0]?.value).cap;
}
