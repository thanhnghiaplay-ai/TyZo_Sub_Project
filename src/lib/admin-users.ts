import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { roomPlan } from "@/lib/room-plans";
import { isStaffRole, outranks, roleAtLeast, type RoomStanding, type StaffRole } from "@/lib/staff-role";
import { BADGE_STYLES, badgeStyle } from "@/lib/badge-styles";

import { asStanding, assertLower, clip, requireRole, stamp, writeAudit } from "@/lib/admin-room";

/** Quản lý tài khoản khách ở Admin: tìm, ghi chú, mật khẩu tạm, khóa/mở, cấp gói, đổi quyền, xóa, Token, số dư, thẻ quyền. Tách từ admin-room.ts (23/11/2026); kiểm quyền và nhật ký dùng chung ở admin-room.ts. */

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  balance: number;
  plan: string | null;
  planUntil: string | null;
  trialLeft: number;
  status: RoomStanding;
  reason: string;
  note: string;
  role: StaffRole | null;
  partner: boolean;
};

export type LedgerRow = {
  id: number;
  kind: string;
  amount: number;
  note: string;
  createdAt: string;
};

/** Bỏ dấu tiếng Việt để tìm tên thiếu dấu / gần đúng. */
function foldVi(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((q: string) => {
    const term = q.trim();
    if (term.length < 2) throw new Error("Gõ ít nhất 2 ký tự.");
    return term.slice(0, 80);
  })
  .handler(async ({ context, data }): Promise<AdminUser[]> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const safe = data.replace(/[%_]/g, "");
    const like = `%${safe}%`;
    const folded = foldVi(safe);
    const foldLike = `%${folded}%`;
    // translate bỏ dấu phổ biến trong Postgres khi không có extension unaccent
    const rows = await sql<{
      id: string;
      email: string;
      name: string;
      balance: number | null;
      plan: string | null;
      plan_until: unknown;
      trial_left: number | null;
      status: string | null;
      status_reason: string | null;
      staff_note: string | null;
      role: string | null;
      partner: boolean | null;
    }>`
      select u.id, u.email, u.name, a.balance, a.plan, a.plan_until, a.trial_left,
             a.status, a.status_reason, a.staff_note, s.role,
             exists (select 1 from affiliates f where f.user_id = u.id) as partner
      from "user" u
      left join room_accounts a on a.user_id = u.id
      left join room_staff s on s.user_id = u.id
      where u.email ilike ${like}
         or u.name ilike ${like}
         or translate(
              lower(coalesce(u.name, '')),
              'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
              'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
            ) like ${foldLike}
         or translate(
              lower(coalesce(u.email, '')),
              'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
              'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
            ) like ${foldLike}
      order by u."createdAt" desc
      limit 20
    `;
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      balance: row.balance ?? 0,
      plan: row.plan,
      planUntil: row.plan_until ? stamp(row.plan_until) : null,
      trialLeft: row.trial_left ?? 1,
      status: asStanding(row.status),
      reason: row.status_reason ?? "",
      note: row.staff_note ?? "",
      role: isStaffRole(row.role) ? row.role : null,
      partner: Boolean(row.partner),
    }));
  });

export const listUserLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => {
    const id = userId?.trim();
    if (!id) throw new Error("Thiếu tài khoản.");
    return id;
  })
  .handler(async ({ context, data }): Promise<LedgerRow[]> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: number; kind: string; amount: number; note: string; created_at: unknown }>`
      select id, kind, amount, note, created_at from room_ledger
      where user_id = ${data}
      order by id desc
      limit 30
    `;
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      amount: row.amount,
      note: row.note,
      createdAt: stamp(row.created_at),
    }));
  });

export const saveStaffNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; note: string }) => ({
    userId: input.userId?.trim(),
    note: clip(input.note ?? "", 500),
  }))
  .handler(async ({ context, data }) => {
    if (!data.userId) throw new Error("Thiếu tài khoản.");
    await requireRole(context.userId, "ho-tro");
    await assertLower(context.userId, data.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into room_accounts (user_id) values (${data.userId}) on conflict (user_id) do nothing`;
    await sql`update room_accounts set staff_note = ${data.note} where user_id = ${data.userId}`;
    await writeAudit(context.userId, "ghi-chu", data.userId, data.note);
    return { ok: true };
  });

export const setTempPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; password: string }) => {
    const password = input.password ?? "";
    if (password.length < 8) throw new Error("Mật khẩu tạm ít nhất 8 ký tự.");
    return { userId: input.userId?.trim(), password };
  })
  .handler(async ({ context, data }) => {
    if (!data.userId) throw new Error("Thiếu tài khoản.");
    await requireRole(context.userId, "quan-ly");
    await assertLower(context.userId, data.userId);
    const { hashPassword } = await import("better-auth/crypto");
    const hash = await hashPassword(data.password);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const updated = await sql<{ id: string }>`
      update "account"
      set "password" = ${hash}, "updatedAt" = now()
      where "userId" = ${data.userId} and "providerId" = 'credential'
      returning id
    `;
    if (!updated.length) throw new Error("Tài khoản này không có mật khẩu để đặt lại.");
    await writeAudit(context.userId, "mat-khau-tam", data.userId, "Đặt mật khẩu tạm");
    return { ok: true };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; status: RoomStanding; reason: string }) => {
    const status = input.status;
    if (status !== "open" && status !== "locked" && status !== "banned") throw new Error("Trạng thái không đúng.");
    const reason = clip(input.reason ?? "", 300);
    if (status !== "open" && reason.length < 8) throw new Error("Hãy ghi lý do, ít nhất 8 ký tự.");
    return { userId: input.userId?.trim(), status, reason };
  })
  .handler(async ({ context, data }) => {
    if (!data.userId) throw new Error("Thiếu tài khoản.");
    if (data.userId === context.userId) throw new Error("Không xử lý tài khoản của chính bạn.");
    const actor = await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const target = await sql<{ email: string; role: string | null; status: string | null }>`
      select u.email, s.role, a.status
      from "user" u
      left join room_staff s on s.user_id = u.id
      left join room_accounts a on a.user_id = u.id
      where u.id = ${data.userId}
    `;
    if (!target.length) throw new Error("Không thấy tài khoản.");
    if (target[0].role === "chu") throw new Error("Không xử lý tài khoản Admin.");
    const targetRole = isStaffRole(target[0].role) ? target[0].role : null;
    if (!outranks(actor.role, targetRole)) throw new Error("Không xử lý người cùng cấp hoặc cấp trên.");
    if (targetRole === "chu") throw new Error("Không khóa hoặc cấm Admin.");
    const current = asStanding(target[0].status);
    if (data.status === "banned" || current === "banned") {
      if (!roleAtLeast(actor.role, "chu")) throw new Error("Chỉ Admin được cấm hoặc gỡ cấm.");
    }
    await sql`insert into room_accounts (user_id) values (${data.userId}) on conflict (user_id) do nothing`;
    await sql`
      update room_accounts
      set status = ${data.status}, status_reason = ${data.reason}
      where user_id = ${data.userId}
    `;
    await writeAudit(context.userId, `trang-thai-${data.status}`, data.userId, data.reason);
    return { ok: true };
  });

export const grantPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; planId: string }) => {
    const plan = roomPlan(input.planId);
    if (!plan) throw new Error("Gói không có.");
    return { userId: input.userId?.trim(), planId: plan.id };
  })
  .handler(async ({ context, data }) => {
    if (!data.userId) throw new Error("Thiếu tài khoản.");
    const place = await requireRole(context.userId, "chu");
    await assertLower(context.userId, data.userId);
    const plan = roomPlan(data.planId)!;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const standing = await sql<{ status: string }>`select status from room_accounts where user_id = ${data.userId}`;
    if (asStanding(standing[0]?.status) === "banned") throw new Error("Tài khoản đang bị cấm.");
    await sql`insert into room_accounts (user_id) values (${data.userId}) on conflict (user_id) do nothing`;
    await sql`
      update room_accounts
      set plan = ${plan.id},
          plan_until = (case when plan_until > now() then plan_until else now() end)
            + make_interval(hours => ${plan.hours})
      where user_id = ${data.userId}
    `;
    await sql`
      insert into room_ledger (user_id, kind, amount, note)
      values (${data.userId}, 'goi', 0, ${"Admin " + place.email + " mở gói " + plan.name})
    `;
    await writeAudit(context.userId, "mo-goi", data.userId, plan.name);
    return { ok: true };
  });

export const setStaffRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; role: string }) => {
    const role = input.role;
    if (role !== "ho-tro" && role !== "quan-ly" && role !== "none") throw new Error("Quyền không đúng.");
    return { userId: input.userId?.trim(), role };
  })
  .handler(async ({ context, data }) => {
    if (!data.userId) throw new Error("Thiếu tài khoản.");
    if (data.userId === context.userId) throw new Error("Không đổi quyền của chính bạn.");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const person = await sql<{ email: string }>`select email from "user" where id = ${data.userId}`;
    if (!person.length) throw new Error("Không thấy tài khoản.");
    const target = await sql<{ role: string }>`select role from room_staff where user_id = ${data.userId}`;
    if (target[0]?.role === "chu") throw new Error("Không đổi quyền Admin.");
    if (data.role === "none") {
      await sql`delete from room_staff where user_id = ${data.userId}`;
    } else {
      await sql`
        insert into room_staff (user_id, role) values (${data.userId}, ${data.role})
        on conflict (user_id) do update set role = ${data.role}
      `;
    }
    const { describeStaffChange } = await import("@/lib/audit-note");
    const change = describeStaffChange(person[0].email, target[0]?.role ?? null, data.role === "none" ? null : data.role);
    await writeAudit(context.userId, change.action, data.userId, change.note);
    return { ok: true };
  });

export const removeUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => {
    const id = userId.trim();
    if (!id) throw new Error("Thiếu tài khoản.");
    return id;
  })
  .handler(async ({ context, data }) => {
    if (data === context.userId) throw new Error("Không xóa tài khoản của chính bạn.");
    const place = await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const person = await sql<{ email: string; role: string }>`
      select u.email, s.role from "user" u left join room_staff s on s.user_id = u.id where u.id = ${data}
    `;
    if (!person.length) throw new Error("Không thấy tài khoản.");
    if (person[0].role === "chu") throw new Error("Không xóa Admin.");
    let holds: { id: string }[] = [];
    try {
      holds = await sql<{ id: string }>`
        select id from run_tickets where user_id = ${data} and status = 'dang-giu' and held > 0
      `;
    } catch {
      holds = [];
    }
    const { releaseHoldWith } = await import("@/lib/pay-flow");
    for (const row of holds) {
      try {
        await releaseHoldWith(sql, row.id, `Nhả khoản giữ khi xóa tài khoản, bởi ${place.email}`);
      } catch {
        /* phiếu đã đổi trạng thái */
      }
    }
    await sql`delete from room_staff where user_id = ${data}`;
    await sql`update pay_orders set status = 'cancelled' where user_id = ${data} and status in ('pending', 'claimed')`;
    await sql`update room_appeals set user_id = null where user_id = ${data}`;
    try {
      await sql`delete from trial_devices where user_id = ${data}`;
    } catch {
      /* bảng có sau lần xây mới */
    }
    try {
      await sql`delete from room_presence where user_id = ${data}`;
    } catch {
      /* bảng có sau lần xây mới */
    }
    try {
      await sql`delete from room_notices where user_id = ${data}`;
    } catch {
      /* bảng có sau lần xây mới */
    }
    const gone = await sql<{ id: string }>`delete from "user" where id = ${data} returning id`;
    if (!gone.length) throw new Error("Không thấy tài khoản.");
    await writeAudit(context.userId, "xoa-tai-khoan", data, "Xóa tài khoản");
    return { ok: true };
  });


export const resetUserBalance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => {
    const id = userId?.trim();
    if (!id) throw new Error("Thiếu tài khoản.");
    return id;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    await assertLower(context.userId, data);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into room_accounts (user_id, balance) values (${data}, 0) on conflict (user_id) do update set balance = 0`;
    await writeAudit(context.userId, "reset-so-du", data, "Gỡ số dư cũ. Không xóa đơn, Token dịch hay tài khoản.");
    return { ok: true as const };
  });

export const setUserBalance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; balance: number }) => {
    const userId = input.userId?.trim();
    if (!userId) throw new Error("Thiếu tài khoản.");
    const balance = Math.round(Number(input.balance));
    if (!Number.isFinite(balance) || balance < 0 || balance > 100_000_000) {
      throw new Error("Số dư từ 0 đến 100.000.000 đồng.");
    }
    return { userId, balance };
  })
  .handler(async () => {
    throw new Error("Không đặt số dư. Số dư không dùng để chi.");
  });

export const readUserTokens = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => {
    const id = userId?.trim();
    if (!id) throw new Error("Thiếu tài khoản.");
    return id;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const { giayBalance } = await import("@/lib/token-flow");
    const sql = await getSql();
    return { tokens: await giayBalance(sql, data) };
  });

export const setUserTokens = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; tokens: number }) => {
    const userId = input.userId?.trim();
    if (!userId) throw new Error("Thiếu tài khoản.");
    const tokens = Math.round(Number(input.tokens));
    if (!Number.isFinite(tokens) || tokens < 0 || tokens > 50_000_000) {
      throw new Error("Token dịch từ 0 đến 50.000.000.");
    }
    return { userId, tokens };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "quan-ly");
    await assertLower(context.userId, data.userId);
    const { getSql } = await import("@/lib/db");
    const { setTokenBalanceWith } = await import("@/lib/token-flow");
    const sql = await getSql();
    const next = await setTokenBalanceWith(sql, data.userId, data.tokens);
    await writeAudit(context.userId, "chinh-token", data.userId, `Token dịch ${next.before} → ${next.after}.`);
    return next;
  });

export const getBadgeStyle = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    try {
      const { getSql } = await import("@/lib/db");
      const { badgeStyle: readBadge } = await import("@/lib/badge-styles");
      const sql = await getSql();
      const rows = await sql<{ value: string }>`select value from room_settings where key = 'badge'`;
      return readBadge(rows[0]?.value);
    } catch {
      return "ribbon" as const;
    }
  });

export const setBadgeStyle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    if (!BADGE_STYLES.some((item) => item.id === id)) throw new Error("Kiểu thẻ không có.");
    return badgeStyle(id);
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into room_settings (key, value) values ('badge', ${data})
      on conflict (key) do update set value = ${data}
    `;
    await writeAudit(context.userId, "doi-the-quyen", null, data);
    return { ok: true as const, style: data };
  });
