import type { Sql } from "../db.ts";
import type { LiveBilling } from "./live-bridge.ts";
import type { LiveBook } from "./live-cost.ts";
import { chargeTicketWith, closeTicketWith, openTicketWith } from "../run-ticket.ts";
import { dayStartIso } from "../run-desk.ts";

export type LiveBillingEnv = {
  /** Bảng giá hiện hành (đã cộng chênh). null khi chưa có giá. */
  book(): Promise<LiveBook | null>;
  /** Hạn mức trả theo lượt mỗi ngày, 0 là không giới hạn. */
  cap(): Promise<number>;
  now?: () => Date;
};

/**
 * Nối cầu nối vào các hàm giữ, trừ, nhả tiền của cửa trả theo lượt. Không viết lại luật tiền:
 * giữ nguyên tử bằng UPDATE có điều kiện, trừ không vượt số đang giữ, nhả chạy lại không làm gì.
 */
export function createLiveBilling(sql: Sql, env: LiveBillingEnv): LiveBilling {
  return {
    book: () => env.book(),
    async open({ userId, ticketId, hold, seconds, model }) {
      try {
        const result = await openTicketWith(sql, {
          id: ticketId,
          userId,
          fileName: "Dịch trực tiếp",
          seconds,
          rate: Math.round((hold * 60) / Math.max(1, seconds)),
          hold,
          cap: await env.cap(),
          dayStartIso: dayStartIso((env.now ?? (() => new Date()))()),
          asrModel: model,
          chatModel: "",
        });
        return "error" in result ? { ok: false, reason: result.error } : { ok: true };
      } catch {
        return { ok: false, reason: "loi" };
      }
    },
    charge: ({ userId, ticketId, cost, base }) => chargeTicketWith(sql, ticketId, userId, cost, base),
    async close({ userId, ticketId, failed }) {
      await closeTicketWith(sql, ticketId, userId, failed);
    },
  };
}
