import type { Sql } from "./db.ts";

/**
 * Xác nhận thủ công một đơn nạp: đổi trạng thái đơn, cộng ví, ghi sổ và ghi nhật ký người làm,
 * tất cả trong một câu lệnh nên hoặc xong cả hoặc không gì cả, và hai người bấm cùng lúc chỉ cộng một lần.
 */
export async function confirmOrderWith(sql: Sql, orderId: string, actorId: string, actorEmail: string) {
  const rows = await sql<{ user_id: string; amount: number; code: string }>`
    with paid as (
      update pay_orders set status = 'paid', provider_ref = 'thu-cong'
      where id = ${orderId} and status in ('pending', 'claimed')
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
