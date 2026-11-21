import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole } from "@/lib/admin-room";
import type { SpendSummary } from "@/lib/provider-spend";

export type ProfitView = {
  revenue: number;
  /** Tiền phải trả các nhà cung cấp trong khoảng (sổ ghi lúc gọi). */
  providers: number;
  /** Phần trước ngày bắt đầu có sổ, ước theo Token đã trừ × giá Turbo (bản cũ chưa ghi theo nhà). */
  providersEstimated: number;
  commission: number;
  manual: number;
  /** Token đã bán còn hạn khách chưa dùng: số Token và giá gốc nếu khách dùng hết. */
  owedTokens: number;
  owedVnd: number;
  /** Token hết hạn chưa dùng trong khoảng (đã thu tiền, không tốn). */
  expiredTokens: number;
  spend: SpendSummary;
  verdict: { now: number; worst: number; state: "loi" | "lo" | "lo-neu-dung-het" };
};

const WINDOW: Record<string, string> = { day: "14 days", week: "8 weeks", month: "12 months", year: "5 years" };

/** Lời lỗ nhìn một lần cho trang Doanh thu (v5.32.0). Chỉ Admin. */
export const getProfitView = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((span: string) => (span in WINDOW ? span : "day"))
  .handler(async ({ context, data }): Promise<ProfitView> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const { spendSummaryWith, verdict } = await import("@/lib/provider-spend");
    const { turboBasePerSecond } = await import("@/lib/token-cost.server");
    const sql = await getSql();
    const window = WINDOW[data];
    const spend = await spendSummaryWith(sql, window);
    const turbo = (await turboBasePerSecond(sql)) ?? 0;
    const money = await sql.query<{ revenue: number }>(`select coalesce(sum(amount), 0)::bigint as revenue from room_ledger where kind = 'nap' and created_at > now() - $1::interval`, [window]);
    const hoa = await sql.query<{ n: number }>(`select coalesce(sum(amount), 0)::bigint as n from commission_events where status <> 'huy' and created_at > now() - $1::interval`, [window]);
    const manual = await sql.query<{ n: number }>(`select coalesce(sum(amount), 0)::bigint as n from room_costs where spent_on::timestamp > now() - $1::interval`, [window]);
    // Trước ngày có sổ theo nhà: ước như cũ (Token đã trừ × giá Turbo, cộng giá vốn phiếu tiền đồng cũ).
    const before = spend.since ?? "9999-12-31";
    const old = await sql.query<{ tokens: number; vnd: number }>(
      `select coalesce(sum(charged) filter (where unit = 'token'), 0)::bigint as tokens, coalesce(sum(base_cost) filter (where unit = 'vnd'), 0)::bigint as vnd
       from run_tickets where created_at > now() - $1::interval and (created_at at time zone 'Asia/Ho_Chi_Minh')::date < $2::date`,
      [window, before],
    );
    const providersEstimated = Math.round(Number(old[0]?.tokens ?? 0) * turbo + Number(old[0]?.vnd ?? 0));
    const owed = await sql.query<{ n: number }>(`select coalesce(sum(left_tokens), 0)::bigint as n from token_grants where expires_at > now() and left_tokens > 0`);
    const expired = await sql.query<{ n: number }>(
      `select coalesce(sum(left_tokens), 0)::bigint as n from token_grants where expires_at <= now() and expires_at > now() - $1::interval and left_tokens > 0`,
      [window],
    );
    const revenue = Number(money[0]?.revenue ?? 0);
    const providers = Math.round(spend.total.vnd + providersEstimated);
    const commission = Number(hoa[0]?.n ?? 0);
    const manualCost = Number(manual[0]?.n ?? 0);
    const owedTokens = Number(owed[0]?.n ?? 0);
    const owedVnd = Math.round(owedTokens * turbo);
    return {
      revenue,
      providers,
      providersEstimated,
      commission,
      manual: manualCost,
      owedTokens,
      owedVnd,
      expiredTokens: Number(expired[0]?.n ?? 0),
      spend,
      verdict: verdict({ revenue, providers, commission, manual: manualCost, owedTokensVnd: owedVnd }),
    };
  });
