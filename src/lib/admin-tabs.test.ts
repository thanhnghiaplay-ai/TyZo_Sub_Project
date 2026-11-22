import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { foldText, looksLikeEmail, matchTabs, tabsFor } from "./admin-tabs.ts";

describe("tab Admin theo quyền", () => {
  it("Chủ thấy đủ 14 tab", () => {
    assert.equal(tabsFor("chu").length, 14);
  });
  it("Quản lý thấy thêm Rủi ro; Hỗ trợ không thấy Rủi ro và tab chỉ của Chủ", () => {
    assert.deepEqual(tabsFor("quan-ly").map((tab) => tab.id), ["tong-quan", "viec", "tai-khoan", "rui-ro", "so-do", "thao-tac", "nhat-ky"]);
    assert.deepEqual(tabsFor("ho-tro").map((tab) => tab.id), ["tong-quan", "viec", "tai-khoan", "so-do", "thao-tac", "nhat-ky"]);
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
  it("tìm key hay cổng nạp ra tab Cấu hình", () => {
    assert.deepEqual(matchTabs(tabsFor("chu"), "alibaba").map((tab) => tab.id), ["cau-hinh"]);
    assert.deepEqual(matchTabs(tabsFor("chu"), "cong nap").map((tab) => tab.id), ["cau-hinh"]);
    assert.deepEqual(matchTabs(tabsFor("ho-tro"), "key groq"), []);
  });
  it("tìm theo từ khóa phụ", () => {
    assert.ok(matchTabs(tabsFor("chu"), "arpu").some((tab) => tab.id === "tien"));
  });
  it("Hỗ trợ gõ doanh thu thì không ra tab của Chủ", () => {
    assert.deepEqual(matchTabs(tabsFor("ho-tro"), "doanh thu"), []);
  });
  it("gõ tài khoản hay mật khẩu tạm ra tab Tài khoản khách, Hỗ trợ cũng thấy", () => {
    assert.ok(matchTabs(tabsFor("ho-tro"), "tai khoan").some((tab) => tab.id === "tai-khoan"));
    assert.deepEqual(matchTabs(tabsFor("quan-ly"), "mat khau").map((tab) => tab.id), ["tai-khoan"]);
  });
  it("ô trống trả đủ danh sách", () => {
    assert.equal(matchTabs(tabsFor("chu"), "  ").length, 14);
  });
});

describe("nhận ra email", () => {
  it("đúng và sai", () => {
    assert.ok(looksLikeEmail(" a@b.com "));
    assert.ok(!looksLikeEmail("abc"));
    assert.ok(!looksLikeEmail("a b@c.com"));
  });
});
