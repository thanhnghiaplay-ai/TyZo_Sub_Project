import { AURA_PRICE_ID, isAuraModel } from "./aura.ts";
import { DEEPGRAM_BASE_ROWS, DEEPGRAM_NOVA3_USD_PER_MINUTE } from "./deepgram-base.ts";
import type { GroqLiveRow } from "./groq-board.ts";

/** Bảng dự phòng (xem deepgram-base.ts). Giá thật: loadDeepgramRows ở deepgram-board.server.ts. */
export { DEEPGRAM_NOVA3_USD_PER_MINUTE };
export const DEEPGRAM_ROWS: GroqLiveRow[] = DEEPGRAM_BASE_ROWS;

export function deepgramRow(id: string) {
  return DEEPGRAM_ROWS.find((row) => row.id === id) ?? null;
}

/** Dòng giá cho một model Deepgram cụ thể. Mọi giọng Aura-2 dùng chung giá của dòng `aura-2`. */
export function deepgramRowFor(model: string): GroqLiveRow | null {
  if (isAuraModel(model)) {
    const shared = deepgramRow(AURA_PRICE_ID);
    return shared ? { ...shared, id: model } : null;
  }
  return deepgramRow(model);
}
