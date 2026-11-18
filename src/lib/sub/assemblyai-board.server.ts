import type { Sql } from "../db.ts";
import { ASSEMBLYAI_BASE_ROWS } from "./assemblyai-base.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/** Bảng giá AssemblyAI để tính tiền: giá cố định trong code, phủ số Chủ sửa tay (usd_fix). */
export async function loadAssemblyaiRows(sql: Sql): Promise<GroqLiveRow[]> {
  const fixRaw = await sql<{ value: string }>`select value from room_settings where key = 'usd_fix'`;
  const { applyUsdFix, parseUsdFix } = await import("../usd-fix.ts");
  return applyUsdFix(ASSEMBLYAI_BASE_ROWS, parseUsdFix(fixRaw[0]?.value));
}
