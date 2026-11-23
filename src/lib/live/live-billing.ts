import type { Sql } from "../db.ts";
import type { LiveBilling } from "./live-bridge.ts";
import type { LiveBook } from "./live-cost.ts";
import { releaseStaleWith } from "../run-ticket.ts";
import { chargeTokenWith, closeTokenWith, openGiayWith } from "../token-flow.ts";

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
      const closed = await closeTokenWith(sql, ticketId, userId, failed);
      // Tiền phải trả nhà cung cấp cho cả phiên (v5.32.0): Token đã trừ quy lại giá gốc. Ghi một lần lúc đóng phiên.
      if (closed && closed.charged > 0) {
        try {
          const { turboBasePerSecond } = await import("../token-cost.server.ts");
          const { loadPriceBook } = await import("../run-board.server.ts");
          const { recordSpendWith } = await import("../provider-spend.ts");
          const { asrHouse } = await import("../sub/asr-house.ts");
          const turbo = await turboBasePerSecond(sql);
          const book = await loadPriceBook(sql);
          const rows = await sql<{ asr_model: string }>`select asr_model from run_tickets where id = ${ticketId} and user_id = ${userId}`;
          const model = rows[0]?.asr_model || "dich-truc-tiep";
          if (turbo && book) await recordSpendWith(sql, { provider: asrHouse(model) ?? "khac", model, baseVnd: closed.charged * turbo, rate: book.rate });
        } catch {
          /* ghi sổ hỏng không làm hỏng phiên */
        }
      }
    },
  };
}