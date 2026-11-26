import type { Sql } from "../db.ts";
import { codesIn, PAY_MINUTES, type PayHit } from "./pay-match.ts";
import { PLAN_PRICE_MAX, PLAN_PRICE_MIN } from "../room-plan-prices.ts";
import { roomPlan } from "../room-plans.ts";

type CreditResult = { userId: string; amount: number; code: string; purpose?: string } | null;

type SaleOrder = {
  id: string;
  user_id: string;
  amount: number;
  code: string;
  purpose: string;
  ref: string;
  detail: string;
};

function tokenSpec(detail: string): { tokens: number; days: number } | null {
  try {
    const data = JSON.parse(detail) as { tokens?: unknown; days?: unknown };
    const tokens = Math.round(Number(data.tokens));
    const days = Math.round(Number(data.days));
    if (!Number.isFinite(tokens) || tokens < 1 || tokens > 10_000_000) return null;
    if (!Number.isFinite(days) || days < 1 || days > 365) return null;
    return { tokens, days };
  } catch {
    return null;
  }
}

/** Đơn token kể cả khi purpose lưu nhầm thành nap, miễn detail có tokens và days. */
export function saleKind(order: { purpose: string; detail: string }): "token" | "plan" | "nap" {
  if (order.purpose === "plan") return "plan";
  if (order.purpose === "token" || tokenSpec(order.detail)) return "token";
  return "nap";
}

/** Đơn mua thẳng: đánh dấu đã trả rồi cộng token hoặc mở hạn. Không cộng số dư. */
export async function settleDirect(sql: Sql, order: SaleOrder, mark: { provider: string; ref: string }, late = false): Promise<CreditResult> {
  if (order.purpose === "token") {
    const spec = tokenSpec(order.detail);
    if (!spec) return null;
    const note = `Mua ${spec.tokens} Token dịch, hạn ${spec.days} ngày`;
    const applied = await sql<{ user_id: string }>`
      with seen as (
        insert into pay_seen (provider, provider_ref) values (${mark.provider}, ${mark.ref})
        on conflict do nothing
        returning provider_ref
      ),
      paid as (
        update pay_orders
        set status = 'paid', provider_ref = ${mark.ref}, purpose = 'token'
        where id = ${order.id} and (status in ('pending', 'claimed') or (${late}::boolean and status = 'expired')) and purpose in ('token', 'nap') and exists (select 1 from seen)
        returning user_id
      ),
      issued as (
        insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at)
        select ${order.id}::text, user_id, ${spec.tokens}::int, ${spec.tokens}::int, ${order.amount}::int, now() + make_interval(days => ${spec.days}::int)
        from paid
        returning id
      ),
      led as (
        insert into room_ledger (user_id, kind, amount, note)
        select user_id, 'nap', ${order.amount}::int, ${note}::text from paid
        returning 1
      )
      select user_id from paid
    `;
    if (!applied.length) return null;
    try {
      const { accrueToken } = await import("@/lib/affiliate-flow");
      await accrueToken(sql, order.user_id, `token:${order.id}`, order.amount, spec.tokens);
    } catch {
      /* cộng Token vẫn xong nếu hoa hồng lỗi */
    }
    return { userId: order.user_id, amount: order.amount, code: order.code, purpose: "token" };
  }
  if (order.purpose === "plan") {
    const plan = roomPlan(order.ref);
    // Giá gói Admin chỉnh được. Đơn giữ ĐÚNG giá lúc khách đặt (máy chủ tạo đơn từ giá đang lưu), nên khách đã đặt
    // trước khi đổi giá vẫn chuyển khoản số cũ và vẫn được giao gói. Chỉ chặn số tiền ngoài khoảng cho phép.
    if (!plan || !Number.isInteger(order.amount) || order.amount < PLAN_PRICE_MIN || order.amount > PLAN_PRICE_MAX) return null;
    const note = `Thuê phòng ${plan.name}`;
    const applied = await sql<{ user_id: string }>`
      with seen as (
        insert into pay_seen (provider, provider_ref) values (${mark.provider}, ${mark.ref})
        on conflict do nothing
        returning provider_ref
      ),
      paid as (
        update pay_orders
        set status = 'paid', provider_ref = ${mark.ref}
        where id = ${order.id} and (status in ('pending', 'claimed') or (${late}::boolean and status = 'expired')) and purpose = 'plan' and exists (select 1 from seen)
        returning user_id
      ),
      acct as (
        insert into room_accounts (user_id, plan, plan_until)
        select user_id, ${plan.id}::text, now() + make_interval(hours => ${plan.hours}::int) from paid
        on conflict (user_id) do update set
          plan = ${plan.id}::text,
          plan_until = (case when room_accounts.plan_until > now() then room_accounts.plan_until else now() end)
            + make_interval(hours => ${plan.hours}::int)
        returning user_id
      ),
      led as (
        insert into room_ledger (user_id, kind, amount, note)
        select user_id, 'nap', ${order.amount}::int, ${note}::text from acct
        returning 1
      )
      select user_id from paid
    `;
    if (!applied.length) return null;
    try {
      const { accruePlan } = await import("@/lib/affiliate-flow");
      await accruePlan(sql, order.user_id, `goi:${order.id}`, plan.price);
    } catch {
      /* mở hạn vẫn xong nếu hoa hồng lỗi */
    }
    return { userId: order.user_id, amount: order.amount, code: order.code, purpose: "plan" };
  }
  return null;
}

/**
 * Webhook nạp tiền: khớp mã TZxxxxxx trong nội dung chuyển khoản với đơn đang chờ.
 * Đơn mua token hoặc thuê phòng thì giao đúng món, không cộng số dư.
 * Đơn nạp cũ vẫn cộng ví (chỉ còn đơn đã tạo trước khi bỏ nạp).
 */
export async function creditHitWith(sql: Sql, provider: "sepay" | "casso", hit: PayHit): Promise<CreditResult> {
  const found = codesIn(hit.text).slice(0, 8);
  if (!found.length) return null;
  const slot = (index: number) => found[index] ?? found[0];
  const orders = await sql<SaleOrder & { provider: string }>`
    select id, user_id, amount, code, purpose, ref, detail, provider from pay_orders
    where status in ('pending', 'claimed') and provider = ${provider}
      and created_at > now() - (${PAY_MINUTES} * interval '1 minute')
      and code in (${slot(0)}, ${slot(1)}, ${slot(2)}, ${slot(3)}, ${slot(4)}, ${slot(5)}, ${slot(6)}, ${slot(7)})
  `;
  const order = orders.find((item) => found.includes(item.code) && hit.amount >= item.amount);
  if (!order) return null;
  if (order.purpose === "plan") return settleDirect(sql, order, { provider, ref: hit.ref });
  if (order.purpose === "token" || tokenSpec(order.detail)) {
    return settleDirect(sql, { ...order, purpose: "token" }, { provider, ref: hit.ref });
  }
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

/**
 * Đơn Token đã trả nhưng chưa có gói (tiền về đi nhầm vào ví). Ghi gói, gỡ số dư nhầm.
 * Chạy lại không cộng lần hai. Không đụng đơn không có detail token.
 */
export async function repairMissedTokens(sql: Sql, userId: string) {
  const rows = await sql<{ id: string; amount: number; detail: string }>`
    select id, amount, detail from pay_orders
    where user_id = ${userId} and status = 'paid'
      and (purpose = 'token' or detail like '%"tokens"%')
      and not exists (select 1 from token_grants g where g.id = pay_orders.id)
  `;
  let fixed = 0;
  for (const row of rows) {
    const spec = tokenSpec(row.detail);
    if (!spec) continue;
    const note = `Bù ${spec.tokens} Token dịch từ đơn đã trả, gỡ số dư nhầm`;
    const applied = await sql<{ id: string }>`
      with issued as (
        insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at)
        values (${row.id}::text, ${userId}::text, ${spec.tokens}::int, ${spec.tokens}::int, ${row.amount}::int, now() + make_interval(days => ${spec.days}::int))
        on conflict (id) do nothing
        returning id
      ),
      claw as (
        update room_accounts
        set balance = greatest(0, balance - ${row.amount}::int)
        where user_id = ${userId} and exists (select 1 from issued)
        returning user_id
      )
      insert into room_ledger (user_id, kind, amount, note)
      select ${userId}::text, 'goi-giay', ${-row.amount}::int, ${note}::text from issued
      returning 1 as id
    `;
    if (applied.length) fixed += 1;
  }
  return fixed;
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
      where id = ${id} and charged - refunded >= ${amount} and unit = 'vnd'
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
  const rows = await sql<{ id: string; unit: string }>`select id, unit from run_tickets where id = ${id}`;
  if (!rows.length) throw new Error("Không có phiếu này.");
  if (rows[0].unit === "token") throw new Error("Phiếu Token dịch không hoàn vào số dư.");
  throw new Error("Không hoàn quá số đã trừ.");
}

/** Nhả khoản đang giữ. Khóa dòng phiếu rồi cộng đúng số vừa nhả, không cộng hai lần. */
export async function releaseHoldWith(sql: Sql, id: string, note = "") {
  const kind = await sql<{ unit: string; user_id: string }>`select unit, user_id from run_tickets where id = ${id} and status = 'dang-giu'`;
  if (kind[0]?.unit === "token") {
    const { closeTokenWith } = await import("../billing/token-flow.ts");
    const closed = await closeTokenWith(sql, id, kind[0].user_id, false);
    if (!closed) throw new Error("Không nhả được phiếu này.");
    return kind[0].user_id;
  }
  const line = note.trim() || "Nhả khoản giữ phiếu " + id;
  const applied = await sql<{ user_id: string }>`
    with src as (
      select id, user_id, held from run_tickets
      where id = ${id} and status = 'dang-giu' and held > 0 and unit = 'vnd'
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

/**
 * Xóa số liệu thử để còn bản như lúc mới cài.
 * Giữ tài khoản, vai trò, cấu hình, key, điều khoản, cộng tác viên và thuật ngữ.
 */
export async function wipeTestData(sql: Sql) {
  await sql`delete from token_slices`;
  await sql`delete from token_grants`;
  await sql`delete from run_tickets`;
  await sql`delete from pay_orders`;
  await sql`delete from pay_seen`;
  await sql`delete from room_ledger`;
  await sql`delete from room_costs`;
  await sql`delete from room_notices`;
  await sql`delete from commission_events`;
  await sql`delete from affiliate_payouts`;
  await sql`delete from quality_runs`;
  await sql`delete from room_appeals`;
  await sql`delete from trial_devices`;
  await sql`delete from room_presence`;
  await sql`delete from rate_hits`;
  await sql`delete from room_audit`;
  await sql`
    update room_accounts
    set balance = 0, plan = null, plan_until = null, trial_left = 1
  `;
}
