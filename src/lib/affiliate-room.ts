import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { bankName, cleanPayoutBank, maskAccount, maskEmail, parseAffiliateRules, referralCode, type AffiliateRules, type PayoutBank } from "@/lib/affiliate";

function missingTable(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("does not exist")) throw new Error("Bảng cộng tác viên chưa được tạo. Hãy tải lại sau ít giây.");
  throw error instanceof Error ? error : new Error("Chưa mở được.");
}

async function owner(userId: string) {
  const { requireRole } = await import("@/lib/admin/admin-room");
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
      const people = await sql<{ user_id: string; email: string; name: string; code: string; status: string; rate_plan_bp: number; rate_run_bp: number; waiting: number; ready: number; paid: number; guests: number; has_bank: boolean }>`
        select a.user_id, u.email, u.name, a.code, a.status, a.rate_plan_bp, a.rate_run_bp,
          coalesce((select sum(amount) from commission_events e where e.affiliate_id = a.user_id and e.status = 'treo'), 0)::int as waiting,
          coalesce((select sum(amount) from commission_events e where e.affiliate_id = a.user_id and e.status = 'da-duyet'), 0)::int as ready,
          coalesce((select sum(amount) from commission_events e where e.affiliate_id = a.user_id and e.status = 'da-chi'), 0)::int as paid,
          (select count(*) from referrals r where r.affiliate_id = a.user_id)::int as guests,
          (a.bank_account <> '') as has_bank
        from affiliates a
        join "user" u on u.id = a.user_id
        order by a.created_at desc
        limit 200
      `;
      const rows = await sql<{ id: number; email: string; amount: number; bank_info: string; requested_at: string | Date }>`
        select p.id, u.email, p.amount, p.bank_info, p.requested_at
        from affiliate_payouts p
        join "user" u on u.id = p.affiliate_id
        where p.status = 'cho-chi'
        order by p.requested_at
        limit 20
      `;
      const { vietqrPayload } = await import("@/lib/payment/pay-match");
      const { toDataURL } = await import("qrcode");
      const payouts = await Promise.all(
        rows.map(async (row) => {
          let qr = "";
          try {
            const bank = JSON.parse(row.bank_info || "{}") as Partial<PayoutBank>;
            const payload = bank.bank && bank.account ? vietqrPayload({ bank: bank.bank, account: bank.account, amount: row.amount, info: `TYZO CTV ${row.id}` }) : null;
            if (payload) qr = await toDataURL(payload, { margin: 1, width: 240 });
            return { id: row.id, email: row.email, amount: row.amount, bank: bank.bank ? `${bankName(bank.bank)} · ${bank.account} · ${bank.holder}` : "Chưa có tài khoản", qr, at: new Date(row.requested_at).toISOString() };
          } catch {
            return { id: row.id, email: row.email, amount: row.amount, bank: "Thông tin tài khoản lỗi", qr, at: new Date(row.requested_at).toISOString() };
          }
        }),
      );
      const totals = await sql<{ status: string; amount: number }>`
        select status, coalesce(sum(amount), 0)::int as amount from commission_events group by status
      `;
      return { rules, people, payouts, totals: Object.fromEntries(totals.map((row) => [row.status, Number(row.amount)])) as Record<string, number> };
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
    const { markPayoutWith } = await import("@/lib/affiliate-payout");
    return markPayoutWith(await getSql(), data.id, data.ref);
  });

/** Admin từ chối một lệnh rút: trả các khoản về «Rút được» để CTV sửa tài khoản rồi rút lại. */
export const cancelPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; note: string }) => {
    const id = Number(input?.id);
    if (!Number.isInteger(id) || id < 1) throw new Error("Lệnh rút không đúng.");
    return { id, note: String(input?.note ?? "").trim().slice(0, 200) };
  })
  .handler(async ({ context, data }) => {
    await owner(context.userId);
    const { getSql } = await import("@/lib/db");
    const { cancelPayoutWith } = await import("@/lib/affiliate-payout");
    return cancelPayoutWith(await getSql(), data.id, data.note);
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
    // Kiểm toán R5-007: khách đã gắn mã khác từ trước thì không ghi được: báo đúng là chưa gắn mã này.
    const added = await sql`
      insert into referrals (user_id, affiliate_id)
      values (${context.userId}, ${host[0].user_id})
      on conflict (user_id) do nothing
      returning 1
    `;
    if (!added.length) {
      const already = await sql<{ affiliate_id: string }>`select affiliate_id from referrals where user_id = ${context.userId}`;
      return { ok: already[0]?.affiliate_id === host[0].user_id };
    }
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
      const saved = await sql<{ value: string }>`select value from room_settings where key = 'affiliate'`;
      const rules = parseAffiliateRules(saved[0]?.value);
      const mine = await sql<{ code: string; status: string; rate_plan_bp: number; rate_run_bp: number; bank_name: string; bank_account: string; bank_holder: string }>`
        select code, status, rate_plan_bp, rate_run_bp, bank_name, bank_account, bank_holder from affiliates where user_id = ${context.userId}
      `;
      if (!mine.length) return { joined: false as const, rules };
      const me = mine[0];
      const sums = await sql<{ status: string; amount: number }>`
        select status, coalesce(sum(amount), 0)::int as amount from commission_events
        where affiliate_id = ${context.userId} group by status
      `;
      const by = Object.fromEntries(sums.map((row) => [row.status, Number(row.amount)]));
      const guests = await sql<{ email: string; attached_at: string | Date; bought: boolean }>`
        select u.email, r.attached_at,
          exists (select 1 from commission_events e where e.affiliate_id = r.affiliate_id and e.referred_user_id = r.user_id) as bought
        from referrals r join "user" u on u.id = r.user_id
        where r.affiliate_id = ${context.userId} order by r.attached_at desc limit 200
      `;
      const events = await sql<{ id: number; email: string; source_kind: string; base_amount: number; amount: number; status: string; available_at: string | Date; created_at: string | Date }>`
        select e.id, coalesce(u.email, '') as email, e.source_kind, e.base_amount, e.amount, e.status, e.available_at, e.created_at
        from commission_events e left join "user" u on u.id = e.referred_user_id
        where e.affiliate_id = ${context.userId} and e.status <> 'huy'
        order by e.created_at desc limit 200
      `;
      const payouts = await sql<{ id: number; amount: number; status: string; requested_at: string | Date; paid_at: string | Date | null; paid_ref: string; note: string }>`
        select id, amount, status, requested_at, paid_at, paid_ref, note from affiliate_payouts
        where affiliate_id = ${context.userId} order by requested_at desc limit 50
      `;
      const iso = (value: string | Date) => new Date(value).toISOString();
      const { toDataURL } = await import("qrcode");
      const { getRequest } = await import("@tanstack/react-start/server");
      const request = getRequest();
      const host = request?.headers.get("x-forwarded-host") ?? request?.headers.get("host") ?? "";
      const proto = request?.headers.get("x-forwarded-proto") ?? "https";
      const link = host ? `${proto}://${host}/?ref=${me.code}` : `/?ref=${me.code}`;
      return {
        joined: true as const,
        code: me.code,
        status: me.status,
        link,
        qr: me.status === "hoat-dong" && host ? await toDataURL(link, { margin: 1, width: 240 }) : "",
        ratePlanBp: Number(me.rate_plan_bp) > 0 ? Number(me.rate_plan_bp) : rules.ratePlanBp,
        rateTokenBp: Number(me.rate_run_bp) > 0 ? Number(me.rate_run_bp) : rules.rateRunBp,
        waiting: Number(by.treo ?? 0),
        ready: Number(by["da-duyet"] ?? 0),
        pending: Number(by["cho-rut"] ?? 0),
        paid: Number(by["da-chi"] ?? 0),
        bank: me.bank_account ? { bank: me.bank_name, bankName: bankName(me.bank_name), account: me.bank_account, masked: maskAccount(me.bank_account), holder: me.bank_holder } : null,
        guests: guests.map((row) => ({ email: maskEmail(row.email), at: iso(row.attached_at), bought: Boolean(row.bought) })),
        events: events.map((row) => ({ id: row.id, email: maskEmail(row.email), kind: row.source_kind, base: Number(row.base_amount), amount: Number(row.amount), status: row.status, availableAt: iso(row.available_at), at: iso(row.created_at) })),
        payouts: payouts.map((row) => ({ id: row.id, amount: Number(row.amount), status: row.status, at: iso(row.requested_at), paidAt: row.paid_at ? iso(row.paid_at) : null, ref: row.paid_ref, note: row.note })),
        rules,
      };
    } catch (error) {
      missingTable(error);
    }
  });

/** CTV lưu tài khoản ngân hàng nhận tiền. */
export const saveAffiliateBank = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: PayoutBank) => cleanPayoutBank(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const open = await sql<{ id: number }>`select id from affiliate_payouts where affiliate_id = ${context.userId} and status = 'cho-chi'`;
    if (open.length) throw new Error("Đang có lệnh rút chờ chuyển. Đợi Admin chuyển xong rồi mới đổi tài khoản.");
    const rows = await sql<{ user_id: string }>`
      update affiliates set bank_name = ${data.bank}, bank_account = ${data.account}, bank_holder = ${data.holder}, bank_updated_at = now()
      where user_id = ${context.userId} returning user_id
    `;
    if (!rows.length) throw new Error("Bạn chưa đăng ký cộng tác viên.");
    return { ok: true as const, masked: maskAccount(data.account) };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'affiliate'`;
    const rules = parseAffiliateRules(saved[0]?.value);
    const { requestPayoutWith } = await import("@/lib/affiliate-payout");
    const { amount } = await requestPayoutWith(sql, context.userId, rules);
    return { ok: true as const, amount };
  });
