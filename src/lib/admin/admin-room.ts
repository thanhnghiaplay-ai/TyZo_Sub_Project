import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isStaffRole, outranks, roleAtLeast, type RoomStanding, type StaffRole } from "@/lib/staff-role";

/**
 * Lõi Admin: kiểm quyền (requireRole), nhật ký thao tác (writeAudit), vị trí của tôi, thống kê bàn làm việc,
 * nhật ký Admin. Các nhóm việc khác: admin-users, admin-appeals, admin-money, admin-runs (tách 23/11/2026).
 */
export type MyPlace = {
  role: StaffRole | null;
  status: RoomStanding;
  reason: string;
  email: string;
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

export function stamp(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function asStanding(value: unknown): RoomStanding {
  if (value === "locked" || value === "banned") return value;
  return "open";
}

export function clip(value: string, max: number) {
  const text = value.trim();
  if (text.length > max) throw new Error("Nội dung quá dài.");
  return text;
}

export async function placeOf(userId: string): Promise<MyPlace> {
  const { getSql } = await import("@/lib/db");
  const { ensureOwnerSeed, ownerMustBeVerified } = await import("@/lib/admin/admin-allow.server");
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

export async function assertLower(actorId: string, targetUserId: string) {
  const actor = await placeOf(actorId);
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const target = await sql<{ email: string; role: string | null }>`
    select u.email, s.role from "user" u
    left join room_staff s on s.user_id = u.id
    where u.id = ${targetUserId}
  `;
  if (!target.length) throw new Error("Không thấy tài khoản.");
  if (target[0].role === "chu") throw new Error("Không xử lý tài khoản Admin.");
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
  .validator((device?: string) => (typeof device === "string" ? device.slice(0, 64) : ""))
  .handler(async ({ context, data }) => {
    await markSeen(context.userId);
    const { noteEvent } = await import("@/lib/risk-log.server");
    await noteEvent(context.userId, "hien-dien", { device: data, dedupeMinutes: 30 });
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
    const { transferOwner } = await import("@/lib/admin/admin-allow.server");
    const sql = await getSql();
    await transferOwner(sql, context.userId, data);
    await writeAudit(context.userId, "doi-email-chu", null, data);
    return { owners: [data] };
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


export const getAdminLog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, "ho-tro");
    const { ADMIN_LOG } = await import("@/lib/admin/admin-log.server");
    return ADMIN_LOG;
  });
