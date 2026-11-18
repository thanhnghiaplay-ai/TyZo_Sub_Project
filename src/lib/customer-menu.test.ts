import assert from "node:assert/strict";
import { test } from "node:test";
import { MENU_GROUP, MENU_ITEM, TOOL_NAME } from "./customer-menu.ts";

test("tên menu khách không trùng nhau và không còn tên cũ khó hiểu", () => {
  const all = [...Object.values(TOOL_NAME), ...Object.values(MENU_GROUP), ...Object.values(MENU_ITEM)];
  assert.equal(new Set(all).size, all.length, "mỗi tên chỉ dùng một lần");
  for (const old of ["Key Sub", "Nghe", "Nâng cao", "Tài khoản"]) assert.equal(all.includes(old as never), false, old);
});
