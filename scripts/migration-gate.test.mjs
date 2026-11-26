import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { destructiveGate, isDestructive, previewGate } from "./migration-gate.mjs";

test("R8-003: bản xem trước không chạy migration nếu chưa khai báo CSDL riêng", () => {
  assert.equal(previewGate({ VERCEL_ENV: "preview" }).run, false);
  assert.equal(previewGate({ VERCEL_ENV: "preview", TYZO_PREVIEW_DB: "rieng" }).run, true);
  assert.equal(previewGate({ VERCEL_ENV: "production" }).run, true);
  assert.equal(previewGate({}).run, true);
});

test("R8-003: migration có lệnh phá dữ liệu cần cho phép đúng tệp", () => {
  assert.equal(isDestructive("alter table x add column y int; -- drop table z"), false);
  for (const sql of ["drop table x;", "TRUNCATE t;", "delete from t where 1=1;", "alter table t drop column c;"]) assert.equal(isDestructive(sql), true, sql);
  assert.ok(destructiveGate("0099_x.sql", "drop table x;", {}));
  assert.equal(destructiveGate("0099_x.sql", "drop table x;", { TYZO_ALLOW_DESTRUCTIVE: "0099_x.sql" }), null);
  assert.equal(destructiveGate("0099_x.sql", "alter table x add column y int;", {}), null);
  assert.equal(destructiveGate("0027_x.sql", "delete from t;", {}, { fresh: true }), null, "CSDL mới tinh không chặn");
});

test("các migration 0038 trở đi (kiểm toán) không có lệnh phá dữ liệu", () => {
  const dir = new URL("../migrations/", import.meta.url);
  const bad = readdirSync(dir).filter((n) => n.endsWith(".sql") && n >= "0038").filter((n) => isDestructive(readFileSync(new URL(n, dir), "utf8")));
  assert.deepEqual(bad, []);
});
