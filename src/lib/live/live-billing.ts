import type { Sql } from "../db.ts";
import type { LiveBilling } from "./live-bridge.ts";
import type { LiveBook } from "./live-cost.ts";
import { releaseStaleWith } from "../billing/run-ticket.ts";
import { chargeTokenWith, closeTokenWith, openGiayWith } from "../billing/token-flow.ts";

type LiveBillingEnv = {
  /** Bảng giá hiện hành (đã cộng chênh). null khi chưa có giá. */
  book(): Promise<LiveBook | null>;
  now?: () => Date;
};

/**
 * Giữ và trừ Token dịch, không đụng ví đồng và không lưu số dư cho phiên.
 * Hạn mức đồng trong ngày không áp vào cửa này.
 */
export function createLiveBilling(sql: Sql, env: LiveBillingEnv): LiveBilling {
  return {
    book: () => env.book(),
    async open({ userId, ticketId, hold, seconds, model }) {
      try {
        await releaseStaleWith(sql, userId);
        const result = await openGiayWith(sql, {
          id: ticketId,
          userId,
          fileName: "Dịch trực tiếp",
          seconds,
          rate: Math.round((hold * 60) / Math.max(1, seconds)),
          hold,
          asrModel: model,
          chatModel: "",
        });
        return "error" in result ? { ok: false, reason: "het-tien" } : { ok: true };
      } catch {
        return { ok: false, reason: "loi" };
      }
    },
    charge: ({ userId, ticketId, cost }) => chargeTokenWith(sql, ticketId, userId, cost),
    async close({ userId, ticketId, failed }) {
      // DEEP-003: chi phí nhà cung cấp nay ghi theo từng lượt usage (spend bên dưới), không quy từ Token đã thu lúc đóng.
      await closeTokenWith(sql, ticketId, userId, failed);
    },
    async spend({ model, base, id }) {
      const book = await env.book();
      if (!(base > 0)) return;
      if (!book) throw new Error("Thiếu tỷ giá để ghi chi phí dịch trực tiếp; cần đối soát.");
      const { recordSpendDurablyWith } = await import("../provider-spend-journal.ts");
      const { asrHouse } = await import("../sub/asr-house.ts");
      return recordSpendDurablyWith(sql, { id, provider: asrHouse(model) ?? "alibaba", model, baseVnd: base, rate: book.rate });
    },
  };
}