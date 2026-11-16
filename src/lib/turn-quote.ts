import { createServerFn } from "@tanstack/react-start";
import { parseServicePacks } from "@/lib/service-pack";
import { holdGiay } from "@/lib/token-math";
import { ALIBABA_ROWS } from "@/lib/sub/alibaba-catalog";
import { turnPacks } from "@/lib/turn-pack";

export type TurnPrice = { id: string; total: number | null; hold: number };

/** Số giây dịch sẽ giữ cho cửa trả theo lượt. Không trả giá gốc. */
export const quoteTurnPacks = createServerFn({ method: "POST" })
  .validator((input: { seconds: number; narration: boolean }) => {
    const seconds = Math.round(Number(input?.seconds));
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 6 * 3600) throw new Error("Thời lượng không đúng.");
    return { seconds, narration: Boolean(input?.narration) };
  })
  .handler(async ({ data }): Promise<TurnPrice[]> => {
    try {
      const { getSql } = await import("@/lib/db");
      const { loadPriceBook } = await import("@/lib/run-board.server");
      const sql = await getSql();
      const book = await loadPriceBook(sql);
      const rows = await sql<{ value: string }>`select value from room_settings where key = 'service_packs'`;
      const packs = turnPacks(parseServicePacks(rows[0]?.value));
      return packs.map((pack) => {
        const asr = pack.roles.asr;
        const chat = pack.roles.translate;
        if (!book || !asr || !chat) return { id: pack.id, total: null, hold: 0 };
        const giay = holdGiay({
          groq: book,
          aliRows: ALIBABA_ROWS,
          asrProvider: asr.provider,
          asrModel: asr.model,
          chatModel: chat.model,
          seconds: data.seconds,
        });
        return { id: pack.id, total: giay, hold: giay ?? 0 };
      });
    } catch {
      return [];
    }
  });
