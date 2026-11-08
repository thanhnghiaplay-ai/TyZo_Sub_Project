import type { Sql } from "./db";
import { parseRunDesk } from "./run-desk";
import type { PriceBook } from "./run-bill";
import type { GroqBoard } from "./sub/groq-board";

const FRESH_MS = 6 * 3600 * 1000;

/**
 * Bảng giá dùng để tính tiền: lấy từ trang giá Groq và tỷ giá, lưu vào room_settings để mọi
 * máy chủ dùng chung. Tải lỗi thì dùng bản đã lưu, chưa từng có bản nào thì trả null (không tính được).
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
  let board = stored?.board ?? null;
  if (!stored || Date.now() - stored.at > FRESH_MS) {
    try {
      const { fetchGroqBoard } = await import("./sub/groq-board-load");
      board = await fetchGroqBoard();
      const value = JSON.stringify({ at: Date.now(), board });
      await sql`
        insert into room_settings (key, value) values ('run_board', ${value})
        on conflict (key) do update set value = ${value}
      `;
    } catch {
      /* dùng bản đã lưu */
    }
  }
  if (!board) return null;
  return { rate: board.rate, rows: board.rows, desk: { markup: desk.markup, custom: desk.custom } };
}
