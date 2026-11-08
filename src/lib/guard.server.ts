import { getSql } from "./db";
import { requireOpenAccountWith, takeRateWith } from "./guard";

export { AccountBlockedError, RateLimitError } from "./guard";

/** Dùng ở mọi hàm máy chủ tạo giá trị (tiền, lượt, tiếng đọc). Trả 403 khi status khác 'open'. */
export async function requireOpenAccount(userId: string) {
  await requireOpenAccountWith(await getSql(), userId);
}

/** Giới hạn tần suất theo khóa, ví dụ `edge:${userId}`. Ném RateLimitError (429) khi vượt. */
export async function takeRate(bucket: string, limit: number, windowSeconds: number) {
  await takeRateWith(await getSql(), bucket, limit, windowSeconds);
}
