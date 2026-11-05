import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { roomPlan } from "@/lib/room-plans";
import { isStaffRole, roleAtLeast, type RoomStanding, type StaffRole } from "@/lib/staff-role";

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
};

export type AuditRow = {
  id: number;
  action: string;
  targetId: string | null;
  note: string;
  createdAt: string;
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
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`
    insert into room_audit (actor_id, action, target_id, note)
    values (${actorId}, ${action}, ${targetId}, ${note.slice(0, 500)})
  `;
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
        (select count(*)::int from room_appeals where status = 'cho') as waiting
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
    await requireRole(context.userId, "ho-tro");
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
    if (targetRole && actor.role && !roleAtLeast(actor.role, targetRole)) throw new Error("Không xử lý người có quyền cao hơn.");
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
    const rows = await sql<{ id: number; email: string; body: string; status: string; reply: string; created_at: unknown }>`
      select id, email, body, status, reply, created_at from room_appeals order by id desc limit 30
    `;
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      body: row.body,
      status: row.status,
      reply: row.reply,
      createdAt: stamp(row.created_at),
    }));
  });

export const replyAppeal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; status: string; reply: string }) => {
    if (input.status !== "mo" && input.status !== "tu-choi") throw new Error("Trạng thái không đúng.");
    const reply = clip(input.reply ?? "", 500);
    if (reply.length < 2) throw new Error("Hãy ghi câu trả lời.");
    return { id: Number(input.id), status: input.status, reply };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const updated = await sql<{ id: number }>`
      update room_appeals set status = ${data.status}, reply = ${data.reply}
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
    await writeNotice("user", data.status === "mo" ? "Đã mở lại tài khoản" : "Đã trả lời yêu cầu", data.reply, userId);
    await writeAudit(context.userId, `yeu-cau-${data.status}`, String(data.id), data.reply);
    return { ok: true };
  });

export const listAudit = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AuditRow[]> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: number; action: string; target_id: string | null; note: string; created_at: unknown }>`
      select id, action, target_id, note, created_at from room_audit order by id desc limit 30
    `;
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      targetId: row.target_id,
      note: row.note,
      createdAt: stamp(row.created_at),
    }));
  });

export type NoticeRow = { id: number; title: string; body: string; createdAt: string; read: boolean };

export const listMyNotices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ unread: number; items: NoticeRow[] }> => {
    const place = await placeOf(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const staff = Boolean(place.role);
    const rows = await sql<{ id: number; title: string; body: string; created_at: unknown; read_at: unknown }>`
      select id, title, body, created_at, read_at from room_notices
      where (kind = 'user' and user_id = ${context.userId})
         or (${staff} and kind = 'staff')
      order by id desc
      limit 20
    `;
    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: stamp(row.created_at),
      read: Boolean(row.read_at),
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
    await sql`
      update room_notices set read_at = now()
      where read_at is null and ((kind = 'user' and user_id = ${context.userId}) or (${staff} and kind = 'staff'))
    `;
    return { ok: true as const };
  });

async function writeNotice(kind: "user" | "staff", title: string, body: string, userId: string | null) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into room_notices (user_id, kind, title, body)
      values (${userId}, ${kind}, ${title.slice(0, 120)}, ${body.slice(0, 500)})
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
  await writeNotice("staff", "Yêu cầu mới", `${email}: ${body.slice(0, 140)}`, null);
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
