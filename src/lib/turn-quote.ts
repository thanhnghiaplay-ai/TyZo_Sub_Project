import { createServerFn } from "@tanstack/react-start";
import { parseServicePacks } from "@/lib/service-pack";
import { holdGiay } from "@/lib/billing/token-math";
import { turnPacks } from "@/lib/turn-pack";

/** asrHold, chatHold (v5.31.2): số giữ từng phần, vì từ v5.30.0 nhận dạng và dịch giữ riêng, lần lượt. */
export type TurnPrice = { id: string; total: number | null; hold: number; asrHold?: number | null; chatHold?: number | null };

/** Số Token dịch sẽ giữ cho cửa trả theo lượt. Không trả giá gốc. */
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
      const { loadProviderRows } = await import("@/lib/price-books.server");
      const providerRows = await loadProviderRows(sql);
      const book = await loadPriceBook(sql);
      const rows = await sql<{ value: string }>`select value from room_settings where key = 'service_packs'`;
      const packs = turnPacks(parseServicePacks(rows[0]?.value));
      return packs.map((pack) => {
        const asr = pack.roles.asr;
        const chat = pack.roles.translate;
        if (!book || !asr || !chat) return { id: pack.id, total: null, hold: 0 };
        const input = {
          groq: book,
          rows: providerRows,
          asrProvider: asr.provider,
          asrModel: asr.model,
          chatProvider: chat.provider,
          chatModel: chat.model,
          seconds: data.seconds,
        };
        const giay = holdGiay(input);
        const asrHold = holdGiay({ ...input, part: "asr" });
        const chatHold = holdGiay({ ...input, part: "chat" });
        return { id: pack.id, total: giay, hold: giay ?? 0, asrHold, chatHold };
      });
    } catch {
      return [];
    }
  });
