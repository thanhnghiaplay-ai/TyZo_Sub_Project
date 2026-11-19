import type { Sql } from "./db.ts";

/** Giá gốc Turbo, đồng mỗi giây, chưa cộng chênh. null khi chưa có bảng giá. */
export async function turboBasePerSecond(sql: Sql): Promise<number | null> {
  try {
    const { loadPriceBook } = await import("./run-board.server.ts");
    const { asrPerSecond } = await import("./run-bill.ts");
    const { TURBO_ASR } = await import("./token-math.ts");
    const book = await loadPriceBook(sql);
    if (!book) return null;
    return asrPerSecond({ ...book, desk: { markup: 0, custom: {} } }, TURBO_ASR);
  } catch {
    return null;
  }
}
