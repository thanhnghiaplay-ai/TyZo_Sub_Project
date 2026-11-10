// @ts-check
/**
 * Chạy migration dưới khóa chống hai nơi cùng migrate, dùng chung cho
 * `scripts/migrate.mjs` (lúc build) và `src/lib/db.ts` (lúc máy chủ khởi động).
 *
 * Khóa là `pg_try_advisory_xact_lock` đặt TRONG giao dịch, không phải `pg_advisory_lock`
 * mức phiên. Lý do:
 * - Mức phiên không an toàn qua pooler (PgBouncer, Neon `-pooler`): lệnh khóa và lệnh mở
 *   khóa có thể chạy trên hai kết nối thật khác nhau. Khóa kẹt ở kết nối đầu, mọi bản
 *   máy chủ khởi động sau đó chờ vô hạn ở `pg_advisory_lock`, tức là mọi hàm máy chủ
 *   gọi `getSql()` đều không bao giờ trả lời.
 * - Khóa mức giao dịch tự nhả khi COMMIT hoặc ROLLBACK, kể cả khi kết nối chết.
 * - `try` rồi chờ ngắn thay cho chờ vô hạn: quá hạn thì ném lỗi, hàm gọi báo lỗi được.
 *
 * Không có migration nào chờ thì không đụng tới khóa.
 */
import { pendingMigrations } from "./migration-plan.mjs";

export const MIGRATION_LOCK_KEY = 84201911;

/** @typedef {{ query: (text: string, params?: any[]) => Promise<{ rows: any[] }> }} Queryable */

const CREATE_TABLE =
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())";

const TX_WORDS = /^\s*(begin|commit|rollback)\b/im;

/**
 * @param {Queryable} client
 * @returns {Promise<string[]>}
 */
async function readApplied(client) {
  try {
    const result = await client.query("SELECT name FROM _migrations");
    return result.rows.map((row) => row.name);
  } catch (error) {
    // 42P01: bảng _migrations chưa có, tức là database trống.
    if (/** @type {{ code?: string }} */ (error)?.code === "42P01") return [];
    throw error;
  }
}

/**
 * @param {Queryable} client
 * @param {Array<{ name: string, text: string }>} files  mọi file migration, không cần lọc
 * @param {{
 *   lockKey?: number,
 *   waitMs?: number,
 *   pollMs?: number,
 *   now?: () => number,
 *   sleep?: (ms: number) => Promise<void>,
 *   onApplied?: (name: string) => void,
 * }} [options]
 * @returns {Promise<number>} số file đã áp dụng trong lần gọi này
 */
export async function applyMigrations(client, files, options = {}) {
  const {
    lockKey = MIGRATION_LOCK_KEY,
    waitMs = 20_000,
    pollMs = 250,
    now = Date.now,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    onApplied,
  } = options;

  const byName = new Map(files.map((file) => [file.name, file]));
  const pending = pendingMigrations(byName.keys(), await readApplied(client));
  if (!pending.length) return 0;

  for (const { name } of pending) {
    if (TX_WORDS.test(byName.get(name)?.text ?? "")) {
      throw new Error(`${name} chứa BEGIN, COMMIT hoặc ROLLBACK. Để bộ migrate bọc giao dịch.`);
    }
  }

  const deadline = now() + waitMs;
  let count = 0;
  for (const { name } of pending) {
    const text = byName.get(name)?.text ?? "";
    for (;;) {
      await client.query("BEGIN");
      let held = false;
      try {
        const lock = await client.query("SELECT pg_try_advisory_xact_lock($1) AS ok", [lockKey]);
        held = lock.rows[0]?.ok === true;
        if (held) {
          await client.query(CREATE_TABLE);
          // Có thể bản khác đã áp dụng file này trong lúc ta chờ khóa.
          const done = await client.query("SELECT 1 FROM _migrations WHERE name = $1", [name]);
          if (!done.rows.length) {
            // Giao thức truy vấn đơn của pg chạy được cả file nhiều câu lệnh.
            await client.query(text);
            await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
            count += 1;
            onApplied?.(name);
          }
          await client.query("COMMIT");
        } else {
          await client.query("ROLLBACK");
        }
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // Kết nối có thể đã chết. Giữ lỗi gốc.
        }
        throw error;
      }
      if (held) break;
      if (now() >= deadline) {
        throw new Error(
          `Chờ quá ${Math.round(waitMs / 1000)} giây mà chưa lấy được khóa migration (${name}). Có bản khác đang migrate, thử lại sau.`,
        );
      }
      await sleep(pollMs);
    }
  }
  return count;
}
