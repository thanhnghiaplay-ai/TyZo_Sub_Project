import type { Sql } from "../db.ts";
import { SONIOX_BASE_ROWS } from "./soniox-base.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/** Bảng giá Soniox để tính tiền: giá cố định trong code, phủ số Chủ sửa tay (usd_fix). */
export async function loadSonioxRows(sql: Sql): Promise<GroqLiveRow[]> {
  const fixRaw = await sql<{ value: string }>`select value from room_settings where key = 'usd_fix'`;
  const { applyUsdFix, parseUsdFix } = await import("../usd-fix.ts");
  return applyUsdFix(SONIOX_BASE_ROWS, parseUsdFix(fixRaw[0]?.value));
}
