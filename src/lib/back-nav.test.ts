import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { backTab, canGoBack, pushTabHistory } from "./back-nav.ts";

describe("có trang trước hay không", () => {
  it("trang đầu của phiên thì không", () => {
    assert.equal(canGoBack({ __TSR_index: 0 }), false);
    assert.equal(canGoBack(null), false);
    assert.equal(canGoBack(undefined), false);
    assert.equal(canGoBack({}), false);
  });
  it("đã đi qua trang khác thì có", () => {
    assert.equal(canGoBack({ __TSR_index: 1 }), true);
    assert.equal(canGoBack({ __TSR_index: 5 }), true);
  });
});

describe("mũi tên giữa các tab cùng trang", () => {
  type T = "tong-quan" | "viec" | "tien";
  it("về tab vừa xem, rồi tab trước đó", () => {
    let stack: T[] = [];
    stack = pushTabHistory(stack, "tong-quan", "viec");
    stack = pushTabHistory(stack, "viec", "tien");
    assert.deepEqual(stack, ["tong-quan", "viec"]);
    const first = backTab(stack, "tien", "tong-quan");
    assert.deepEqual(first, { tab: "viec", stack: ["tong-quan"] });
    const second = backTab(first!.stack, "viec", "tong-quan");
    assert.deepEqual(second, { tab: "tong-quan", stack: [] });
  });
  it("không ghi trùng khi bấm lại cùng tab", () => {
    assert.deepEqual(pushTabHistory(["tong-quan"] as T[], "viec", "viec"), ["tong-quan"]);
    assert.deepEqual(pushTabHistory(["tong-quan"] as T[], "tong-quan", "viec"), ["tong-quan"]);
  });
  it("hết lịch sử mà chưa ở màn chính thì về màn chính", () => {
    assert.deepEqual(backTab([] as T[], "tien", "tong-quan"), { tab: "tong-quan", stack: [] });
  });
  it("đã ở màn chính, không còn lịch sử thì để nút rời trang", () => {
    assert.equal(backTab([] as T[], "tong-quan", "tong-quan"), null);
  });
});

describe("nút quay lại có mặt ở các trang", () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const pages: Record<string, string> = {
    "Hướng dẫn": "../components/guide-page.tsx",
    "Dịch trực tiếp": "../components/live-screen.tsx",
    "Tài khoản": "../routes/tai-khoan.tsx",
    "Gói": "../routes/goi.tsx",
    "Cộng tác viên": "../routes/ctv.tsx",
    "Tải video": "../routes/tai-video.tsx",
    "Điều khoản": "../routes/dieu-khoan.tsx",
    "Admin": "../components/admin-desk.tsx",
    "Số dư (trong Studio)": "../components/studio.tsx",
  };
  for (const [name, path] of Object.entries(pages)) {
    it(`${name} có <BackButton`, () => {
      assert.match(read(path), /<BackButton/);
    });
  }
  it("không có trang trước thì về trang chủ (khách)", () => {
    assert.match(read("../components/back-button.tsx"), /fallback = "\/"/);
  });
});
