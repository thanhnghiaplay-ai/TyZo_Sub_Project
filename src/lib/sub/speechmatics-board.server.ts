import type { Sql } from "../db.ts";
import { SPEECHMATICS_BASE_ROWS } from "./speechmatics-base.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/** Bảng giá Speechmatics để tính tiền: giá cố định trong code, phủ số Chủ sửa tay (usd_fix). */
export async function loadSpeechmaticsRows(sql: Sql): Promise<GroqLiveRow[]> {
  const fixRaw = await sql<{ value: string }>`select value from room_settings where key = 'usd_fix'`;
  const { applyUsdFix, parseUsdFix } = await import("../usd-fix.ts");
  return applyUsdFix(SPEECHMATICS_BASE_ROWS, parseUsdFix(fixRaw[0]?.value));
}
