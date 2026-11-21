import type { Sql } from "../db.ts";
import { ELEVENLABS_BASE_ROWS } from "./elevenlabs-base.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/** Bảng giá ElevenLabs để tính tiền: giá cố định trong code, phủ số Admin sửa tay (usd_fix). */
export async function loadElevenlabsRows(sql: Sql): Promise<GroqLiveRow[]> {
  const fixRaw = await sql<{ value: string }>`select value from room_settings where key = 'usd_fix'`;
  const { applyUsdFix, parseUsdFix } = await import("../usd-fix.ts");
  return applyUsdFix(ELEVENLABS_BASE_ROWS, parseUsdFix(fixRaw[0]?.value));
}
