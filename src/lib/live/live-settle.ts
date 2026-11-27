/**
 * RE3-001: quyết toán một quan sát usage của Dịch trực tiếp trong MỘT giao dịch.
 *
 * Trước đây quan sát chi phí nhà cung cấp (journal) được lưu rồi mới trừ phiếu bằng các lệnh rời; lỗi ở giữa làm
 * journal có chi phí mà phiếu chưa trừ, và lần lặp lại thấy «đã có journal» thì bỏ qua khoản trừ (thiếu tiền).
 *
 * Nay: biên nhận (`live_usage_receipts`), quan sát chi phí (`provider_spend_events`) và khoản trừ từng phiếu cùng
 * commit hoặc cùng hủy. Gọi lại cùng mã (mất ACK, thử lại, chạy đua) trả đúng kết quả đã lưu, không trừ lần hai.
 * Chỉ phần cộng tổng hợp ngày (`provider_spend`) chạy sau commit; lỗi ở đó để quan sát ở trạng thái chờ, vẫn được
 * tính trong báo cáo và được `drainSpendJournal` cộng lại (R08). Không đổi giá, quy Token hay cách làm tròn.
 */
import type { Sql } from "../db.ts";
import { inTransaction } from "../db-tx.ts";
import { chargeTokenWith } from "../billing/token-flow.ts";
import { noteFailure, postObservation } from "../provider-spend-journal.ts";

export type LiveSettleInput = {
  /** Mã biên nhận ổn định theo phiên + kết nối upstream + quan sát. Lặp lại cùng mã = cùng một lần trừ. */
  receiptId: string;
  userId: string;
  sessionId: string;
  connectionId: string;
  model: string;
  provider: string;
  /** Phiếu theo thứ tự trừ (mới nhất trước). */
  tickets: string[];
  /** Số Token (hoặc đơn vị ví) cần trừ cho quan sát này. */
  cost: number;
  /** Giá gốc đã cộng chênh, đồng (để đối soát). */
  base: number;
  /** Chi phí phải trả nhà cung cấp, đồng (journal R08). */
  supplierVnd: number;
  /** Đồng / USD để quy chi phí ra micro-USD như journal R08. */
  rate: number;
};

export type LiveSettleResult = {
  taken: number;
  shortfall: number;
  duplicate: boolean;
  /** Quan sát đã lưu nhưng chưa cộng vào tổng hợp ngày (sẽ được cộng lại). */
  pending: boolean;
};

export class LiveReceiptConflict extends Error {
  constructor() {
    super("Mã biên nhận usage đã dùng với số liệu khác; cần đối soát.");
  }
}

function check(input: LiveSettleInput) {
  const usd = Math.round((input.supplierVnd / input.rate) * 1_000_000);
  if (
    !/^live:[0-9a-f]{64}$/.test(input.receiptId) ||
    !input.userId ||
    !input.sessionId ||
    !input.connectionId ||
    !input.model ||
    input.model.length > 120 ||
    !input.provider ||
    input.provider.length > 40 ||
    !Number.isSafeInteger(input.cost) ||
    input.cost < 0 ||
    !Number.isFinite(input.base) ||
    input.base < 0 ||
    !Number.isFinite(input.supplierVnd) ||
    input.supplierVnd < 0 ||
    input.supplierVnd > Number.MAX_SAFE_INTEGER ||
    !Number.isFinite(input.rate) ||
    input.rate <= 0 ||
    !Number.isSafeInteger(usd) ||
    !input.tickets.every((t) => typeof t === "string" && t.length > 0 && t.length <= 200)
  )
    throw new Error("Số liệu quyết toán Dịch trực tiếp không hợp lệ.");
  return usd;
}

const same = (a: unknown, b: number) => Number(a) === b;

export async function settleLiveUsageWith(sql: Sql, input: LiveSettleInput): Promise<LiveSettleResult> {
  const usd = check(input);
  const outcome = await inTransaction(sql, async (tx) => {
    const added = await tx<{ id: string }>`
      insert into live_usage_receipts (id, user_id, session_id, connection_id, model, cost, base_vnd, supplier_vnd)
      values (${input.receiptId}, ${input.userId}, ${input.sessionId}, ${input.connectionId}, ${input.model},
              ${input.cost}, ${input.base}, ${input.supplierVnd})
      on conflict (id) do nothing returning id`;
    if (!added.length) {
      // Đã quyết toán (hoặc một bản chạy đua vừa commit; ON CONFLICT chờ bản đó xong). Trả nguyên kết quả đã lưu.
      const rows = await tx<{
        user_id: string;
        session_id: string;
        model: string;
        cost: number;
        base_vnd: string;
        supplier_vnd: string;
        taken: number;
        shortfall: number;
      }>`select user_id, session_id, model, cost, base_vnd, supplier_vnd, taken, shortfall
         from live_usage_receipts where id = ${input.receiptId}`;
      const row = rows[0];
      if (
        !row ||
        row.user_id !== input.userId ||
        row.session_id !== input.sessionId ||
        row.model !== input.model ||
        !same(row.cost, input.cost) ||
        !same(row.base_vnd, input.base) ||
        !same(row.supplier_vnd, input.supplierVnd)
      )
        throw new LiveReceiptConflict();
      return { taken: Number(row.taken), shortfall: Number(row.shortfall), duplicate: true, journal: false };
    }
    let journal = false;
    if (input.supplierVnd > 0) {
      const j = await tx<{ id: string }>`
        insert into provider_spend_events (id, provider, model, base_vnd, usd_micro)
        values (${input.receiptId}, ${input.provider}, ${input.model}, ${input.supplierVnd}, ${usd})
        on conflict (id) do nothing returning id`;
      // Mã biên nhận mới mà journal đã có mã này: dữ liệu lệch, không đoán; hủy cả giao dịch để đối soát.
      if (!j.length) throw new LiveReceiptConflict();
      journal = true;
    }
    let left = input.cost;
    const allocation: Array<{ ticket: string; n: number }> = [];
    for (const ticket of input.tickets) {
      if (left <= 0) break;
      const part = await chargeTokenWith(tx, ticket, input.userId, left);
      if (part > 0) allocation.push({ ticket, n: part });
      left -= part;
    }
    const taken = input.cost - Math.max(0, left);
    const shortfall = Math.max(0, left);
    await tx`update live_usage_receipts set taken = ${taken}, shortfall = ${shortfall},
             allocation = ${JSON.stringify(allocation)}::jsonb where id = ${input.receiptId}`;
    return { taken, shortfall, duplicate: false, journal };
  });
  let pending = false;
  if (outcome.journal) {
    // Ngoài giao dịch: hàng tổng hợp ngày là điểm nóng chung; lỗi ở đây không làm mất chi phí đã lưu.
    try {
      await postObservation(sql, input.receiptId);
    } catch (error) {
      pending = true;
      await noteFailure(sql, input.receiptId, error).catch(() => undefined);
    }
  }
  return { taken: outcome.taken, shortfall: outcome.shortfall, duplicate: outcome.duplicate, pending };
}
