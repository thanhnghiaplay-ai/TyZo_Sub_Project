import assert from "node:assert/strict";
import { test } from "node:test";
import { BOTTOM_LABEL, bottomTabIds } from "./admin-bottom-tabs.ts";
import { tabsFor } from "./admin-tabs.ts";

test("thanh dưới: Chủ có Tổng quan, Việc, Dịch vụ", () => {
  assert.deepEqual(bottomTabIds(tabsFor("chu").map((tab) => tab.id)), ["tong-quan", "viec", "cau-hinh"]);
});

test("thanh dưới: Quản lý và Hỗ trợ không có Dịch vụ nên thay bằng Tài khoản khách", () => {
  for (const role of ["quan-ly", "ho-tro"]) {
    assert.deepEqual(bottomTabIds(tabsFor(role).map((tab) => tab.id)), ["tong-quan", "viec", "tai-khoan"]);
  }
});

test("thanh dưới: mọi tab hiện đều có nhãn ngắn, không có quyền thì rỗng", () => {
  for (const role of ["chu", "quan-ly", "ho-tro"]) {
    for (const id of bottomTabIds(tabsFor(role).map((tab) => tab.id))) assert.ok(BOTTOM_LABEL[id], id);
  }
  assert.deepEqual(bottomTabIds([]), []);
});

test("thanh dưới: mọi tab hiện đều có biểu tượng", async () => {
  const { BOTTOM_SLOT } = await import("./admin-bottom-tabs.ts");
  for (const role of ["chu", "quan-ly", "ho-tro"]) {
    for (const id of bottomTabIds(tabsFor(role).map((tab) => tab.id))) assert.ok(BOTTOM_SLOT[id], id);
  }
});
