import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { roomPlan } from "@/lib/room-plans";
import { canSeeLog, isStaffRole, nextHold, outranks, roleAtLeast, type RoomStanding, type StaffRole } from "@/lib/staff-role";

export type MyPlace = {
  role: StaffRole | null;
  status: RoomStanding;
  reason: string;
  email: string;
};

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
};

export type LedgerRow = {
  id: number;
  kind: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type AppealRow = {
  id: number;
  email: string;
  body: string;
  status: string;
  reply: string;
  createdAt: string;
  holdRole: string;
  touchedAt: string;
};

export type AuditRow = {
  id: number;
  action: string;
  targetId: string | null;
  note: string;
  createdAt: string;
  actorEmail: string;
  actorRole: string;
  targetEmail: string;
};

function stamp(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asStanding(value: unknown): RoomStanding {
  if (value === "locked" || value === "banned") return value;
  return "open";
}

function clip(value: string, max: number) {
  const text = value.trim();
  if (text.length > max) throw new Error("Nội dung quá dài.");
  return text;
}

async function placeOf(userId: string): Promise<MyPlace> {
  const { getSql } = await import("@/lib/db");
  const { emailIsOwner } = await import("@/lib/admin-allow.server");
  const sql = await getSql();
  const staff = await sql<{ role: string }>`select role from room_staff where user_id = ${userId}`;
  const account = await sql<{ status: string; status_reason: string }>`
    select status, status_reason from room_accounts where user_id = ${userId}
  `;
  const user = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  const email = user[0]?.email ?? "";
  const staffRole = isStaffRole(staff[0]?.role) ? staff[0].role : null;
  return {
    role: emailIsOwner(email) ? "chu" : staffRole,
    status: asStanding(account[0]?.status),
    reason: account[0]?.status_reason ?? "",
    email,
  };
}

async function requireRole(userId: string, need: StaffRole) {
  const place = await placeOf(userId);
  if (!roleAtLeast(place.role, need)) throw new Error("Không đủ quyền.");
  return place;
}

async function writeAudit(actorId: string, action: string, targetId: string | null, note: string) {
  const place = await placeOf(actorId);
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  let targetEmail = "";
  if (targetId) {
    const people = await sql<{ email: string }>`select email from "user" where id = ${targetId}`;
    targetEmail = people[0]?.email ?? "";
    if (!targetEmail && /^\d+$/.test(targetId)) {
      const appeal = await sql<{ email: string }>`select email from room_appeals where id = ${Number(targetId)}`;
      targetEmail = appeal[0]?.email ?? "";
    }
  }
  await sql`
    insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
    values (
      ${actorId},
      ${action},
      ${targetId},
      ${note.slice(0, 500)},
      ${place.email},
      ${place.role ?? "user"},
      ${targetEmail}
    )
  `;
}

async function assertLower(actorId: string, targetUserId: string) {
  const actor = await placeOf(actorId);
  const { getSql } = await import("@/lib/db");
  const { emailIsOwner } = await import("@/lib/admin-allow.server");
  const sql = await getSql();
  const target = await sql<{ email: string; role: string | null }>`
    select u.email, s.role from "user" u
    left join room_staff s on s.user_id = u.id
    where u.id = ${targetUserId}
  `;
  if (!target.length) throw new Error("Không thấy tài khoản.");
  if (emailIsOwner(target[0].email)) throw new Error("Không xử lý tài khoản Chủ.");
  const targetRole = isStaffRole(target[0].role) ? target[0].role : null;
  if (!outranks(actor.role, targetRole)) throw new Error("Không xử lý người cùng cấp hoặc cấp trên.");
}

export const getMyPlace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MyPlace> => {
    await markSeen(context.userId);
    return placeOf(context.userId);
  });

export const touchPresence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await markSeen(context.userId);
    return { ok: true as const };
  });

export type DeskStats = {
  online: number;
  users: number;
  joinedDay: number;
  renting: number;
  trial: number;
  expired: number;
  locked: number;
  banned: number;
  waiting: number;
  managers: number;
  support: number;
};

export const getDeskStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DeskStats> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<DeskStats>`
      select
        (select count(*)::int from room_presence where seen_at > now() - interval '3 minutes') as online,
        (select count(*)::int from "user") as users,
        (select count(*)::int from "user" where "createdAt" > now() - interval '24 hours') as "joinedDay",
        (select count(*)::int from room_accounts where plan_until > now() and status = 'open') as renting,
        (select count(*)::int from room_accounts where status = 'open' and trial_left > 0 and (plan_until is null or plan_until <= now())) as trial,
        (select count(*)::int from room_accounts where plan is not null and plan_until <= now() and status = 'open') as expired,
        (select count(*)::int from room_accounts where status = 'locked') as locked,
        (select count(*)::int from room_accounts where status = 'banned') as banned,
        (select count(*)::int from room_appeals where status = 'cho') as waiting,
        (select count(*)::int from room_staff where role = 'quan-ly') as managers,
        (select count(*)::int from room_staff where role = 'ho-tro') as support
    `;
    const row = rows[0];
    return {
      online: row?.online ?? 0,
      users: row?.users ?? 0,
      joinedDay: row?.joinedDay ?? 0,
      renting: row?.renting ?? 0,
      trial: row?.trial ?? 0,
      expired: row?.expired ?? 0,
      locked: row?.locked ?? 0,
      banned: row?.banned ?? 0,
      waiting: row?.waiting ?? 0,
      managers: row?.managers ?? 0,
      support: row?.support ?? 0,
    };
  });

async function markSeen(userId: string) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into room_presence (user_id, seen_at) values (${userId}, now())
      on conflict (user_id) do update set seen_at = now()
    `;
  } catch {
    // Bảng có sau lần xây mới. Lần này bỏ qua, không chặn đăng nhập.
  }
}

export const setOwnerEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((email: string) => {
    const next = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) throw new Error("Email không đúng.");
    return next;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { writeOwnerEmails } = await import("@/lib/admin-allow.server");
    const owners = writeOwnerEmails([data]);
    await writeAudit(context.userId, "doi-email-chu", null, owners[0] ?? "");
    return { owners };
  });

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
    const { emailIsOwner } = await import("@/lib/admin-allow.server");
    const sql = await getSql();
    const like = `%${data.replace(/[%_]/g, "")}%`;
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
    }>`
      select u.id, u.email, u.name, a.balance, a.plan, a.plan_until, a.trial_left,
             a.status, a.status_reason, a.staff_note, s.role
      from "user" u
      left join room_accounts a on a.user_id = u.id
      left join room_staff s on s.user_id = u.id
      where u.email ilike ${like} or u.name ilike ${like}
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
      role: emailIsOwner(row.email) ? "chu" : isStaffRole(row.role) ? row.role : null,
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
    const { emailIsOwner } = await import("@/lib/admin-allow.server");
    const target = await sql<{ email: string; role: string | null; status: string | null }>`
      select u.email, s.role, a.status
      from "user" u
      left join room_staff s on s.user_id = u.id
      left join room_accounts a on a.user_id = u.id
      where u.id = ${data.userId}
    `;
    if (!target.length) throw new Error("Không thấy tài khoản.");
    if (emailIsOwner(target[0].email)) throw new Error("Không xử lý tài khoản Chủ.");
    const targetRole = isStaffRole(target[0].role) ? target[0].role : null;
    if (!outranks(actor.role, targetRole)) throw new Error("Không xử lý người cùng cấp hoặc cấp trên.");
    if (targetRole === "chu") throw new Error("Không khóa hoặc cấm Chủ.");
    const current = asStanding(target[0].status);
    if (data.status === "banned" || current === "banned") {
      if (!roleAtLeast(actor.role, "chu")) throw new Error("Chỉ Chủ được cấm hoặc gỡ cấm.");
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
    await requireRole(context.userId, "quan-ly");
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
      values (${data.userId}, 'goi', 0, ${"Admin mở gói " + plan.name})
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
    const { emailIsOwner } = await import("@/lib/admin-allow.server");
    const sql = await getSql();
    const person = await sql<{ email: string }>`select email from "user" where id = ${data.userId}`;
    if (!person.length) throw new Error("Không thấy tài khoản.");
    if (emailIsOwner(person[0].email)) throw new Error("Không đổi quyền Chủ.");
    const target = await sql<{ role: string }>`select role from room_staff where user_id = ${data.userId}`;
    if (target[0]?.role === "chu") throw new Error("Không đổi quyền Chủ.");
    if (data.role === "none") {
      await sql`delete from room_staff where user_id = ${data.userId}`;
    } else {
      await sql`
        insert into room_staff (user_id, role) values (${data.userId}, ${data.role})
        on conflict (user_id) do update set role = ${data.role}
      `;
    }
    await writeAudit(context.userId, "doi-quyen", data.userId, data.role);
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
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const { emailIsOwner } = await import("@/lib/admin-allow.server");
    const sql = await getSql();
    const person = await sql<{ email: string; role: string }>`
      select u.email, s.role from "user" u left join room_staff s on s.user_id = u.id where u.id = ${data}
    `;
    if (!person.length) throw new Error("Không thấy tài khoản.");
    if (emailIsOwner(person[0].email) || person[0].role === "chu") throw new Error("Không xóa Chủ.");
    await sql`delete from room_staff where user_id = ${data}`;
    await sql`delete from room_ledger where user_id = ${data}`;
    await sql`delete from room_accounts where user_id = ${data}`;
    await sql`update room_appeals set user_id = null where user_id = ${data}`;
    const gone = await sql<{ id: string }>`delete from "user" where id = ${data} returning id`;
    if (!gone.length) throw new Error("Không thấy tài khoản.");
    await writeAudit(context.userId, "xoa-tai-khoan", data, "Xóa tài khoản");
    return { ok: true };
  });

export const listAppeals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AppealRow[]> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      email: string;
      body: string;
      status: string;
      reply: string;
      created_at: unknown;
      hold_role: string;
      touched_at: unknown;
    }>`
      select id, email, body, status, reply, created_at, hold_role, touched_at
      from room_appeals
      where status = 'cho'
      order by id desc limit 40
    `;
    const place = await placeOf(context.userId);
    return rows
      .filter((row) => place.role === "chu" || row.hold_role === "ho-tro" || (place.role === "quan-ly" && row.hold_role !== "chu"))
      .map((row) => ({
        id: row.id,
        email: row.email,
        body: row.body,
        status: row.status,
        reply: row.reply,
        createdAt: stamp(row.created_at),
        holdRole: row.hold_role || "ho-tro",
        touchedAt: stamp(row.touched_at || row.created_at),
      }));
  });

export const replyAppeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; status: string; reply: string }) => {
    if (input.status !== "mo" && input.status !== "tu-choi") throw new Error("Trạng thái không đúng.");
    const reply = clip(input.reply ?? "", 500);
    if (input.status === "tu-choi" && reply.length < 8) throw new Error("Hãy ghi lý do từ chối, ít nhất 8 ký tự.");
    if (reply.length < 2) throw new Error("Hãy ghi câu trả lời.");
    return { id: Number(input.id), status: input.status, reply };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const updated = await sql<{ id: number }>`
      update room_appeals set status = ${data.status}, reply = ${data.reply}, touched_at = now()
      where id = ${data.id} and status = 'cho'
      returning id
    `;
    if (!updated.length) throw new Error("Yêu cầu này đã được trả lời.");
    const appeal = await sql<{ user_id: string | null }>`select user_id from room_appeals where id = ${data.id}`;
    const userId = appeal[0]?.user_id ?? null;
    if (data.status === "mo" && userId) {
      await sql`
        update room_accounts
        set status = 'open', status_reason = ''
        where user_id = ${userId} and status = 'locked'
      `;
    }
    await writeNotice("user", data.status === "mo" ? "Đã mở lại tài khoản" : "Đã từ chối", data.reply, userId, data.id);
    await writeAudit(context.userId, `yeu-cau-${data.status}`, String(data.id), data.reply);
    return { ok: true };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AuditRow[]> => {
    await requireRole(context.userId, "ho-tro");
    const place = await placeOf(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      action: string;
      target_id: string | null;
      note: string;
      created_at: unknown;
      actor_email: string;
      actor_role: string;
      target_email: string;
    }>`
      select id, action, target_id, note, created_at, actor_email, actor_role, target_email
      from room_audit order by id desc limit 80
    `;
    return rows
      .filter((row) => place.role && canSeeLog(place.role, row.actor_role || "user"))
      .map((row) => ({
        id: row.id,
        action: row.action,
        targetId: row.target_id,
        note: row.note,
        createdAt: stamp(row.created_at),
        actorEmail: row.actor_email || "",
        actorRole: row.actor_role || "user",
        targetEmail: row.target_email || "",
      }));
  });

export type NoticeRow = { id: number; title: string; body: string; createdAt: string; read: boolean; appealId: number | null };

export const listMyNotices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ unread: number; items: NoticeRow[] }> => {
    const place = await placeOf(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const staff = Boolean(place.role);
    const rank = place.role ?? "";
    const rows = await sql<{ id: number; title: string; body: string; created_at: unknown; read_at: unknown; appeal_id: number | null }>`
      select id, title, body, created_at, read_at, appeal_id from room_notices
      where (kind = 'user' and user_id = ${context.userId})
         or (${staff} and kind = 'staff')
         or (kind = ${rank})
      order by id desc
      limit 20
    `;
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: stamp(row.created_at),
      read: Boolean(row.read_at),
      appealId: row.appeal_id,
    }));
    return { unread: items.filter((item) => !item.read).length, items };
  });

export const markNoticesRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const place = await placeOf(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const staff = Boolean(place.role);
    const rank = place.role ?? "";
    await sql`
      update room_notices set read_at = now()
      where read_at is null and (
        (kind = 'user' and user_id = ${context.userId})
        or (${staff} and kind = 'staff')
        or kind = ${rank}
      )
    `;
    return { ok: true as const };
  });

async function writeNotice(kind: string, title: string, body: string, userId: string | null, appealId: number | null = null) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into room_notices (user_id, kind, title, body, appeal_id)
      values (${userId}, ${kind}, ${title.slice(0, 120)}, ${body.slice(0, 500)}, ${appealId})
    `;
  } catch {
    // Bảng có sau lần xây mới.
  }
}

async function insertAppeal(email: string, body: string, userId: string | null) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const waiting = await sql<{ n: number }>`
    select count(*)::int as n from room_appeals where email = ${email} and status = 'cho'
  `;
  if ((waiting[0]?.n ?? 0) >= 3) throw new Error("Đã có yêu cầu đang chờ.");
  await sql`
    insert into room_appeals (user_id, email, body)
    values (${userId}, ${email}, ${body})
  `;
  await writeNotice("ho-tro", "Yêu cầu mới", `${email}: ${body.slice(0, 140)}`, null);
}

export const submitAppeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((body: string) => {
    const text = clip(body, 1000);
    if (text.length < 10) throw new Error("Hãy viết rõ, ít nhất 10 ký tự.");
    return text;
  })
  .handler(async ({ context, data }) => {
    const place = await placeOf(context.userId);
    if (!place.email) throw new Error("Không thấy email.");
    await insertAppeal(place.email, data, context.userId);
    await writeAudit(context.userId, "gui-yeu-cau", context.userId, data);
    return { ok: true };
  });

export const submitPublicAppeal = createServerFn({ method: "POST" })
  .validator((input: { email: string; body: string }) => {
    const email = input.email?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email không đúng.");
    const body = clip(input.body ?? "", 1000);
    if (body.length < 10) throw new Error("Hãy viết rõ, ít nhất 10 ký tự.");
    return { email, body };
  })
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const user = await sql<{ id: string }>`select id from "user" where lower(email) = ${data.email}`;
    await insertAppeal(data.email, data.body, user[0]?.id ?? null);
    return { ok: true };
  });

export const sendAppealReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; reply: string }) => {
    const reply = clip(input.reply ?? "", 500);
    if (reply.length < 2) throw new Error("Hãy ghi câu trả lời.");
    return { id: Number(input.id), reply };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const updated = await sql<{ user_id: string | null }>`
      update room_appeals set status = 'xong', reply = ${data.reply}, touched_at = now()
      where id = ${data.id} and status = 'cho'
      returning user_id
    `;
    if (!updated.length) throw new Error("Yêu cầu này đã được trả lời.");
    await writeNotice("user", "Đã có trả lời", data.reply, updated[0].user_id, data.id);
    await writeAudit(context.userId, "tra-loi", String(data.id), data.reply);
    return { ok: true };
  });

export const escalateAppeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data }) => {
    const place = await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ hold_role: string; status: string; email: string; body: string; reply: string; user_id: string | null }>`
      select hold_role, status, email, body, reply, user_id from room_appeals where id = ${data}
    `;
    if (!rows.length || rows[0].status !== "cho") throw new Error("Yêu cầu này không còn chờ.");
    const hold = isStaffRole(rows[0].hold_role) ? rows[0].hold_role : "ho-tro";
    if (hold === "chu") throw new Error("Việc đang ở Chủ.");
    if (place.role === "ho-tro" && hold !== "ho-tro") throw new Error("Việc này đã chuyển cấp trên.");
    const managers = await sql<{ n: number }>`select count(*)::int as n from room_staff where role = 'quan-ly'`;
    const next = place.role === "ho-tro" ? nextHold(hold, managers[0]?.n ?? 0) : "chu";
    await sql`update room_appeals set hold_role = ${next}, touched_at = now() where id = ${data}`;
    const pack = `${rows[0].email}\n${rows[0].body}\nĐã trả lời: ${rows[0].reply || "chưa"}`;
    await writeNotice(next, "Việc chuyển lên", pack, null, data);
    await writeNotice("user", "Đã báo cấp trên", "Yêu cầu của bạn đã được chuyển lên cấp cao hơn. Khi có trả lời, bạn sẽ thấy ở chuông.", rows[0].user_id, data);
    await writeAudit(context.userId, "bao-cap", String(data), pack);
    return { next };
  });

export const skipAppeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => Number(id))
  .handler(async ({ context, data }) => {
    const place = await placeOf(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ hold_role: string; status: string; email: string; body: string; reply: string; user_id: string | null; touched_at: unknown }>`
      select hold_role, status, email, body, reply, user_id, touched_at from room_appeals where id = ${data}
    `;
    if (!rows.length || rows[0].status !== "cho") throw new Error("Yêu cầu này không còn chờ.");
    const hold = rows[0].hold_role || "ho-tro";
    const touched = new Date(stamp(rows[0].touched_at)).getTime();
    const { canSkipToOwner } = await import("@/lib/staff-role");
    if (!canSkipToOwner(touched, Date.now(), hold)) throw new Error("Chưa đủ 2 giờ kể từ lần xử lý gần nhất.");
    const mine = rows[0].user_id === context.userId || rows[0].email.toLowerCase() === place.email.toLowerCase();
    const staff = place.role === "chu" || place.role === hold || (place.role != null && outranks(place.role, isStaffRole(hold) ? hold : "ho-tro"));
    if (!mine && !staff) throw new Error("Không đủ quyền để báo Chủ.");
    await sql`update room_appeals set hold_role = 'chu', touched_at = now() where id = ${data}`;
    const pack = `${rows[0].email}\n${rows[0].body}\nĐã trả lời: ${rows[0].reply || "chưa"}`;
    await writeNotice("chu", "Báo vượt cấp", pack, null, data);
    if (rows[0].user_id && rows[0].user_id !== context.userId) {
      await writeNotice("user", "Đã báo Chủ", "Yêu cầu của bạn đã được chuyển thẳng tới Chủ.", rows[0].user_id, data);
    }
    await writeAudit(context.userId, "bao-chu", String(data), pack);
    return { ok: true };
  });

export const listOwnAppeals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const place = await placeOf(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: number; status: string; hold_role: string; touched_at: unknown; reply: string }>`
      select id, status, hold_role, touched_at, reply from room_appeals
      where user_id = ${context.userId} or lower(email) = ${place.email.toLowerCase()}
      order by id desc limit 5
    `;
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      holdRole: row.hold_role || "ho-tro",
      touchedAt: stamp(row.touched_at),
      reply: row.reply,
    }));
  });

export type OrgCard = {
  id: string;
  email: string;
  name: string;
  nickname: string;
  role: StaffRole | "user";
  actions: number;
};

export const getOrg = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ cards: OrgCard[]; users: number }> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const { ownerEmails } = await import("@/lib/admin-allow.server");
    const sql = await getSql();
    const owners = new Set(ownerEmails().map((email) => email.toLowerCase()));
    const people = await sql<{ id: string; email: string; name: string; role: string | null; nickname: string | null }>`
      select u.id, u.email, u.name, s.role, s.nickname
      from "user" u
      left join room_staff s on s.user_id = u.id
    `;
    const counts = await sql<{ actor_id: string; n: number }>`
      select actor_id, count(*)::int as n from room_audit
      where created_at > date_trunc('month', now())
      group by actor_id
    `;
    const byActor = new Map(counts.map((row) => [row.actor_id, row.n]));
    const cards = people
      .filter((person) => isStaffRole(person.role) || owners.has(person.email.toLowerCase()))
      .map((person) => ({
        id: person.id,
        email: person.email,
        name: person.name,
        nickname: person.nickname || "",
        role: (owners.has(person.email.toLowerCase()) ? "chu" : isStaffRole(person.role) ? person.role : "user") as OrgCard["role"],
        actions: byActor.get(person.id) ?? 0,
      }));
    return { cards, users: Math.max(0, people.length - cards.length) };
  });

export const setNickname = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; nickname: string }) => ({
    userId: input.userId?.trim(),
    nickname: clip(input.nickname ?? "", 40),
  }))
  .handler(async ({ context, data }) => {
    if (!data.userId) throw new Error("Thiếu tài khoản.");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const existing = await sql<{ role: string }>`select role from room_staff where user_id = ${data.userId}`;
    if (existing.length) {
      await sql`update room_staff set nickname = ${data.nickname} where user_id = ${data.userId}`;
    } else {
      await sql`insert into room_staff (user_id, role, nickname) values (${data.userId}, 'chu', ${data.nickname})`;
    }
    await writeAudit(context.userId, "ten-goi-nho", data.userId, data.nickname || "Xóa tên gợi nhớ");
    return { ok: true };
  });

export type MoneyPoint = { bucket: string; revenue: number; cost: number };

export const getMoney = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((span: string) => (span === "week" || span === "month" || span === "year" ? span : "day"))
  .handler(async ({ context, data }): Promise<{ points: MoneyPoint[]; revenue: number; cost: number }> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const window = data === "year" ? "5 years" : data === "month" ? "12 months" : data === "week" ? "8 weeks" : "14 days";
    const revenue = await sql<{ bucket: string; amount: number }>`
      select to_char(date_trunc(${data}, created_at), 'YYYY-MM-DD') as bucket, coalesce(sum(amount), 0)::int as amount
      from room_ledger
      where kind = 'nap' and created_at > now() - ${window}::interval
      group by 1 order by 1
    `;
    const costs = await sql<{ bucket: string; amount: number }>`
      select to_char(date_trunc(${data}, spent_on), 'YYYY-MM-DD') as bucket, coalesce(sum(amount), 0)::int as amount
      from room_costs
      where spent_on > now() - ${window}::interval
      group by 1 order by 1
    `;
    const buckets = new Map<string, MoneyPoint>();
    for (const row of revenue) buckets.set(row.bucket, { bucket: row.bucket, revenue: row.amount, cost: 0 });
    for (const row of costs) {
      const point = buckets.get(row.bucket) ?? { bucket: row.bucket, revenue: 0, cost: 0 };
      point.cost = row.amount;
      buckets.set(row.bucket, point);
    }
    const points = [...buckets.values()];
    return {
      points,
      revenue: points.reduce((sum, point) => sum + point.revenue, 0),
      cost: points.reduce((sum, point) => sum + point.cost, 0),
    };
  });

export const addCost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day: string; label: string; amount: number }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day || "")) throw new Error("Ngày không đúng.");
    const label = clip(input.label ?? "", 80);
    if (label.length < 2) throw new Error("Hãy ghi khoản chi.");
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 1) throw new Error("Số tiền không đúng.");
    return { day: input.day, label, amount };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into room_costs (spent_on, label, amount) values (${data.day}, ${data.label}, ${data.amount})`;
    await writeAudit(context.userId, "chi-phi", null, `${data.day} ${data.label} ${data.amount}`);
    return { ok: true };
  });

