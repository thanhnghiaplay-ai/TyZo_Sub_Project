import type { Sql } from "./db.ts";
import { codesIn, type PayHit } from "./pay-match.ts";

export type CreditResult = { userId: string; amount: number; code: string } | null;

/**
 * Webhook nạp tiền: khớp mã TZxxxxxx trong nội dung chuyển khoản với đơn đang chờ, rồi cộng ví.
 * Một câu SQL duy nhất: pay_seen chặn webhook gửi lặp, đơn chỉ chuyển 'paid' một lần.
 */
export async function creditHitWith(sql: Sql, provider: "sepay" | "casso", hit: PayHit): Promise<CreditResult> {
  const found = codesIn(hit.text).slice(0, 8);
  if (!found.length) return null;
  const slot = (index: number) => found[index] ?? found[0];
  const orders = await sql<{ id: string; user_id: string; amount: number; code: string }>`
    select id, user_id, amount, code from pay_orders
    where status in ('pending', 'claimed') and provider = ${provider}
      and code in (${slot(0)}, ${slot(1)}, ${slot(2)}, ${slot(3)}, ${slot(4)}, ${slot(5)}, ${slot(6)}, ${slot(7)})
  `;
  const order = orders.find((item) => found.includes(item.code) && hit.amount >= item.amount);
  if (!order) return null;
  const applied = await sql<{ user_id: string }>`
    with seen as (
      insert into pay_seen (provider, provider_ref) values (${provider}, ${hit.ref})
      on conflict do nothing
      returning provider_ref
    ),
    paid as (
      update pay_orders
      set status = 'paid', provider_ref = ${hit.ref}
      where id = ${order.id} and status in ('pending', 'claimed') and exists (select 1 from seen)
      returning user_id, amount
    ),
    account as (
      insert into room_accounts (user_id, balance)
      select user_id, ${hit.amount} from paid
      on conflict (user_id) do update set balance = room_accounts.balance + ${hit.amount}
      returning user_id
    )
    insert into room_ledger (user_id, kind, amount, note)
    select user_id, 'nap', ${hit.amount}, ${"Nap " + provider + " " + order.code} from account
    returning user_id
  `;
  return applied.length > 0 ? { userId: order.user_id, amount: hit.amount, code: order.code } : null;
}

/** Cổng riêng: khớp đúng mã và đúng số tiền của đơn đang chờ. Không khớp thì không cộng. */
export async function confirmOwnWith(sql: Sql, code: string, amount: number, ref: string): Promise<CreditResult> {
  const orders = await sql<{ id: string; user_id: string; amount: number; code: string }>`
    select id, user_id, amount, code from pay_orders
    where status in ('pending', 'claimed') and code = ${code} and amount = ${amount}
  `;
  const order = orders[0];
  if (!order) return null;
  const applied = await sql<{ user_id: string }>`
    with seen as (
      insert into pay_seen (provider, provider_ref) values ('rieng', ${ref})
      on conflict do nothing
      returning provider_ref
    ),
    paid as (
      update pay_orders
      set status = 'paid', provider_ref = ${ref}
      where id = ${order.id} and status in ('pending', 'claimed') and exists (select 1 from seen)
      returning user_id, amount
    ),
    account as (
      insert into room_accounts (user_id, balance)
      select user_id, ${amount}::int from paid
      on conflict (user_id) do update set balance = room_accounts.balance + ${amount}::int
      returning user_id
    )
    insert into room_ledger (user_id, kind, amount, note)
    select user_id, 'nap', ${amount}::int, ${"Nap rieng " + order.code} from account
    returning user_id
  `;
  return applied.length > 0 ? { userId: order.user_id, amount, code: order.code } : null;
}

/** Mua gói từ số dư: trừ có điều kiện balance >= giá, cộng hạn, ghi sổ, trong một câu. */
export async function buyPlanWith(sql: Sql, userId: string, plan: { id: string; name: string; price: number; hours: number }) {
  await sql`insert into room_accounts (user_id) values (${userId}) on conflict (user_id) do nothing`;
  const updated = await sql<{ user_id: string }>`
    with upd as (
      update room_accounts
      set balance = balance - ${plan.price},
          plan = ${plan.id},
          plan_until = (case when plan_until > now() then plan_until else now() end)
            + make_interval(hours => ${plan.hours})
      where user_id = ${userId} and balance >= ${plan.price}
      returning user_id, balance
    )
    insert into room_ledger (user_id, kind, amount, note)
    select user_id, 'goi', ${-plan.price}, ${"Mua gói " + plan.name} from upd
    returning user_id
  `;
  if (!updated.length) throw new Error("Số dư chưa đủ.");
  try {
    const { accruePlan } = await import("@/lib/affiliate-flow");
    await accruePlan(sql, userId, `goi:${userId}:${plan.id}:${Date.now()}`, plan.price);
  } catch {
    /* mua gói vẫn xong nếu hoa hồng lỗi */
  }
}

/**
 * Hoàn tiền một phiếu. Một câu UPDATE có điều kiện, hai lần hoàn cùng lúc chỉ một lần cộng ví.
 */
export async function refundRunWith(sql: Sql, id: string, amount: number, reason: string) {
  const applied = await sql<{ user_id: string }>`
    with upd as (
      update run_tickets
      set refunded = refunded + ${amount},
          status = case when refunded + ${amount} >= charged then 'da-hoan' else status end
      where id = ${id} and charged - refunded >= ${amount}
      returning user_id
    ),
    acct as (
      insert into room_accounts (user_id, balance)
      select user_id, ${amount} from upd
      on conflict (user_id) do update set balance = room_accounts.balance + ${amount}
      returning user_id
    )
    insert into room_ledger (user_id, kind, amount, note)
    select user_id, 'hoan', ${amount}, ${reason} from acct
    returning user_id
  `;
  if (applied.length) {
    try {
      const { clawback, accrueRun } = await import("@/lib/affiliate-flow");
      await clawback(sql, "luot", id);
      const owner = applied[0].user_id;
      if (owner) await accrueRun(sql, owner, id);
    } catch {
      /* hoàn tiền vẫn xong */
    }
    return applied[0].user_id;
  }
  const rows = await sql<{ id: string }>`select id from run_tickets where id = ${id}`;
  if (!rows.length) throw new Error("Không có phiếu này.");
  throw new Error("Không hoàn quá số đã trừ.");
}

/** Nhả khoản đang giữ. Khóa dòng phiếu rồi cộng đúng số vừa nhả, không cộng hai lần. */
export async function releaseHoldWith(sql: Sql, id: string, note = "") {
  const line = note.trim() || "Nhả khoản giữ phiếu " + id;
  const applied = await sql<{ user_id: string }>`
    with src as (
      select id, user_id, held from run_tickets
      where id = ${id} and status = 'dang-giu' and held > 0
      for update
    ),
    upd as (
      update run_tickets t
      set released = t.released + src.held, held = 0, status = 'da-nha'
      from src
      where t.id = src.id
      returning src.user_id as user_id, src.held as held
    ),
    acct as (
      insert into room_accounts (user_id, balance)
      select user_id, held from upd
      on conflict (user_id) do update set balance = room_accounts.balance + excluded.balance
      returning user_id
    )
    insert into room_ledger (user_id, kind, amount, note)
    select upd.user_id, 'nha', upd.held, ${line} from upd
    returning user_id
  `;
  if (applied.length) return applied[0].user_id;
  const rows = await sql<{ id: string }>`select id from run_tickets where id = ${id}`;
  if (!rows.length) throw new Error("Không có phiếu này.");
  throw new Error("Phiếu này không còn khoản đang giữ.");
}
