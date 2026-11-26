// Mọi tệp migrations/*.sql phải qua được luật của scripts/migrate.mjs (không dòng nào mở đầu bằng begin/commit/rollback).
// Gặp 27/11/2026: khối «do $$ begin … end $$» viết nhiều dòng làm hỏng lần dựng trên VPS và Vercel.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

test("migration không có dòng mở đầu bằng BEGIN/COMMIT/ROLLBACK", () => {
  const dir = new URL("../migrations/", import.meta.url);
  const bad = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .filter((name) => /^\s*(begin|commit|rollback)\b/im.test(readFileSync(new URL(name, dir), "utf8")));
  assert.deepEqual(bad, []);
});
