import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TOOL_NAME } from "./customer-menu.ts";
import {
  WHEEL_ORDER,
  dragToPos,
  settleDuration,
  settleTarget,
  wheelCurrent,
  wheelOffset,
  wheelSlot,
  wrapIndex,
  nextTool,
  ringDash,
} from "./tool-wheel.ts";
import { studioSource } from "../components/studio-source.ts";

test("thứ tự lướt theo luồng làm việc, đủ 4 công cụ không trùng; Thuật ngữ và Cài đặt dịch không lướt riêng", () => {
  assert.deepEqual([...WHEEL_ORDER], ["phim", "cast", "voice", "check"]);
  assert.equal(new Set(WHEEL_ORDER).size, 4);
  assert.equal((WHEEL_ORDER as readonly string[]).includes("thuatngu"), false);
  assert.equal((WHEEL_ORDER as readonly string[]).includes("key"), false);
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
  assert.equal(Object.keys(TOOL_NAME).length, WHEEL_ORDER.length + 3);
  assert.equal(TOOL_NAME.run, "Tải và dịch");
  assert.equal(TOOL_NAME.cast, "Ngữ cảnh");
  assert.equal(TOOL_NAME.thuatngu, "Thuật ngữ");
  assert.equal(TOOL_NAME.key, "Cài đặt dịch");
  const studio = studioSource();
  assert.match(studio, /<StudioDock[\s\S]*wheel=\{<ToolWheel /);
  const dock = readFileSync(new URL("../components/studio-dock.tsx", import.meta.url), "utf8");
  assert.equal(dock.includes("onPickFile"), false);
});

test("nextTool đi theo luồng Phim → … → Kiểm tra; công cụ cuối và Cài đặt dịch không có tiếp theo", () => {
  assert.equal(nextTool("phim"), "cast");
  assert.equal(nextTool("check"), null);
  assert.equal(nextTool("key"), null);
  for (let i = 0; i < WHEEL_ORDER.length - 1; i++)
    assert.equal(nextTool(WHEEL_ORDER[i]), WHEEL_ORDER[i + 1]);
  const studio = studioSource();
  // Dòng «Tiếp theo: …» cuối tab đã được thay bằng thanh dính «Tiếp tục» (studio-steps.ts).
  assert.equal(studio.includes("Tiếp theo:"), false);
});

test("ringDash: 0% là vòng trống, 100% là vòng đầy, ngoài khoảng thì cắt", () => {
  const { circumference } = ringDash(0);
  assert.equal(ringDash(0).offset, circumference);
  assert.equal(ringDash(100).offset, 0);
  assert.ok(Math.abs(ringDash(50).offset - circumference / 2) < 1e-9);
  assert.equal(ringDash(-5).offset, circumference);
  assert.equal(ringDash(250).offset, 0);
  assert.equal(ringDash(Number.NaN).offset, circumference);
  const studio = studioSource();
  assert.match(studio, /progress=\{app\.running && app\.stages \? app\.stages\.percent : null\}/);
});
