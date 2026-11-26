import type { Sql } from "./db.ts";
import { AFFILIATE_DEFAULT, commissionFor, parseAffiliateRules } from "./affiliate.ts";

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

/** Gói thuê phòng: khách dùng key của mình nên giá vốn model bằng 0; vẫn trừ chi phí vận hành. */
export async function accruePlan(sql: Sql, userId: string, ref: string, price: number) {
  if (price < 1) return;
  await insertEvent(sql, userId, "goi", ref, price, 0);
}

/**
 * Đơn mua Token dịch: giá vốn = số Token × giá gốc Turbo mỗi giây lúc mua (1 Token = 1 giây Turbo giá gốc),
 * tức giá phải trả nhà model nếu khách dùng hết. Chưa đọc được giá Turbo thì coi giá vốn bằng giá bán (không hoa hồng),
 * để không bao giờ trả hoa hồng khi chưa chắc có lời.
 */
export async function accrueToken(sql: Sql, userId: string, ref: string, price: number, tokens: number) {
  if (price < 1 || tokens < 1) return;
  let cost = price;
  try {
    const { turboPerSecond } = await import("@/lib/giay-room");
    const turbo = await turboPerSecond();
    if (turbo && turbo > 0) cost = Math.ceil(tokens * turbo);
  } catch {
    /* giữ cost = price */
  }
  await insertEvent(sql, userId, "token", ref, price, cost);
}

/**
 * Hoa hồng theo lượt dùng: NGỪNG từ v5.40.0. Hoa hồng đã tính lúc khách mua Token dịch, tính thêm lúc dùng là hai lần.
 * (Bản cũ còn so số Token với số đồng.) Giữ hàm để các chỗ gọi cũ không lỗi; khoản đã ghi trước đây vẫn giữ nguyên.
 */
export async function accrueRun(_sql: Sql, _userId: string, _ref: string) {
  return;
}

export async function clawback(sql: Sql, kind: string, ref: string) {
  await sql`
    update commission_events set status = 'huy', amount = 0
    where source_kind = ${kind} and source_ref = ${ref} and status in ('treo', 'da-duyet', 'cho-rut')
  `;
}

async function insertEvent(sql: Sql, userId: string, kind: "goi" | "token", ref: string, revenue: number, cost: number) {
  const rules = await rulesOf(sql);
  const own = await sql<{ affiliate_id: string; rate_plan_bp: number; rate_run_bp: number }>`
    select r.affiliate_id, a.rate_plan_bp, a.rate_run_bp
    from referrals r
    join affiliates a on a.user_id = r.affiliate_id
    where r.user_id = ${userId} and a.status = 'hoat-dong' and a.user_id <> ${userId}
      and (${rules.windowDays}::int = 0 or r.attached_at > now() - make_interval(days => ${rules.windowDays}::int))
  `;
  if (!own.length) return;
  const custom = kind === "goi" ? Number(own[0].rate_plan_bp) : Number(own[0].rate_run_bp);
  const rate = custom > 0 ? custom : kind === "goi" ? rules.ratePlanBp : rules.rateRunBp;
  const calc = commissionFor({ revenue, cost, rateBp: rate, rules });
  if (calc.amount < 1) return;
  await sql`
    insert into commission_events (affiliate_id, referred_user_id, source_kind, source_ref, base_amount, cost_amount, profit_amount, rate_bp, amount, available_at)
    values (${own[0].affiliate_id}, ${userId}, ${kind}, ${ref}, ${calc.revenue}, ${calc.cost + calc.opex}, ${calc.profit}, ${rate}, ${calc.amount}, now() + make_interval(days => ${rules.holdDays}::int))
    on conflict (source_kind, source_ref) do nothing
  `;
}

/**
 * R5-006: xử lý hàng đợi hoa hồng (đơn đã trả mà chưa ghi được hoa hồng). Gọi ngay sau khi trả, và mỗi lần mở trang
 * Cộng tác. Mỗi nguồn chỉ một khoản (on conflict do nothing), nên chạy lại bao nhiêu lần cũng không cộng hai lần.
 * Trả số việc đã xong.
 */
export async function drainCommissionOutbox(sql: Sql, limit = 50): Promise<number> {
  const rows = await sql<{ source_kind: string; source_ref: string; user_id: string; revenue: number; tokens: number }>`
    select source_kind, source_ref, user_id, revenue, tokens from commission_outbox
    where done_at is null and tries < 20 order by created_at limit ${limit}`;
  let done = 0;
  for (const row of rows) {
    try {
      if (row.source_kind === "goi") await accruePlan(sql, row.user_id, row.source_ref, Number(row.revenue));
      else if (row.source_kind === "token") await accrueToken(sql, row.user_id, row.source_ref, Number(row.revenue), Number(row.tokens));
      await sql`update commission_outbox set done_at = now(), tries = tries + 1, last_error = '' where source_kind = ${row.source_kind} and source_ref = ${row.source_ref}`;
      done += 1;
    } catch (error) {
      const why = (error instanceof Error ? error.message : String(error)).slice(0, 300);
      await sql`update commission_outbox set tries = tries + 1, last_error = ${why} where source_kind = ${row.source_kind} and source_ref = ${row.source_ref}`;
    }
  }
  return done;
}

export async function settleAffiliate(sql: Sql) {
  await drainCommissionOutbox(sql).catch(() => 0);
  await promoteDue(sql);
}

export { AFFILIATE_DEFAULT };
