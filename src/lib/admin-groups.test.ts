import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_GROUPS } from "./admin-groups.ts";
import { ADMIN_TABS } from "./admin-tabs.ts";

test("mỗi tab Admin (trừ Tổng quan) nằm trong đúng một nhóm menu", () => {
  const seen = new Map<string, number>();
  for (const group of ADMIN_GROUPS) for (const id of group.tabs) seen.set(id, (seen.get(id) ?? 0) + 1);
  for (const tab of ADMIN_TABS) {
    if (tab.id === "tong-quan") assert.equal(seen.has(tab.id), false, "Tổng quan đứng riêng");
    else assert.equal(seen.get(tab.id), 1, `tab ${tab.id} phải có đúng một nhóm`);
  }
});

test("id nhóm không trùng nhau và nhóm nào cũng có tab", () => {
  const ids = ADMIN_GROUPS.map((group) => group.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const group of ADMIN_GROUPS) assert.ok(group.tabs.length > 0, group.id);
});
