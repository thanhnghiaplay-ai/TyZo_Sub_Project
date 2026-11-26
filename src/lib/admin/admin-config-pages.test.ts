import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CONFIG_PAGES, DEFAULT_CONFIG_PAGE, isConfigPage } from "./admin-config-pages.ts";

test("trang con Cấu hình: id không trùng, có trang mặc định", () => {
  const ids = CONFIG_PAGES.map((page) => page.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(DEFAULT_CONFIG_PAGE));
  assert.equal(isConfigPage("gia"), true);
  assert.equal(isConfigPage("goi"), true);
  assert.equal(isConfigPage("goi-gia"), false);
  assert.equal(isConfigPage("khong-co"), false);
});

test("trang Giá và trang Gói: mỗi khối nằm đúng trang", () => {
  const src = readFileSync(new URL("../../components/admin-config.tsx", import.meta.url), "utf8");
  const page = (id: string) => {
    const start = src.indexOf(`<Page id="${id}"`);
    return src.slice(start, src.indexOf("</Page>", start));
  };
  const gia = page("gia");
  const goi = page("goi");
  assert.match(gia, /RunDeskBoard/);
  assert.match(gia, /RoomPlansView/);
  assert.match(goi, /GiayPackBoard/);
  assert.match(goi, /ServicePackBoard/);
  assert.doesNotMatch(gia, /GiayPackBoard|ServicePackBoard/);
  assert.doesNotMatch(goi, /RunDeskBoard|RoomPlansView/);
});
