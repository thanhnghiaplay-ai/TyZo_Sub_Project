#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs during `npm run build` — on every Vercel deploy — applying pending files
 * in ../migrations to DATABASE_URL. Each file is applied in one transaction and
 * recorded in a `_migrations` table, so it runs once and is safe to re-run.
 *
 * The read is non-recursive, so the opt-in auth schema under migrations/auth/
 * is not applied to an app that never asked for sign-in.
 *
 * No DATABASE_URL (local builds) -> skip; the PGLite fallback applies
 * the same files at startup instead (see src/lib/db.ts).
 * Preview applies them too, because the preview site uses the same database.
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { applyMigrations } from "./migration-lock.mjs";
import { pendingMigrations } from "./migration-plan.mjs";

const vercelEnv = process.env.VERCEL_ENV || "";
const databaseUrl = process.env.DATABASE_URL?.trim() || "";
if (!databaseUrl) {
  if (vercelEnv === "production") {
    console.error("[migrate] DATABASE_URL trống trên production. Dừng deploy để khỏi lên bản không có schema.");
    process.exit(1);
  }
  console.log(
    "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  // An app with no schema of its own must not pay for a database connection.
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 15_000 });
  pool.on("error", (err) => console.error("[migrate] kết nối rảnh bị ngắt:", err.message));
  const client = await pool.connect();
  try {
    const files = await Promise.all(
      pendingMigrations(entries, []).map(async ({ name }) => ({
        name,
        text: await readFile(join(migrationsDir, name), "utf8"),
      })),
    );
    // Khóa mức giao dịch có chờ hạn, xem scripts/migration-lock.mjs.
    const count = await applyMigrations(client, files, {
      onApplied: (name) => console.log(`[migrate] applied ${name}`),
    });
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
