import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { AFFILIATE_DEFAULT, maskEmail, parseAffiliateRules, referralCode, type AffiliateRules } from "@/lib/affiliate";

function missingTable(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("does not exist")) throw new Error("Bảng cộng tác viên chưa được tạo. Hãy tải lại sau ít giây.");
  throw error instanceof Error ? error : new Error("Chưa mở được.");
}

async function owner(userId: string) {
  const { requireRole } = await import("@/lib/admin-room");
  await requireRole(userId, "chu");
}

function freshCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return referralCode(bytes);
}

export const getAffiliateDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await owner(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    try {
      const { settleAffiliate } = await import("@/lib/affiliate-flow");
      await settleAffiliate(sql);
      const saved = await sql<{ value: string }>`select value from room_settings where key = 'affiliate'`;
      const rules = parseAffiliateRules(saved[0]?.value);
      const people = await sql<{ user_id: string; email: string; name: string; code: string; status: string; rate_plan_bp: number; rate_run_bp: number; waiting: number; ready: number }>`
        select a.user_id, u.email, u.name, a.code, a.status, a.rate_plan_bp, a.rate_run_bp,
          coalesce(sum(case when e.status = 'treo' then e.amount else 0 end), 0)::int as waiting,
          coalesce(sum(case when e.status = 'da-duyet' then e.amount else 0 end), 0)::int as ready
        from affiliates a
        join "user" u on u.id = a.user_id
        left join commission_events e on e.affiliate_id = a.user_id
        group by a.user_id, u.email, u.name, a.code, a.status, a.rate_plan_bp, a.rate_run_bp
        order by a.created_at desc
        limit 200
      `;
      const payouts = await sql<{ id: number; email: string; amount: number }>`
        select p.id, u.email, p.amount
        from affiliate_payouts p
        join "user" u on u.id = p.affiliate_id
        where p.status = 'cho-chi'
        order by p.requested_at
        limit 20
      `;
      return { rules, people, payouts };
    } catch (error) {
      missingTable(error);
    }
  });

export const saveAffiliateRules = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AffiliateRules) => parseAffiliateRules(JSON.stringify(input)))
  .handler(async ({ context, data }) => {
    await owner(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values ('affiliate', ${value})
      on conflict (key) do update set value = ${value}
    `;
    return data;
  });

export const setAffiliateState = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; status?: "hoat-dong" | "tam-khoa" | "cho-duyet"; ratePlanBp?: number; rateRunBp?: number }) => {
    const userId = input?.userId?.trim() ?? "";
    if (!userId) throw new Error("Thiếu tài khoản.");
    const status = input.status;
    if (status && status !== "hoat-dong" && status !== "tam-khoa" && status !== "cho-duyet") throw new Error("Trạng thái không đúng.");
    return {
      userId,
      status,
      ratePlanBp: Math.max(0, Math.min(10000, Math.round(Number(input.ratePlanBp) || 0))),
      rateRunBp: Math.max(0, Math.min(10000, Math.round(Number(input.rateRunBp) || 0))),
    };
  })
  .handler(async ({ context, data }) => {
    await owner(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    if (data.status) {
      await sql`update affiliates set status = ${data.status} where user_id = ${data.userId}`;
    }
    await sql`update affiliates set rate_plan_bp = ${data.ratePlanBp}, rate_run_bp = ${data.rateRunBp} where user_id = ${data.userId}`;
    return { ok: true as const };
  });

export const markPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; ref: string }) => {
    const id = Number(input?.id);
    const ref = input?.ref?.trim().slice(0, 80) ?? "";
    if (!Number.isInteger(id) || id < 1 || ref.length < 2) throw new Error("Thiếu mã chuyển khoản.");
    return { id, ref };
  })
  .handler(async ({ context, data }) => {
    await owner(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      update affiliate_payouts set status = 'da-chi', paid_ref = ${data.ref}, paid_at = now()
      where id = ${data.id} and status = 'cho-chi'
    `;
    await sql`
      update commission_events set status = 'da-chi'
      where affiliate_id = (select affiliate_id from affiliate_payouts where id = ${data.id}) and status = 'cho-rut'
    `;
    return { ok: true as const };
  });

export const applyAffiliate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    try {
      const existing = await sql<{ code: string; status: string }>`select code, status from affiliates where user_id = ${context.userId}`;
      if (existing.length) return existing[0];
      for (let i = 0; i < 5; i += 1) {
        const code = freshCode();
        const rows = await sql<{ code: string; status: string }>`
          insert into affiliates (user_id, code) values (${context.userId}, ${code})
          on conflict (user_id) do nothing
          returning code, status
        `;
        if (rows.length) return rows[0];
      }
      throw new Error("Chưa tạo được mã.");
    } catch (error) {
      missingTable(error);
    }
  });

export const attachReferral = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: string) => {
    const next = code?.trim().toUpperCase() ?? "";
    if (!/^[A-Z2-9]{8}$/.test(next)) throw new Error("Mã không đúng.");
    return next;
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const host = await sql<{ user_id: string; email: string }>`
      select a.user_id, u.email from affiliates a join "user" u on u.id = a.user_id
      where a.code = ${data} and a.status = 'hoat-dong'
    `;
    const me = await sql<{ email: string }>`select email from "user" where id = ${context.userId}`;
    if (!host.length || host[0].user_id === context.userId || host[0].email === me[0]?.email) return { ok: false as const };
    await sql`
      insert into referrals (user_id, affiliate_id)
      values (${context.userId}, ${host[0].user_id})
      on conflict (user_id) do nothing
    `;
    return { ok: true as const };
  });

export const myAffiliate = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    try {
      const { settleAffiliate } = await import("@/lib/affiliate-flow");
      await settleAffiliate(sql);
      const mine = await sql<{ code: string; status: string }>`select code, status from affiliates where user_id = ${context.userId}`;
      if (!mine.length) return { joined: false as const, rules: AFFILIATE_DEFAULT };
    const sums = await sql<{ status: string; amount: number }>`
      select status, coalesce(sum(amount), 0)::int as amount from commission_events
      where affiliate_id = ${context.userId} group by status
    `;
    const guests = await sql<{ email: string; attached_at: string }>`
      select u.email, r.attached_at from referrals r join "user" u on u.id = r.user_id
      where r.affiliate_id = ${context.userId} order by r.attached_at desc limit 30
    `;
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'affiliate'`;
    const by = Object.fromEntries(sums.map((row) => [row.status, row.amount]));
    return {
      joined: true as const,
      code: mine[0].code,
      status: mine[0].status,
      waiting: Number(by.treo ?? 0),
      ready: Number(by["da-duyet"] ?? 0),
      paid: Number(by["da-chi"] ?? 0),
      guests: guests.map((row) => ({ email: maskEmail(row.email), at: row.attached_at })),
      rules: parseAffiliateRules(saved[0]?.value),
    };
    } catch (error) {
      missingTable(error);
    }
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'affiliate'`;
    const rules = parseAffiliateRules(saved[0]?.value);
    const ready = await sql<{ amount: number }>`
      select coalesce(sum(amount), 0)::int as amount from commission_events
      where affiliate_id = ${context.userId} and status = 'da-duyet'
    `;
    const amount = Number(ready[0]?.amount ?? 0);
    if (amount < rules.minPayout) throw new Error("Chưa đủ số tiền tối thiểu để rút.");
    const open = await sql<{ id: number }>`select id from affiliate_payouts where affiliate_id = ${context.userId} and status = 'cho-chi'`;
    if (open.length) throw new Error("Đang có một lệnh rút chờ duyệt.");
    await sql`update commission_events set status = 'cho-rut' where affiliate_id = ${context.userId} and status = 'da-duyet'`;
    await sql`insert into affiliate_payouts (affiliate_id, amount) values (${context.userId}, ${amount})`;
    return { ok: true as const, amount };
  });
