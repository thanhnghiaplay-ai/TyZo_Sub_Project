import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { roomPlan } from "@/lib/room-plans";
import { isStaffRole, nextHold, outranks, roleAtLeast, type RoomStanding, type StaffRole } from "@/lib/staff-role";
import { BADGE_STYLES, badgeStyle } from "@/lib/badge-styles";
import { checkRunDesk, dayStartIso, parseModelList, parseRunDesk, type PriceOverride, type RunDesk } from "@/lib/run-desk";

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
  partner: boolean;
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
  leftMin: number;
  tone: "green" | "yellow" | "red";
  waitLabel: string;
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
  const { ensureOwnerSeed, ownerMustBeVerified } = await import("@/lib/admin-allow.server");
  const sql = await getSql();
  await ensureOwnerSeed(sql);
  const staff = await sql<{ role: string }>`select role from room_staff where user_id = ${userId}`;
  const account = await sql<{ status: string; status_reason: string }>`
    select status, status_reason from room_accounts where user_id = ${userId}
  `;
  const user = await sql<{ email: string; verified: boolean }>`select email, "emailVerified" as verified from "user" where id = ${userId}`;
  const email = user[0]?.email ?? "";
  const found = isStaffRole(staff[0]?.role) ? staff[0].role : null;
  const staffRole = found === "chu" && ownerMustBeVerified() && !user[0]?.verified ? null : found;
  return {
    role: staffRole,
    status: asStanding(account[0]?.status),
    reason: account[0]?.status_reason ?? "",
    email,
  };
}

export async function requireRole(userId: string, need: StaffRole) {
  const place = await placeOf(userId);
  if (!roleAtLeast(place.role, need)) throw new Error("Không đủ quyền.");
  return place;
}

export async function writeAudit(actorId: string, action: string, targetId: string | null, note: string) {
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
  const sql = await getSql();
  const target = await sql<{ email: string; role: string | null }>`
    select u.email, s.role from "user" u
    left join room_staff s on s.user_id = u.id
    where u.id = ${targetUserId}
  `;
  if (!target.length) throw new Error("Không thấy tài khoản.");
  if (target[0].role === "chu") throw new Error("Không xử lý tài khoản Chủ.");
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
  partners: number;
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
    let partners = 0;
    try {
      const counted = await sql<{ n: number }>`select count(*)::int as n from affiliates`;
      partners = counted[0]?.n ?? 0;
    } catch {
      partners = 0;
    }
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
      partners,
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
    const { getSql } = await import("@/lib/db");
    const { transferOwner } = await import("@/lib/admin-allow.server");
    const sql = await getSql();
    await transferOwner(sql, context.userId, data);
    await writeAudit(context.userId, "doi-email-chu", null, data);
    return { owners: [data] };
  });


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
    if (target[0].role === "chu") throw new Error("Không xử lý tài khoản Chủ.");
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
    const place = await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const person = await sql<{ email: string; role: string }>`
      select u.email, s.role from "user" u left join room_staff s on s.user_id = u.id where u.id = ${data}
    `;
    if (!person.length) throw new Error("Không thấy tài khoản.");
    if (person[0].role === "chu") throw new Error("Không xóa Chủ.");
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

function holdWindowMin(hold: string, hasManager: boolean) {
  if (hold === "quan-ly") return 90;
  if (hold === "ho-tro") return hasManager ? 30 : 120;
  return 0;
}

function appealPace(hold: string, touchedAt: string, hasManager: boolean): { leftMin: number; tone: "green" | "yellow" | "red"; waitLabel: string } {
  const windowMin = holdWindowMin(hold, hasManager);
  if (!windowMin) return { leftMin: 0, tone: "red" as const, waitLabel: "Cần Chủ xử lý" };
  const left = Math.max(0, windowMin - Math.floor((Date.now() - new Date(touchedAt).getTime()) / 60000));
  const tone = left === 0 ? "red" : left * 3 <= windowMin ? "yellow" : "green";
  const who = hold === "quan-ly" ? "Quản lý" : "Hỗ trợ";
  return { leftMin: left, tone, waitLabel: `Đang ở: ${who} · còn ${left} phút` };
}

function mayAnswer(role: string | null, hold: string) {
  if (role === "chu") return true;
  if (role === "quan-ly") return hold === "quan-ly";
  if (role === "ho-tro") return hold === "ho-tro";
  return false;
}

async function signedReply(sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>, userId: string, role: string, text: string) {
  const rows = await sql<{ nickname: string }>`select nickname from room_staff where user_id = ${userId}`;
  const nick = rows[0]?.nickname?.trim() ?? "";
  const label = role === "chu" ? "ADMIN" : role === "quan-ly" ? "QUẢN LÝ" : "HỖ TRỢ";
  const who = nick ? `${label} · ${nick}` : label;
  return `${text}\n— ${who}`.slice(0, 500);
}

async function sweepAppeals(sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>) {
  const managers = await sql<{ n: number }>`select count(*)::int as n from room_staff where role = 'quan-ly'`;
  const hasManager = Number(managers[0]?.n ?? 0) > 0;
  const hoMinutes = hasManager ? 30 : 120;
  const moved = await sql<{ id: number; email: string; body: string; user_id: string | null; hold_role: string }>`
    update room_appeals
    set hold_role = case when hold_role = 'ho-tro' and ${hasManager ? 1 : 0} = 1 then 'quan-ly' else 'chu' end,
        touched_at = now()
    where status = 'cho'
      and (
        (hold_role = 'ho-tro' and touched_at < now() - make_interval(mins => ${hoMinutes}::int))
        or (hold_role = 'quan-ly' and touched_at < now() - make_interval(mins => 90))
      )
    returning id, email, body, user_id, hold_role
  `;
  for (const row of moved) {
    await writeNotice(row.hold_role, "Việc chuyển lên", `${row.email}\n${row.body}`, null, row.id);
    await writeNotice("user", "Đã báo cấp trên", "Yêu cầu của bạn đã được chuyển lên cấp cao hơn. Khi có trả lời, bạn sẽ thấy ở chuông.", row.user_id, row.id);
  }
}

export const listAppeals = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AppealRow[]> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sweepAppeals(sql);
    const place = await placeOf(context.userId);
    const role = place.role ?? "";
    const managers = await sql<{ n: number }>`select count(*)::int as n from room_staff where role = 'quan-ly'`;
    const hasManager = Number(managers[0]?.n ?? 0) > 0;
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
        and (
          ${role} = 'chu'
          or (${role} = 'ho-tro' and coalesce(hold_role, 'ho-tro') = 'ho-tro')
          or (${role} = 'quan-ly' and hold_role = 'quan-ly')
        )
      order by case when coalesce(hold_role, 'ho-tro') = 'chu' then 0 else 1 end, id desc
      limit 40
    `;
    return rows.map((row) => {
      const touchedAt = stamp(row.touched_at || row.created_at);
      const pace = appealPace(row.hold_role || "ho-tro", touchedAt, hasManager);
      return {
        id: row.id,
        email: row.email,
        body: row.body,
        status: row.status,
        reply: row.reply,
        createdAt: stamp(row.created_at),
        holdRole: row.hold_role || "ho-tro",
        touchedAt,
        leftMin: pace.leftMin,
        tone: pace.tone,
        waitLabel: pace.waitLabel,
      };
    });
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
    const place = await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const current = await sql<{ hold_role: string }>`select hold_role from room_appeals where id = ${data.id} and status = 'cho'`;
    if (!current.length) throw new Error("Yêu cầu này đã được trả lời.");
    const hold = current[0].hold_role || "ho-tro";
    if (!mayAnswer(place.role, hold)) throw new Error("Việc này không nằm ở cấp của bạn.");
    const reply = await signedReply(sql, context.userId, place.role ?? "quan-ly", data.reply);
    const updated = await sql<{ id: number }>`
      update room_appeals set status = ${data.status}, reply = ${reply}, touched_at = now()
      where id = ${data.id} and status = 'cho' and coalesce(hold_role, 'ho-tro') = ${hold}
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
    await writeNotice("user", data.status === "mo" ? "Đã mở lại tài khoản" : "Đã từ chối", reply, userId, data.id);
    await writeAudit(context.userId, `yeu-cau-${data.status}`, String(data.id), reply);
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
      from room_audit
      where (
        ${place.role ?? ""} = 'chu'
        or (${place.role ?? ""} = 'quan-ly' and actor_role in ('ho-tro', 'user'))
        or (${place.role ?? ""} = 'ho-tro' and coalesce(actor_role, 'user') = 'user')
      )
      order by id desc
      limit 80
    `;
    return rows.map((row) => ({
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

export type NoticeRow = { id: number; title: string; body: string; createdAt: string; read: boolean; appealId: number | null; kind: string };

export const listMyNotices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { desk?: boolean } | undefined) => ({ desk: Boolean(input?.desk) }))
  .handler(async ({ context, data }): Promise<{ unread: number; items: NoticeRow[] }> => {
    const place = await placeOf(context.userId);
    if (data.desk && !place.role) return { unread: 0, items: [] };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    if (data.desk && place.role) await sweepAppeals(sql);
    const rank = place.role ?? "";
    const rows = data.desk
      ? await sql<{ id: number; title: string; body: string; created_at: unknown; read_at: unknown; appeal_id: number | null; kind: string }>`
          select id, title, body, created_at, read_at, appeal_id, kind from room_notices
          where (
            (${rank} = 'chu' and kind in ('ho-tro', 'quan-ly', 'chu', 'viec'))
            or (${rank} = 'quan-ly' and kind in ('quan-ly', 'viec'))
            or (${rank} = 'ho-tro' and kind = 'ho-tro')
          )
          order by id desc
          limit 20
        `
      : await sql<{ id: number; title: string; body: string; created_at: unknown; read_at: unknown; appeal_id: number | null; kind: string }>`
          select id, title, body, created_at, read_at, appeal_id, kind from room_notices
          where kind = 'user' and user_id = ${context.userId}
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
      kind: row.kind,
    }));
    const unread = items.filter((item) => !item.read && (rank !== "chu" || item.kind === "chu" || item.kind === "viec")).length;
    return { unread, items };
  });

export const markNoticeRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => {
    const value = Number(id);
    if (!Number.isInteger(value) || value <= 0) throw new Error("Thiếu thông báo.");
    return value;
  })
  .handler(async ({ context, data }) => {
    const place = await placeOf(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rank = place.role ?? "";
    await sql`
      update room_notices set read_at = now()
      where id = ${data} and read_at is null and (
        (kind = 'user' and user_id = ${context.userId})
        or (${rank} = 'chu' and kind in ('ho-tro', 'quan-ly', 'chu', 'viec'))
        or (${rank} = 'quan-ly' and kind in ('ho-tro', 'quan-ly', 'viec'))
        or (${rank} = 'ho-tro' and kind = 'ho-tro')
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
  const inserted = await sql<{ id: number }>`
    insert into room_appeals (user_id, email, body)
    values (${userId}, ${email}, ${body})
    returning id
  `;
  await writeNotice("ho-tro", "Yêu cầu mới", `${email}: ${body.slice(0, 140)}`, null, inserted[0]?.id ?? null);
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
    const { limitPublicAppeal } = await import("@/lib/appeal-rate.server");
    await limitPublicAppeal(data.email);
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
    const place = await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const current = await sql<{ hold_role: string }>`select hold_role from room_appeals where id = ${data.id} and status = 'cho'`;
    if (!current.length) throw new Error("Yêu cầu này đã được trả lời.");
    const hold = current[0].hold_role || "ho-tro";
    if (!mayAnswer(place.role, hold)) throw new Error("Việc này không nằm ở cấp của bạn.");
    const reply = await signedReply(sql, context.userId, place.role ?? "ho-tro", data.reply);
    const updated = await sql<{ user_id: string | null }>`
      update room_appeals set status = 'xong', reply = ${reply}, touched_at = now()
      where id = ${data.id} and status = 'cho' and coalesce(hold_role, 'ho-tro') = ${hold}
      returning user_id
    `;
    if (!updated.length) throw new Error("Yêu cầu này đã được trả lời.");
    await writeNotice("user", "Đã có trả lời", reply, updated[0].user_id, data.id);
    await writeAudit(context.userId, "tra-loi", String(data.id), reply);
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
      where user_id = ${context.userId}
        or (
          user_id is null
          and lower(email) = ${place.email.toLowerCase()}
          and exists (select 1 from "user" u where u.id = ${context.userId} and u."emailVerified" = true)
        )
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

export type OrgPartner = {
  id: string;
  email: string;
  name: string;
  code: string;
  status: string;
};

export const getOrg = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ cards: OrgCard[]; users: number; partners: OrgPartner[] }> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
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
      .filter((person) => isStaffRole(person.role))
      .map((person) => ({
        id: person.id,
        email: person.email,
        name: person.name,
        nickname: person.nickname || "",
        role: (isStaffRole(person.role) ? person.role : "user") as OrgCard["role"],
        actions: byActor.get(person.id) ?? 0,
      }));
    let partners: OrgPartner[] = [];
    try {
      partners = await sql<OrgPartner>`
        select u.id, u.email, u.name, a.code, a.status
        from affiliates a
        join "user" u on u.id = a.user_id
        order by a.created_at desc
        limit 80
      `;
    } catch {
      partners = [];
    }
    return { cards, users: Math.max(0, people.length - cards.length), partners };
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
    // Chỉ đặt tên cho nhân viên đã có. Không bao giờ tạo dòng quyền mới ở đây (trước đây tạo nhầm Chủ).
    const updated = await sql<{ user_id: string }>`
      update room_staff set nickname = ${data.nickname} where user_id = ${data.userId} returning user_id
    `;
    if (!updated.length) throw new Error("Chỉ đặt tên gợi nhớ cho nhân viên. Hãy cấp quyền trước.");
    await writeAudit(context.userId, "ten-goi-nho", data.userId, data.nickname || "Xóa tên gợi nhớ");
    return { ok: true };
  });

export type MoneyPoint = { bucket: string; revenue: number; cost: number };
export type CostRow = { id: number; day: string; label: string; amount: number };
export type MoneyBreakdown = {
  nap: number;
  goi: number;
  luot: number;
  hoan: number;
  nha: number;
  chi: number;
  von: number;
  lai: number;
  hoa: number;
  /** Phần giá vốn là ước tính cho phiếu cũ, nằm trong von. */
  vonUoc: number;
  /** Số phiếu cũ đã trừ tiền mà chưa có giá vốn, toàn thời gian. */
  chuaVon: number;
};

export const getMoney = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((span: string) => (span === "week" || span === "month" || span === "year" ? span : "day"))
  .handler(async ({ context, data }): Promise<{ points: MoneyPoint[]; revenue: number; cost: number; breakdown: MoneyBreakdown; costs: CostRow[] }> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const window = data === "year" ? "5 years" : data === "month" ? "12 months" : data === "week" ? "8 weeks" : "14 days";
    // Doanh thu = mọi tiền nạp đã vào ví, kể cả Chủ xác nhận tay khi cổng chưa tự cộng. Không tính tiền thử.
    const revenue = await sql<{ bucket: string; amount: number }>`
      select to_char(date_trunc(${data}::text, created_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') as bucket, coalesce(sum(amount), 0)::int as amount
      from room_ledger
      where kind = 'nap' and created_at > now() - ${window}::interval
      group by 1 order by 1
    `;
    const savedCosts = await sql<CostRow>`
      select id, to_char(spent_on, 'YYYY-MM-DD') as day, label, amount
      from room_costs
      where spent_on::timestamp > now() - ${window}::interval
      order by spent_on desc, id desc
      limit 80
    `;
    const costs = await sql<{ bucket: string; amount: number }>`
      select to_char(date_trunc(${data}::text, spent_on::timestamp), 'YYYY-MM-DD') as bucket, coalesce(sum(amount), 0)::int as amount
      from room_costs
      where spent_on::timestamp > now() - ${window}::interval
      group by 1 order by 1
    `;
    const kinds = await sql<{ kind: string; amount: number }>`
      select kind, coalesce(sum(amount), 0)::int as amount
      from room_ledger
      where created_at > now() - ${window}::interval
        and kind in ('nap', 'goi', 'hoan', 'nha')
      group by kind
    `;
    const runSum = await sql<{ charged: number; refunded: number; von: number; uoc: number }>`
      select coalesce(sum(charged), 0)::int as charged, coalesce(sum(refunded), 0)::int as refunded, coalesce(sum(base_cost), 0)::int as von,
        coalesce(sum(base_cost) filter (where base_est), 0)::int as uoc
      from run_tickets
      where created_at > now() - ${window}::interval
    `;
    const hoaRows = await sql<{ hoa: number }>`
      select coalesce(sum(amount), 0)::int as hoa from commission_events
      where status <> 'huy' and created_at > now() - ${window}::interval
    `;
    const byKind = Object.fromEntries(kinds.map((row) => [row.kind, row.amount]));
    const buckets = new Map<string, MoneyPoint>();
    for (const row of revenue) buckets.set(row.bucket, { bucket: row.bucket, revenue: row.amount, cost: 0 });
    for (const row of costs) {
      const point = buckets.get(row.bucket) ?? { bucket: row.bucket, revenue: 0, cost: 0 };
      point.cost = row.amount;
      buckets.set(row.bucket, point);
    }
    const points = [...buckets.values()];
    const costTotal = points.reduce((sum, point) => sum + point.cost, 0);
    const charged = Number(runSum[0]?.charged ?? 0);
    const refundedRun = Number(runSum[0]?.refunded ?? 0);
    const von = Number(runSum[0]?.von ?? 0);
    const vonUoc = Number(runSum[0]?.uoc ?? 0);
    const { countUncosted } = await import("@/lib/cost-estimate");
    const chuaVon = await countUncosted(sql);
    const hoa = Number(hoaRows[0]?.hoa ?? 0);
    const luot = Math.max(0, charged - refundedRun);
    const goi = Math.abs(Number(byKind.goi ?? 0));
    const lai = goi + luot - von;
    return {
      points,
      revenue: points.reduce((sum, point) => sum + point.revenue, 0),
      cost: costTotal,
      breakdown: {
        nap: Number(byKind.nap ?? 0),
        goi,
        luot,
        hoan: Number(byKind.hoan ?? 0),
        nha: Number(byKind.nha ?? 0),
        chi: costTotal,
        von,
        lai,
        hoa,
        vonUoc,
        chuaVon,
      },
      costs: savedCosts,
    };
  });

/** Chủ bấm: điền giá vốn ước tính cho phiếu cũ. Dùng phần chênh Groq hiện tại, nên chỉ là ước tính. */
export const estimateOldCost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ count: number; markup: number }> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const markup = parseRunDesk(saved[0]?.value).markup;
    const { estimateOldCostWith } = await import("@/lib/cost-estimate");
    const count = await estimateOldCostWith(sql, markup);
    await writeAudit(context.userId, "uoc-gia-von", null, `${count} phiếu, chênh ${markup}%`);
    return { count, markup };
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

export const updateCost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; day: string; label: string; amount: number }) => {
    const id = Math.round(Number(input.id));
    if (!Number.isFinite(id) || id < 1) throw new Error("Thiếu khoản chi.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day || "")) throw new Error("Ngày không đúng.");
    const label = clip(input.label ?? "", 80);
    if (label.length < 2) throw new Error("Hãy ghi khoản chi.");
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 1) throw new Error("Số tiền không đúng.");
    return { id, day: input.day, label, amount };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const updated = await sql<{ id: number }>`
      update room_costs set spent_on = ${data.day}, label = ${data.label}, amount = ${data.amount}
      where id = ${data.id}
      returning id
    `;
    if (!updated.length) throw new Error("Không thấy khoản chi.");
    await writeAudit(context.userId, "sua-chi-phi", null, `${data.id} ${data.day} ${data.label} ${data.amount}`);
    return { ok: true };
  });

export const deleteCost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => {
    const value = Math.round(Number(id));
    if (!Number.isFinite(value) || value < 1) throw new Error("Thiếu khoản chi.");
    return value;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const removed = await sql<{ label: string }>`delete from room_costs where id = ${data} returning label`;
    if (!removed.length) throw new Error("Không thấy khoản chi.");
    await writeAudit(context.userId, "xoa-chi-phi", null, `${data} ${removed[0].label}`);
    return { ok: true };
  });

export const resetTestMoney = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: string) => {
    const value = code?.trim().toUpperCase() ?? "";
    if (!/^[A-Z2-9]{6}$/.test(value)) throw new Error("Hãy nhập đúng mã xác nhận 6 ký tự.");
    return value;
  })
  .handler(async ({ context }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`update room_accounts set balance = 0`;
    await sql`delete from room_ledger`;
    await sql`delete from room_costs`;
    try {
      await sql`delete from pay_orders`;
    } catch {
      /* bảng có thể chưa có trên bản cũ */
    }
    try {
      await sql`delete from pay_seen`;
    } catch {
      /* bỏ qua nếu chưa có */
    }
    try {
      await sql`update run_tickets set held = 0, charged = 0, refunded = 0, status = 'da-huy' where held > 0 or charged > 0 or refunded > 0`;
    } catch {
      /* bỏ qua nếu chưa có phiếu */
    }
    await writeAudit(context.userId, "reset-tien-test", null, "Xóa số dư, sổ, đơn nạp, chi phí và phiếu tiền test");
    return { ok: true as const };
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
    await sql`delete from room_ledger where user_id = ${data}`;
    try {
      await sql`delete from pay_orders where user_id = ${data}`;
    } catch {
      /* bỏ qua */
    }
    try {
      await sql`update run_tickets set held = 0, charged = 0, refunded = 0, status = 'da-huy' where user_id = ${data}`;
    } catch {
      /* bỏ qua */
    }
    await writeAudit(context.userId, "reset-so-du", data, "Đưa số dư và sổ về 0 (test)");
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
  .handler(async ({ context, data }) => {
    const place = await requireRole(context.userId, "chu");
    await assertLower(context.userId, data.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const before = await sql<{ balance: number | null }>`select balance from room_accounts where user_id = ${data.userId}`;
    const prev = before[0]?.balance ?? 0;
    const delta = data.balance - prev;
    await sql`insert into room_accounts (user_id, balance) values (${data.userId}, ${data.balance}) on conflict (user_id) do update set balance = ${data.balance}`;
    await sql`
      insert into room_ledger (user_id, kind, amount, note)
      values (${data.userId}, 'dieu-chinh', ${delta}, ${"Admin " + place.email + " đặt số dư " + data.balance + " đ"})
    `;
    await writeAudit(context.userId, "dat-so-du", data.userId, `Đặt số dư ${data.balance} (trước ${prev})`);
    return { ok: true as const };
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

export type RunTicket = {
  id: string;
  userId: string;
  email: string;
  fileName: string;
  seconds: number;
  rate: number;
  held: number;
  charged: number;
  released: number;
  refunded: number;
  status: string;
  createdAt: string;
};

export type RunDeskView = {
  desk: RunDesk;
  models: string[] | null;
  keyTail: string;
  holding: number;
  charged: number;
  errors: number;
  recent: RunTicket[];
};

function ticketOf(row: {
  id: string;
  user_id: string;
  email: string | null;
  file_name: string;
  seconds: number;
  rate: number;
  held: number;
  charged: number;
  released: number;
  refunded: number;
  status: string;
  created_at: unknown;
}): RunTicket {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email ?? "",
    fileName: row.file_name,
    seconds: row.seconds,
    rate: row.rate,
    held: row.held,
    charged: row.charged,
    released: row.released,
    refunded: row.refunded,
    status: row.status,
    createdAt: stamp(row.created_at),
  };
}

export const getRunDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RunDeskView> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const models = await sql<{ value: string }>`select value from room_settings where key = 'run_models'`;
    const storedKey = await sql<{ value: string }>`select value from room_settings where key = 'run_key'`;
    const place = await placeOf(context.userId);
    const start = dayStartIso();
    const totals = await sql<{ holding: number; charged: number; errors: number }>`
      select
        coalesce(sum(case when status = 'dang-giu' then held else 0 end), 0)::int as holding,
        coalesce(sum(charged), 0)::int as charged,
        coalesce(sum(case when status = 'loi' then 1 else 0 end), 0)::int as errors
      from run_tickets
      where created_at >= ${start}
    `;
    const recent = await sql<{
      id: string;
      user_id: string;
      email: string | null;
      file_name: string;
      seconds: number;
      rate: number;
      held: number;
      charged: number;
      released: number;
      refunded: number;
      status: string;
      created_at: unknown;
    }>`
      select t.id, t.user_id, u.email, t.file_name, t.seconds, t.rate, t.held, t.charged, t.released, t.refunded, t.status, t.created_at
      from run_tickets t
      left join "user" u on u.id = t.user_id
      order by t.created_at desc
      limit 20
    `;
    const owner = place.role === "chu";
    const row = totals[0];
    const desk = parseRunDesk(saved[0]?.value);
    return {
      desk: owner ? desk : { maintenance: desk.maintenance, note: desk.note, cap: 0, markup: 0, custom: {} },
      models: owner ? parseModelList(models[0]?.value) : [],
      keyTail: owner && storedKey[0]?.value ? storedKey[0].value.slice(-4) : "",
      holding: owner ? Number(row?.holding ?? 0) : 0,
      charged: owner ? Number(row?.charged ?? 0) : 0,
      errors: Number(row?.errors ?? 0),
      recent: recent.map(ticketOf),
    };
  });

export const saveRunDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: RunDesk) => checkRunDesk(input))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values ('run_desk', ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "gia-luot", null, value);
    return data;
  });

export const listUserRuns = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => {
    const id = userId?.trim();
    if (!id) throw new Error("Thiếu tài khoản.");
    return id;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      email: string | null;
      file_name: string;
      seconds: number;
      rate: number;
      held: number;
      charged: number;
      released: number;
      refunded: number;
      status: string;
      created_at: unknown;
    }>`
      select t.id, t.user_id, u.email, t.file_name, t.seconds, t.rate, t.held, t.charged, t.released, t.refunded, t.status, t.created_at
      from run_tickets t
      left join "user" u on u.id = t.user_id
      where t.user_id = ${data}
      order by t.created_at desc
      limit 20
    `;
    return rows.map(ticketOf);
  });

export const releaseRunHold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const ticket = id?.trim();
    if (!ticket) throw new Error("Thiếu phiếu.");
    return ticket;
  })
  .handler(async ({ context, data }) => {
    const place = await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`select user_id from run_tickets where id = ${data}`;
    const ticket = rows[0];
    if (!ticket) throw new Error("Không có phiếu này.");
    await assertLower(context.userId, ticket.user_id);
    const { releaseHoldWith } = await import("@/lib/pay-flow");
    await releaseHoldWith(sql, data, `Nhả khoản giữ phiếu ${data} bởi ${place.email}`);
    await writeAudit(context.userId, "nha-giu", ticket.user_id, data);
    return { ok: true };
  });

export const refundRun = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; amount: number; reason: string }) => {
    const id = input.id?.trim();
    if (!id) throw new Error("Thiếu phiếu.");
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 1) throw new Error("Số hoàn không đúng.");
    const reason = clip(input.reason ?? "", 180);
    if (reason.length < 8) throw new Error("Hãy ghi lý do, ít nhất 8 ký tự.");
    return { id, amount, reason };
  })
  .handler(async ({ context, data }) => {
    const place = await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ user_id: string; charged: number; refunded: number }>`
      select user_id, charged, refunded from run_tickets where id = ${data.id}
    `;
    const ticket = rows[0];
    if (!ticket) throw new Error("Không có phiếu này.");
    await assertLower(context.userId, ticket.user_id);
    const { refundRunWith } = await import("@/lib/pay-flow");
    await refundRunWith(sql, data.id, data.amount, `Admin ${place.email}: ${data.reason}`);
    await writeAudit(context.userId, "hoan-vi", ticket.user_id, `${data.id} ${data.amount} ${data.reason}`);
    return { ok: true };
  });

export type RunDoorView = { open: boolean; note: string; markup: number; custom: Record<string, PriceOverride>; offered: string[] | null };

export const getRunDoor = createServerFn({ method: "GET" }).handler(async (): Promise<RunDoorView> => {
  const closed = { open: true, note: "", markup: 0, custom: {} as Record<string, PriceOverride>, offered: null };
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const models = await sql<{ value: string }>`select value from room_settings where key = 'run_models'`;
    const desk = parseRunDesk(saved[0]?.value);
    return {
      open: !desk.maintenance,
      note: desk.maintenance ? desk.note : "",
      markup: desk.markup,
      custom: desk.custom,
      offered: parseModelList(models[0]?.value),
    };
  } catch {
    return closed;
  }
});

export const saveRunModels = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((ids: string[]) => {
    if (!Array.isArray(ids)) throw new Error("Danh sách model không đúng.");
    const next = ids.filter((id) => typeof id === "string" && /^[a-z0-9./_-]{2,80}$/i.test(id)).slice(0, 400);
    return next;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values ('run_models', ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "key-model", null, `${data.length} model`);
    return data;
  });

export const saveRunKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: string) => {
    const key = input?.trim() ?? "";
    if (key.length < 20 || key.length > 200 || /\s/.test(key)) throw new Error("Key không đúng.");
    return key;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { listModelIds } = await import("@/lib/sub/groq");
    const ids = await listModelIds(data);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const models = JSON.stringify(ids);
    await sql`
      insert into room_settings (key, value) values ('run_key', ${data})
      on conflict (key) do update set value = ${data}
    `;
    await sql`
      insert into room_settings (key, value) values ('run_models', ${models})
      on conflict (key) do update set value = ${models}
    `;
    await writeAudit(context.userId, "key-phong", null, `${ids.length} model`);
    return ids;
  });

export const getAdminLog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, "ho-tro");
    const { ADMIN_LOG } = await import("@/lib/admin-log.server");
    return ADMIN_LOG;
  });




