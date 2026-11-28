/**
 * CHỈ DÙNG TRONG TEST. Dựng đối tượng `Sql` (có giao dịch) trên PGLite, hoặc trên Postgres thật khi đặt
 * `TYZO_TEST_PG_URL` (thử tranh chấp nhiều kết nối). Không bao giờ trỏ biến này vào cơ sở dữ liệu thật:
 * mỗi lần chạy tạo một schema riêng tên `thu_…` rồi bỏ đi.
 */
import { readdirSync, readFileSync } from "node:fs";
import { createPgPool, withPgTransaction } from "./pg-pool.server.ts";
import type { Sql } from "./db.ts";

const MIGRATIONS = new URL("../../migrations/", import.meta.url);

function wrap(run: (text: string, params: unknown[]) => Promise<unknown[]>): Sql {
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run(text, values);
  }) as unknown as Sql;
  sql.query = ((text: string, params: unknown[] = []) => run(text, params)) as Sql["query"];
  return sql;
}

function migrationFiles() {
  return readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql")).sort();
}

export async function pgliteSql(): Promise<Sql> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  for (const file of migrationFiles()) await db.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"));
  const sql = wrap(async (text, params) => (await db.query(text, params)).rows);
  // Raw, unparameterized test SQL can contain a migration or a fixture script.
  // PGlite's prepared query protocol accepts only one statement.
  sql.query = async <T>(text: string, params: unknown[] = []) => {
    if (params.length) return (await db.query<T>(text, params)).rows;
    return (await db.exec(text)).at(-1)?.rows as T[] ?? [];
  };
  sql.begin = (fn, signal) =>
    db.transaction(async (t) => {
      signal?.throwIfAborted();
      const tx = wrap(async (text, params) => (await t.query(text, params)).rows);
      tx.begin = (inner) => inner(tx);
      const result = await fn(tx);
      signal?.throwIfAborted();
      return result;
    });
  return sql;
}

/** Postgres thật cho test tranh chấp. Mỗi lần gọi dựng một schema riêng, trống. Trả null khi không đặt biến. */
export async function realPgSql(): Promise<{ sql: Sql; end: () => Promise<void> } | null> {
  const url = process.env.TYZO_TEST_PG_URL;
  if (!url) return null;
  const { default: pg } = await import("pg");
  pg.types.setTypeParser(20, Number);
  const schema = `thu_${process.pid}_${Math.floor(Math.random() * 1e9)}`;
  const pool = createPgPool({ connectionString: url, max: 12, options: `-c search_path=${schema}` });
  await pool.query(`create schema ${schema}`);
  for (const file of migrationFiles()) await pool.query(readFileSync(new URL(file, MIGRATIONS), "utf8"));
  const sql = wrap(async (text, params) => (await pool.query(text, params)).rows);
  sql.begin = (fn, signal) =>
    withPgTransaction(pool, async (conn) => {
      const tx = wrap(async (text, params) => (await conn.query(text, params)).rows);
      tx.begin = (inner) => inner(tx);
      return fn(tx);
    }, signal);
  return {
    sql,
    end: async () => {
      await pool.query(`drop schema ${schema} cascade`);
      await pool.end();
    },
  };
}
