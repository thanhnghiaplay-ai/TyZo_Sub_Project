import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TOOL_NAME } from "./customer-menu.ts";
import { WHEEL_ORDER, dragToPos, settleDuration, settleTarget, wheelCurrent, wheelOffset, wheelSlot, wrapIndex } from "./tool-wheel.ts";

test("thứ tự lướt theo luồng làm việc, đủ 6 công cụ không trùng", () => {
  assert.deepEqual([...WHEEL_ORDER], ["phim", "cast", "thuatngu", "voice", "check", "key"]);
  assert.equal(new Set(WHEEL_ORDER).size, 6);
});

test("danh sách xoay vòng: quá cuối thì về đầu, lùi trước đầu thì ra cuối", () => {
  assert.equal(wrapIndex(6, 6), 0);
  assert.equal(wrapIndex(-1, 6), 5);
  assert.equal(wrapIndex(13, 6), 1);
  assert.equal(wheelCurrent(0.4, 6), 0);
  assert.equal(wheelCurrent(0.6, 6), 1);
  assert.equal(wheelCurrent(-0.6, 6), 5);
});

test("độ lệch ngắn nhất theo vòng, có dấu", () => {
  assert.equal(wheelOffset(0, 0, 6), 0);
  assert.equal(wheelOffset(1, 0, 6), 1);
  assert.equal(wheelOffset(5, 0, 6), -1);
  assert.equal(wheelOffset(0, 5, 6), 1);
  assert.equal(wheelOffset(1, 0.5, 6), 0.5);
});

test("icon đúng giữa to và rõ, càng xa càng nhỏ và mờ, quá hai ô thì tắt", () => {
  const mid = wheelSlot(0);
  assert.deepEqual(mid, { x: 0, scale: 1, opacity: 1 });
  const near = wheelSlot(1);
  assert.ok(near.scale < mid.scale && near.opacity < mid.opacity && near.opacity > 0);
  assert.ok(wheelSlot(0.5).opacity > near.opacity);
  assert.equal(wheelSlot(-1).opacity, near.opacity);
  assert.equal(wheelSlot(3).opacity, 0);
  assert.equal(wheelSlot(1).x, 46);
});

test("thả tay: khớp vào công cụ gần nhất, vuốt nhanh trôi thêm nhưng không quá 3 công cụ", () => {
  assert.equal(settleTarget(2.3, 0), 2);
  assert.equal(settleTarget(2.6, 0), 3);
  assert.equal(settleTarget(0, 0.005), 1);
  assert.equal(settleTarget(0, -0.005), -1);
  assert.equal(settleTarget(0, 5), 3);
  assert.equal(settleTarget(0, -5), -3);
});

test("thời gian trượt tăng theo quãng đường và có trần", () => {
  assert.equal(settleDuration(2, 2), 220);
  assert.ok(settleDuration(0, 2) > settleDuration(0, 1));
  assert.equal(settleDuration(0, 100), 720);
});

test("kéo sang trái thì tiến tới công cụ kế, kéo sang phải thì lùi", () => {
  assert.ok(dragToPos(0, -48) > 0);
  assert.equal(dragToPos(0, -48), 1);
  assert.equal(dragToPos(2, 96), 0);
});

test("mọi công cụ lướt đều có tên trong TOOL_NAME, và Studio gắn nút lướt vào thanh dưới", () => {
  for (const id of WHEEL_ORDER) assert.ok(TOOL_NAME[id], id);
  assert.equal(Object.keys(TOOL_NAME).length, WHEEL_ORDER.length);
  const studio = readFileSync(new URL("../components/studio.tsx", import.meta.url), "utf8");
  assert.match(studio, /<StudioDock[\s\S]*wheel=\{<ToolWheel /);
  const dock = readFileSync(new URL("../components/studio-dock.tsx", import.meta.url), "utf8");
  assert.equal(dock.includes("onPickFile"), false);
});
