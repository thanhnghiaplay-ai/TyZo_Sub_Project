import type { Sql } from "@/lib/db";
import { AFFILIATE_DEFAULT, parseAffiliateRules, planCommission, runCommission } from "@/lib/affiliate";

async function rulesOf(sql: Sql) {
  const rows = await sql<{ value: string }>`select value from room_settings where key = 'affiliate'`;
  return parseAffiliateRules(rows[0]?.value);
}

async function promoteDue(sql: Sql) {
  await sql`
    update commission_events set status = 'da-duyet'
    where status = 'treo' and available_at <= now()
  `;
}

export async function accruePlan(sql: Sql, userId: string, ref: string, price: number) {
  if (price < 1) return;
  const rules = await rulesOf(sql);
  await insertEvent(sql, userId, "goi", ref, price, rules.ratePlanBp, 0, rules);
}

export async function accrueRun(sql: Sql, userId: string, ref: string) {
  const rules = await rulesOf(sql);
  const rows = await sql<{ charged: number; refunded: number; base_cost: number }>`
    select charged, refunded, base_cost from run_tickets where id = ${ref} and user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return;
  const charged = Math.max(0, Number(row.charged) - Number(row.refunded));
  if (charged <= Number(row.base_cost)) return;
  await insertEvent(sql, userId, "luot", ref, charged, rules.rateRunBp, 0, rules);
}

export async function clawback(sql: Sql, kind: string, ref: string) {
  await sql`
    update commission_events set status = 'huy', amount = 0
    where source_kind = ${kind} and source_ref = ${ref} and status in ('treo', 'da-duyet', 'cho-rut')
  `;
}

async function insertEvent(
  sql: Sql,
  userId: string,
  kind: string,
  ref: string,
  base: number,
  rate: number,
  amount: number,
  rules: { holdDays: number; windowDays: number },
) {
  const own = await sql<{ rate_plan_bp: number; rate_run_bp: number }>`
    select a.rate_plan_bp, a.rate_run_bp
    from referrals r
    join affiliates a on a.user_id = r.affiliate_id
    where r.user_id = ${userId} and a.status = 'hoat-dong' and a.user_id <> ${userId}
      and (${rules.windowDays}::int = 0 or r.attached_at > now() - make_interval(days => ${rules.windowDays}::int))
  `;
  if (!own.length) return;
  const custom = kind === "goi" ? Number(own[0].rate_plan_bp) : Number(own[0].rate_run_bp);
  const used = custom > 0 ? custom : rate;
  const finalAmount = kind === "goi" ? planCommission(base, used) : runCommission(base, 0, used);
  if (kind === "luot") {
    const ticket = await sql<{ base_cost: number; charged: number; refunded: number }>`
      select base_cost, charged, refunded from run_tickets where id = ${ref}
    `;
    const row = ticket[0];
    const charged = row ? Math.max(0, Number(row.charged) - Number(row.refunded)) : base;
    const groq = row ? Number(row.base_cost) : 0;
    const capped = runCommission(charged, groq, used);
    if (capped < 1) return;
    await sql`
      insert into commission_events (affiliate_id, referred_user_id, source_kind, source_ref, base_amount, rate_bp, amount, available_at)
      select r.affiliate_id, r.user_id, ${kind}, ${ref}, ${charged}, ${used}, ${capped}, now() + make_interval(days => ${rules.holdDays}::int)
      from referrals r
      join affiliates a on a.user_id = r.affiliate_id
      where r.user_id = ${userId} and a.status = 'hoat-dong'
      on conflict (source_kind, source_ref) do nothing
    `;
    return;
  }
  if (finalAmount < 1) return;
  await sql`
    insert into commission_events (affiliate_id, referred_user_id, source_kind, source_ref, base_amount, rate_bp, amount, available_at)
    select r.affiliate_id, r.user_id, ${kind}, ${ref}, ${base}, ${used}, ${finalAmount}, now() + make_interval(days => ${rules.holdDays}::int)
    from referrals r
    join affiliates a on a.user_id = r.affiliate_id
    where r.user_id = ${userId} and a.status = 'hoat-dong'
    on conflict (source_kind, source_ref) do nothing
  `;
}

export async function settleAffiliate(sql: Sql) {
  await promoteDue(sql);
}

export { AFFILIATE_DEFAULT };
