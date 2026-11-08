import type { Sql } from "./db.ts";
import { standingBlock, type RoomStanding } from "./staff-role.ts";

/** Lỗi 403 khi tài khoản đang bị khóa hoặc cấm. Kiểm tra ở máy chủ, không tin trình duyệt. */
export class AccountBlockedError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "AccountBlockedError";
  }
}

/** Lỗi 429 khi gọi quá nhanh. */
export class RateLimitError extends Error {
  readonly status = 429;
  readonly retryAfter: number;
  constructor(retryAfter: number) {
    super(`Bạn thao tác quá nhanh. Thử lại sau ${retryAfter} giây.`);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** Ném AccountBlockedError khi status khác 'open'. Tài khoản chưa có dòng được coi là mở. */
export async function requireOpenAccountWith(sql: Sql, userId: string) {
  const rows = await sql<{ status: string; status_reason: string }>`
    select status, status_reason from room_accounts where user_id = ${userId}
  `;
  if (!rows.length) return;
  const status = rows[0].status;
  if (status === "open") return;
  const message = standingBlock(status as RoomStanding, rows[0].status_reason ?? "") || "Tài khoản không được dùng chức năng này.";
  throw new AccountBlockedError(message);
}

/**
 * Giới hạn tần suất theo cửa sổ cố định, đếm nguyên tử bằng một câu INSERT ... ON CONFLICT
 * nên chạy đúng cả khi nhiều yêu cầu đến cùng lúc hoặc nhiều máy chủ.
 */
export async function takeRateWith(
  sql: Sql,
  bucket: string,
  limit: number,
  windowSeconds: number,
  nowMs: number = Date.now(),
) {
  const windowMs = windowSeconds * 1000;
  const start = Math.floor(nowMs / windowMs) * windowMs;
  const rows = await sql<{ hits: number }>`
    insert into rate_hits (bucket, window_start, hits) values (${bucket}, ${start}, 1)
    on conflict (bucket, window_start) do update set hits = rate_hits.hits + 1
    returning hits
  `;
  if (rows[0].hits > limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((start + windowMs - nowMs) / 1000)));
  }
  // Dọn dòng cũ thỉnh thoảng, không cần chặt chẽ.
  if (Math.random() < 0.02) {
    await sql`delete from rate_hits where window_start < ${nowMs - 24 * 3600 * 1000}`;
  }
}
