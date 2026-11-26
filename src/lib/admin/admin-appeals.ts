import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isStaffRole, nextHold, outranks } from "@/lib/staff-role";

import { clip, placeOf, requireRole, stamp, writeAudit } from "@/lib/admin/admin-room";

/** Yêu cầu xem lại (khiếu nại khóa/cấm) và thông báo cho khách. Tách từ admin-room.ts (23/11/2026); kiểm quyền và nhật ký dùng chung ở admin-room.ts. */

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

function holdWindowMin(hold: string, hasManager: boolean) {
  if (hold === "quan-ly") return 90;
  if (hold === "ho-tro") return hasManager ? 30 : 120;
  return 0;
}

function appealPace(hold: string, touchedAt: string, hasManager: boolean): { leftMin: number; tone: "green" | "yellow" | "red"; waitLabel: string } {
  const windowMin = holdWindowMin(hold, hasManager);
  if (!windowMin) return { leftMin: 0, tone: "red" as const, waitLabel: "Cần Admin xử lý" };
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
    if (hold === "chu") throw new Error("Việc đang ở Admin.");
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
    if (!mine && !staff) throw new Error("Không đủ quyền để báo Admin.");
    await sql`update room_appeals set hold_role = 'chu', touched_at = now() where id = ${data}`;
    const pack = `${rows[0].email}\n${rows[0].body}\nĐã trả lời: ${rows[0].reply || "chưa"}`;
    await writeNotice("chu", "Báo vượt cấp", pack, null, data);
    if (rows[0].user_id && rows[0].user_id !== context.userId) {
      await writeNotice("user", "Đã báo Admin", "Yêu cầu của bạn đã được chuyển thẳng tới Admin.", rows[0].user_id, data);
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
