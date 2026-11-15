import assert from "node:assert/strict";
import { test } from "node:test";
import { placeVersionLog } from "./version-mark-place.ts";

const phone = { width: 360, height: 700 };

test("khung không tràn mép phải khi nút nằm sát mép trái và căn mép phải", () => {
  const at = placeVersionLog({ left: 8, right: 60, top: 20, bottom: 40 }, phone, "end");
  assert.ok(at.left >= 8);
  assert.ok(at.left + at.width <= phone.width - 8);
});

test("khung không tràn mép trái khi nút nằm sát mép phải và căn mép trái", () => {
  const at = placeVersionLog({ left: 300, right: 352, top: 20, bottom: 40 }, phone, "start");
  assert.ok(at.left + at.width <= phone.width - 8);
  assert.ok(at.left >= 8);
});

test("màn hẹp hơn khung thì khung co lại vừa màn", () => {
  const at = placeVersionLog({ left: 10, right: 60, top: 10, bottom: 30 }, { width: 280, height: 600 }, "end");
  assert.ok(at.width <= 280 - 16);
});

test("thiếu chỗ phía dưới thì lật lên trên nút", () => {
  const at = placeVersionLog({ left: 100, right: 150, top: 600, bottom: 620 }, phone, "end");
  assert.ok(at.top + at.maxHeight <= 600);
});

test("đủ chỗ phía dưới thì nằm ngay dưới nút", () => {
  const at = placeVersionLog({ left: 100, right: 150, top: 20, bottom: 40 }, phone, "end");
  assert.equal(at.top, 48);
});
