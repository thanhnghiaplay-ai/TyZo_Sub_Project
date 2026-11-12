import { createServerFn } from "@tanstack/react-start";
import { parseRunDesk } from "@/lib/run-desk";
import { parseServicePacks, quotePack } from "@/lib/service-pack";
import { ALIBABA_ROWS } from "@/lib/sub/alibaba-catalog";
import { turnPacks } from "@/lib/turn-pack";

export type TurnPrice = { id: string; total: number | null; hold: number };

/** Giá khách thấy: giá gốc cộng phần trăm Chủ đặt. Không trả giá gốc. */
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
      const rows = await sql<{ key: string; value: string }>`
        select key, value from room_settings where key in ('service_packs', 'alibaba_desk')
      `;
      const map = new Map(rows.map((row) => [row.key, row.value]));
      const aliDesk = parseRunDesk(map.get("alibaba_desk"));
      const packs = turnPacks(parseServicePacks(map.get("service_packs")));
      const aliBook = book
        ? { rate: book.rate, rows: ALIBABA_ROWS, desk: { markup: aliDesk.markup, custom: aliDesk.custom } }
        : null;
      return packs.map((pack) => {
        if (!book) return { id: pack.id, total: null, hold: 0 };
        const quote = quotePack({
          pack,
          seconds: data.seconds,
          door: "turn",
          narration: data.narration,
          books: { groq: book, ...(aliBook ? { alibaba: aliBook } : {}) },
        });
        return { id: pack.id, total: quote.ready ? quote.marked : null, hold: quote.ready ? quote.hold : 0 };
      });
    } catch {
      return [];
    }
  });
