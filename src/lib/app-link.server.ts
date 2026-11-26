import { createHash, randomBytes } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import {
  cleanDeviceName,
  codeFromBytes,
  DEVICE_IDLE_DAYS,
  DEVICE_TOKEN_PREFIX,
  LINK_CODE_TTL_SECONDS,
  MAX_DEVICES,
  normalizeCode,
  readDeviceToken,
} from "@/lib/app-link";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export type AppDeviceRow = { id: string; name: string; createdAt: string; lastUsedAt: string | null };

/** Tạo mã liên kết mới cho tài khoản. Mã cũ chưa dùng của tài khoản bị xóa. */
export async function createLinkCode(userId: string): Promise<{ code: string; expiresInSeconds: number }> {
  const sql = await getSql();
  const code = codeFromBytes(randomBytes(16));
  // Kiểm toán R3-005: một giao dịch, khóa theo tài khoản: hai lần bấm cùng lúc chỉ còn MỘT mã dùng được.
  const { inTransaction } = await import("@/lib/db-tx");
  await inTransaction(sql, async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${"app-link:" + userId}))`;
    await tx`delete from app_link_codes where user_id = ${userId} or expires_at < now()`;
    await tx`
      insert into app_link_codes (code_hash, user_id, expires_at)
      values (${hash(code)}, ${userId}, ${new Date(Date.now() + LINK_CODE_TTL_SECONDS * 1000).toISOString()}::timestamptz)
    `;
  });
  return { code, expiresInSeconds: LINK_CODE_TTL_SECONDS };
}

/** Đổi mã lấy khóa máy. Mã dùng một lần. null khi mã sai hoặc hết hạn. */
export async function redeemLinkCode(rawCode: unknown, rawName: unknown): Promise<{ token: string; userId: string } | null> {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const sql = await getSql();
  const token = `${DEVICE_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const id = randomBytes(8).toString("hex");
  // Kiểm toán AZ-007: dùng mã và ghi máy trong một giao dịch: ghi máy lỗi thì mã vẫn còn, khách thử lại được.
  const { inTransaction } = await import("@/lib/db-tx");
  const userId = await inTransaction(sql, async (tx) => {
    const rows = await tx<{ user_id: string }>`
      delete from app_link_codes where code_hash = ${hash(code)} and expires_at > now() returning user_id
    `;
    const owner = rows[0]?.user_id;
    if (!owner) return null;
    await tx`
      insert into app_devices (id, user_id, token_hash, name) values (${id}, ${owner}, ${hash(token)}, ${cleanDeviceName(rawName)})
    `;
    // Giữ tối đa MAX_DEVICES máy: gỡ máy cũ nhất.
    await tx`
      update app_devices set revoked_at = now()
      where user_id = ${owner} and revoked_at is null and id not in (
        select id from app_devices where user_id = ${owner} and revoked_at is null order by created_at desc limit ${MAX_DEVICES}
      )
    `;
    return owner;
  });
  if (!userId) return null;
  return { token, userId };
}

/** Tài khoản của khóa máy trong tiêu đề Authorization của yêu cầu hiện tại. null khi thiếu, sai hoặc đã gỡ. */
export async function deviceUserId(): Promise<string | null> {
  const token = readDeviceToken(getRequest()?.headers.get("authorization"));
  if (!token) return null;
  const sql = await getSql();
  const rows = await sql<{ id: string; user_id: string }>`
    update app_devices set last_used_at = now()
    where token_hash = ${hash(token)} and revoked_at is null
      and exists (select 1 from "user" u where u.id = app_devices.user_id)
      and coalesce(last_used_at, created_at) > ${new Date(Date.now() - DEVICE_IDLE_DAYS * 86_400_000).toISOString()}::timestamptz
    returning id, user_id
  `;
  if (rows[0]) {
    const { noteAppIp } = await import("@/lib/risk-log.server");
    await noteAppIp(rows[0].id, rows[0].user_id);
  }
  return rows[0]?.user_id ?? null;
}

export async function listDevices(userId: string): Promise<AppDeviceRow[]> {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; created_at: string | Date; last_used_at: string | Date | null }>`
    select id, name, created_at, last_used_at from app_devices
    where user_id = ${userId} and revoked_at is null order by created_at desc
  `;
  const iso = (value: string | Date) => (value instanceof Date ? value.toISOString() : new Date(value).toISOString());
  return rows.map((row) => ({ id: row.id, name: row.name, createdAt: iso(row.created_at), lastUsedAt: row.last_used_at ? iso(row.last_used_at) : null }));
}

export async function revokeDevice(userId: string, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    update app_devices set revoked_at = now() where user_id = ${userId} and id = ${id} and revoked_at is null returning id
  `;
  return rows.length > 0;
}

/** Địa chỉ mạng của người gọi khi máy chủ thấy được. */
export function callerIp(): string {
  const request = getRequest();
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  return forwarded || request?.headers.get("x-real-ip")?.trim() || "";
}

/** Gỡ mọi máy của tài khoản. Gọi khi đổi hoặc đặt lại mật khẩu (như thoát các phiên khác trên web). */
export async function revokeAllDevices(userId: string): Promise<void> {
  const sql = await getSql();
  await sql`update app_devices set revoked_at = now() where user_id = ${userId} and revoked_at is null`;
  await sql`delete from app_link_codes where user_id = ${userId}`;
}

/** Gỡ liên kết của chính máy đang gọi (khách bấm «Gỡ liên kết» trong ứng dụng). */
export async function revokeCurrentDevice(): Promise<boolean> {
  const token = readDeviceToken(getRequest()?.headers.get("authorization"));
  if (!token) return false;
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    update app_devices set revoked_at = now() where token_hash = ${hash(token)} and revoked_at is null returning id
  `;
  return rows.length > 0;
}
