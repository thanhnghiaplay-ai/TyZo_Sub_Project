import type { Sql } from "./db.ts";

/**
 * Chạy `fn` trong một giao dịch: mọi lệnh cùng có hiệu lực hoặc cùng bị hủy.
 * Cả hai đường cơ sở dữ liệu của app (Postgres/Neon và PGLite) đều có `begin`. Đối tượng `Sql` không có `begin`
 * (chỉ có ở bộ thử tự dựng) thì báo lỗi, không lặng lẽ chạy rời từng lệnh.
 */
export function inTransaction<R>(sql: Sql, fn: (tx: Sql) => Promise<R>): Promise<R> {
  if (!sql.begin) throw new Error("Kết nối cơ sở dữ liệu không hỗ trợ giao dịch.");
  return sql.begin(fn);
}
