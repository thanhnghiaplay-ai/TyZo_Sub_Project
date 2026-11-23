import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { studioSource } from "../../components/studio-source.ts";

const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const hero = readFileSync(new URL("../../components/home-hero.tsx", import.meta.url), "utf8");
const studio = studioSource();

test("Tương lai B6: chỗ gắn hiệu ứng có trong mã trang khách", () => {
  assert.match(hero, /data-drop-ring/);
  assert.match(hero, /data-home-start/);
  assert.match(studio, /data-hero-title/);
});

test("Tương lai B6: mọi luật mới tôn trọng nút tắt, chữ chuyển màu có đường lui, vòng quay dừng khi giảm chuyển động", () => {
  const block = css.slice(css.indexOf("B6:"));
  for (const sel of ["[data-hero-title]", "[data-drop-ring]", "[data-drop-ring]::after", "[data-home-start]:not(:disabled)", ".rail-parent"]) {
    assert.ok(block.includes(`html[data-look="future"]:not([data-fx="off"]) ${sel}`), sel);
  }
  assert.match(block, /@supports \(background-clip: text\)/);
  assert.match(block, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,160}animation: none/);
});

test("Tương lai B7: chip có dấu giá trị, CSS tô màu nhưng không đổi màu chữ trong danh sách chọn", () => {
  assert.match(hero, /data-chip-select/);
  assert.match(hero, /data-chip-value/);
  const block = css.slice(css.indexOf("B7:"));
  assert.ok(block.includes('html[data-look="future"]:not([data-fx="off"]) [data-chip-select] select'));
  assert.ok(block.includes('html[data-look="future"]:not([data-fx="off"]) [data-chip-value]'));
  assert.match(block, /\[data-chip-select\] option \{[\s\S]{0,120}color: var\(--color-fg\)/);
});
