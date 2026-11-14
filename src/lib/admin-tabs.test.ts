import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { foldText, looksLikeEmail, matchTabs, tabsFor } from "./admin-tabs.ts";

describe("tab Admin theo quyền", () => {
  it("Chủ thấy đủ 11 tab", () => {
    assert.equal(tabsFor("chu").length, 11);
  });
  it("Quản lý và Hỗ trợ không thấy tab chỉ của Chủ", () => {
    for (const role of ["quan-ly", "ho-tro"]) {
      const ids = tabsFor(role).map((tab) => tab.id);
      assert.deepEqual(ids, ["tong-quan", "viec", "so-do", "thao-tac", "nhat-ky"]);
    }
  });
  it("không có quyền thì không có tab", () => {
    assert.deepEqual(tabsFor(null), []);
  });
});

describe("tìm tab bằng Ctrl+K", () => {
  it("bỏ dấu vẫn khớp", () => {
    assert.equal(foldText("Chất lượng Đơn"), "chat luong don");
    assert.deepEqual(matchTabs(tabsFor("chu"), "chat luong").map((tab) => tab.id), ["chat-luong"]);
    assert.deepEqual(matchTabs(tabsFor("chu"), "doanh thu").map((tab) => tab.id), ["tien"]);
  });
  it("tìm theo từ khóa phụ", () => {
    assert.ok(matchTabs(tabsFor("chu"), "arpu").some((tab) => tab.id === "tien"));
  });
  it("Hỗ trợ gõ doanh thu thì không ra tab của Chủ", () => {
    assert.deepEqual(matchTabs(tabsFor("ho-tro"), "doanh thu"), []);
  });
  it("ô trống trả đủ danh sách", () => {
    assert.equal(matchTabs(tabsFor("chu"), "  ").length, 11);
  });
});

describe("nhận ra email", () => {
  it("đúng và sai", () => {
    assert.ok(looksLikeEmail(" a@b.com "));
    assert.ok(!looksLikeEmail("abc"));
    assert.ok(!looksLikeEmail("a b@c.com"));
  });
});
