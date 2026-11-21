import assert from "node:assert/strict";
import { test } from "node:test";
import { dockBadgeText, isTypingTarget, keyboardOpen } from "./dock.ts";

test("chấm số: rỗng khi 0 hoặc thiếu, 99+ khi lớn", () => {
  assert.equal(dockBadgeText(undefined), "");
  assert.equal(dockBadgeText(0), "");
  assert.equal(dockBadgeText(-3), "");
  assert.equal(dockBadgeText(3), "3");
  assert.equal(dockBadgeText(99), "99");
  assert.equal(dockBadgeText(100), "99+");
  assert.equal(dockBadgeText(Number.NaN), "");
});

test("thanh dưới ẩn khi gõ chữ, không ẩn khi bấm nút hay kéo thanh", () => {
  assert.equal(isTypingTarget("INPUT", "text", false), true);
  assert.equal(isTypingTarget("input", "search", false), true);
  assert.equal(isTypingTarget("TEXTAREA", undefined, false), true);
  assert.equal(isTypingTarget("DIV", undefined, true), true);
  assert.equal(isTypingTarget("INPUT", "range", false), false);
  assert.equal(isTypingTarget("INPUT", "checkbox", false), false);
  assert.equal(isTypingTarget("INPUT", "file", false), false);
  assert.equal(isTypingTarget("BUTTON", undefined, false), false);
});

test("bàn phím ảo: mở khi vùng nhìn thấy thấp hẳn đi; tắt bàn phím mà ô vẫn chọn thì coi như đã tắt", () => {
  assert.equal(keyboardOpen(430, 860), true);
  assert.equal(keyboardOpen(860, 860), false);
  assert.equal(keyboardOpen(800, 860), false);
  // Thiếu số đo thì giữ cách cũ: coi như đang mở để thanh không đè ô nhập.
  assert.equal(keyboardOpen(null, 860), true);
  assert.equal(keyboardOpen(500, undefined), true);
});
