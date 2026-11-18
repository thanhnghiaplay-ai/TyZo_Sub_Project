import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIG_PAGES, DEFAULT_CONFIG_PAGE, isConfigPage } from "./admin-config-pages.ts";

test("trang con Cấu hình: id không trùng, có trang mặc định", () => {
  const ids = CONFIG_PAGES.map((page) => page.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(DEFAULT_CONFIG_PAGE));
  assert.equal(isConfigPage("goi-gia"), true);
  assert.equal(isConfigPage("khong-co"), false);
});
