import type { Sql } from "./db.ts";

/**
 * Quyền Chủ nằm trong database: bảng room_staff, role = 'chu', và email của tài khoản đó phải
 * đã xác minh. Không còn email ghi cứng trong mã và không còn file .grok/admin.json.
 *
 * Biến môi trường ADMIN_EMAIL chỉ dùng để khởi tạo lần đầu: khi CHƯA có Chủ nào đã xác minh, tài khoản
 * đã xác minh có đúng email đó được ghi vào room_staff. Chuyển quyền xong thì biến này không đòi lại quyền.
 */

export function bootstrapEmail() {
  const value = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

export async function ensureOwnerSeed(sql: Sql) {
  const email = bootstrapEmail();
  if (!email) return;
  const existing = await sql<{ n: number }>`
    select count(*)::int as n from room_staff s join "user" u on u.id = s.user_id
    where s.role = 'chu' and u."emailVerified" = true
  `;
  if (Number(existing[0]?.n ?? 0) > 0) return;
  await sql`
    insert into room_staff (user_id, role)
    select u.id, 'chu' from "user" u where lower(u.email) = ${email} and u."emailVerified" = true
    on conflict (user_id) do update set role = 'chu'
  `;
}

/** Tài khoản này là Chủ không: có dòng role='chu' và email đã xác minh. */
export async function isOwnerId(sql: Sql, userId: string) {
  await ensureOwnerSeed(sql);
  const rows = await sql<{ ok: boolean }>`
    select true as ok from room_staff s join "user" u on u.id = s.user_id
    where s.user_id = ${userId} and s.role = 'chu' and u."emailVerified" = true
  `;
  return rows.length > 0;
}

/** Email các Chủ đã xác minh. */
export async function ownerEmails(sql: Sql) {
  await ensureOwnerSeed(sql);
  const rows = await sql<{ email: string }>`
    select lower(u.email) as email from room_staff s join "user" u on u.id = s.user_id
    where s.role = 'chu' and u."emailVerified" = true
  `;
  return rows.map((row) => row.email);
}

/**
 * Chuyển quyền Chủ cho một tài khoản đã đăng ký và đã xác minh email.
 * Chủ cũ xuống Quản lý. Luôn còn đúng người nhận là Chủ, nên không bao giờ hết Chủ.
 */
export async function transferOwner(sql: Sql, fromUserId: string, email: string) {
  const target = await sql<{ id: string; verified: boolean }>`
    select id, "emailVerified" as verified from "user" where lower(email) = ${email.trim().toLowerCase()}
  `;
  if (!target.length) throw new Error("Chưa có tài khoản nào dùng email này.");
  if (!target[0].verified) throw new Error("Email này chưa xác minh, chưa thể làm Chủ.");
  await sql`
    insert into room_staff (user_id, role) values (${target[0].id}, 'chu')
    on conflict (user_id) do update set role = 'chu'
  `;
  if (target[0].id !== fromUserId) {
    await sql`update room_staff set role = 'quan-ly' where user_id = ${fromUserId} and role = 'chu'`;
  }
  return target[0].id;
}
