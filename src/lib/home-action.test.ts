import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { homeAction } from "./home-action.ts";
import type { PayState } from "./pay-status.ts";
import { studioSource } from "../components/studio-source.ts";

const ready: PayState = { kind: "key-ready", access: { kind: "trial", left: 1 }, keys: ["Groq"] };
const base = { pay: ready, moneyOn: true, hasInput: true, online: true, running: false, blocked: false };

describe("nút chính trang chủ theo trạng thái", () => {
  it("sẵn sàng thì Tải và dịch; chưa có tệp thì nói chọn tệp", () => {
    assert.deepEqual(homeAction(base), { kind: "start", label: "Tải và dịch", hint: "" });
    assert.equal(homeAction({ ...base, pay: { kind: "turn", units: 60 } }).kind, "start");
    const empty = homeAction({ ...base, hasInput: false });
    assert.equal(empty.kind, "none");
    assert.match(empty.hint, /Chọn video/);
  });

  it("thiếu bước trả thì nút thành bước đó, kể cả khi chưa chọn tệp", () => {
    for (const hasInput of [true, false]) {
      assert.equal(homeAction({ ...base, hasInput, pay: { kind: "key-none", access: { kind: "trial", left: 1 }, turnOpen: true } }).kind, "add-key");
      assert.equal(homeAction({ ...base, hasInput, pay: { kind: "key-expired", turnOpen: true } }).kind, "wallet");
      assert.equal(homeAction({ ...base, hasInput, pay: { kind: "turn-empty" } }).kind, "wallet");
      assert.equal(homeAction({ ...base, hasInput, pay: { kind: "choose", turnOpen: true } }).kind, "choose");
    }
  });

  it("chỉ nhắc Dùng Token lần này khi cửa trả theo lượt mở", () => {
    assert.match(homeAction({ ...base, pay: { kind: "key-none", access: { kind: "trial", left: 1 }, turnOpen: true } }).hint, /Token/);
    assert.doesNotMatch(homeAction({ ...base, pay: { kind: "key-none", access: { kind: "trial", left: 1 }, turnOpen: false } }).hint, /Token/);
  });

  it("đang đọc hoặc lỗi đọc tài khoản thì không chặn (máy chủ vẫn kiểm thật)", () => {
    assert.equal(homeAction({ ...base, pay: { kind: "reading" } }).kind, "start");
    assert.equal(homeAction({ ...base, pay: { kind: "failed" } }).kind, "start");
  });

  it("đang chạy, bảo trì, mất mạng đứng trước cách trả và luôn có câu vì sao (trừ đang chạy)", () => {
    assert.equal(homeAction({ ...base, running: true, pay: { kind: "turn-empty" } }).label, "Đang chạy…");
    const down = homeAction({ ...base, blocked: true, pay: { kind: "turn-empty" } });
    assert.equal(down.kind, "none");
    assert.ok(down.hint);
    const off = homeAction({ ...base, online: false });
    assert.equal(off.kind, "none");
    assert.match(off.hint, /mạng/);
  });

  it("tắt tiền thì bỏ qua cách trả", () => {
    assert.equal(homeAction({ ...base, moneyOn: false, pay: { kind: "turn-empty" } }).kind, "start");
  });

  it("trang chủ dùng homeAction cho nút bắt đầu", () => {
    const studio = studioSource();
    assert.match(studio, /homeAction\(/);
    const hero = readFileSync(new URL("../components/home-hero.tsx", import.meta.url), "utf8");
    assert.match(hero, /action\.label/);
  });
});

describe("thanh dưới trang khách: 4 việc có chữ", () => {
  it("Trang chủ, Công cụ, Ví, Menu; Dịch trực tiếp chuyển sang trang chủ và Menu", () => {
    const dock = readFileSync(new URL("../components/studio-dock.tsx", import.meta.url), "utf8");
    assert.equal(dock.includes('id: "live"'), false);
    assert.match(dock, /showLabels/);
    const floating = readFileSync(new URL("../components/floating-dock.tsx", import.meta.url), "utf8");
    assert.match(floating, /showLabels/);
  });
});
