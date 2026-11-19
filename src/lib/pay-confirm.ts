import type { Sql } from "./db.ts";
import { saleKind, settleDirect } from "./pay-flow.ts";

/**
 * Xác nhận thủ công một đơn: đơn mua token hoặc thuê phòng thì giao đúng món.
 * Đơn nạp cũ vẫn cộng ví. Đơn đã hết hạn vẫn xác nhận được (khách chuyển trễ, Chủ đã tự kiểm tiền về); đơn đã hủy thì không. Một câu lệnh, hai người bấm cùng lúc chỉ một lần.
 */
export async function confirmOrderWith(sql: Sql, orderId: string, actorId: string, actorEmail: string) {
  const found = await sql<{ id: string; user_id: string; amount: number; code: string; purpose: string; ref: string; detail: string; provider: string }>`
    select id, user_id, amount, code, purpose, ref, detail, provider from pay_orders where id = ${orderId}
  `;
  const order = found[0];
  if (order) {
    const kind = saleKind(order);
    if (kind === "token" || kind === "plan") {
      const done = await settleDirect(sql, { ...order, purpose: kind }, { provider: "tay", ref: `thu-${orderId}` }, true);
      if (!done) return null;
      try {
        await sql`
          insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
          values (
            ${actorId}, 'xac-nhan-nap', ${done.userId}, ${order.code + " " + order.amount + " đ"}, ${actorEmail}, 'chu',
            coalesce((select email from "user" where id = ${done.userId}), '')
          )
        `;
      } catch {
        /* đơn đã giao, nhật ký không chặn */
      }
      return { userId: done.userId, amount: done.amount, code: done.code };
    }
  }
  const rows = await sql<{ user_id: string; amount: number; code: string }>`
    with paid as (
      update pay_orders set status = 'paid', provider_ref = 'thu-cong'
      where id = ${orderId} and status in ('pending', 'claimed', 'expired')
      returning user_id, amount, code
    ),
    acc as (
      insert into room_accounts (user_id, balance)
      select user_id, amount from paid
      on conflict (user_id) do update set balance = room_accounts.balance + excluded.balance
      returning 1
    ),
    led as (
      insert into room_ledger (user_id, kind, amount, note)
      select user_id, 'nap', amount, 'Nạp thủ công ' || code || ' · xác nhận bởi ' || ${actorEmail}::text from paid returning 1
    ),
    aud as (
      insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
      select ${actorId}::text, 'xac-nhan-nap', user_id, code || ' ' || amount || ' đ', ${actorEmail}::text, 'chu',
        coalesce((select email from "user" where id = paid.user_id), '')
      from paid returning 1
    )
    select user_id, amount, code from paid
  `;
  return rows[0] ? { userId: rows[0].user_id, amount: Number(rows[0].amount), code: rows[0].code } : null;
}
