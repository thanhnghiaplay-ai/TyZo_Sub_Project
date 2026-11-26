import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { packStatusView } from "./pack-status.ts";

test("bật và tắt khác nhau cả chữ, dấu và màu", () => {
  const on = packStatusView(true);
  const off = packStatusView(false);
  assert.equal(on.text, "Đang mở");
  assert.equal(off.text, "Đang tắt");
  assert.notEqual(on.mark, off.mark);
  assert.notEqual(on.className, off.className);
});

test("chữ đậm text-ink chỉ đi với nền vàng bg-accent (không chìm vào nền tối)", () => {
  assert.ok(packStatusView(true).className.includes("bg-accent") && packStatusView(true).className.includes("text-ink"));
  assert.ok(!packStatusView(false).className.includes("text-ink"));
});

test("bảng gói dịch dùng packStatusView, không tự dán text-ink lên nền tối", () => {
  const src = readFileSync(new URL("../../components/service-pack-board.tsx", import.meta.url), "utf8");
  assert.ok(src.includes("packStatusView("));
  assert.ok(!src.includes('"border-accent text-ink"'));
});
