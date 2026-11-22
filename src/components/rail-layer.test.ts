import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function zOf(selector: string): number {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `thiếu ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  const match = /z-index:\s*(\d+)/.exec(block);
  assert.ok(match, `${selector} không có z-index`);
  return Number(match[1]);
}

describe("lớp của menu trượt", () => {
  it("nền mờ cao hơn mọi bảng nổi của trang và thấp hơn menu, để bấm ra ngoài là đóng menu", () => {
    const backdrop = zOf(".rail-backdrop");
    const rail = zOf(".app-rail");
    assert.ok(backdrop < rail);
    // Khung Ví trên điện thoại (Chủ báo 22/11/2026: bấm ngoài menu lại mở «Mua Token dịch?»).
    assert.ok(backdrop > zOf(".studio-wallet-tab"));
    // Mọi lớp z-index trong CSS nằm giữa 40 và menu phải thấp hơn nền mờ.
    for (const m of css.matchAll(/z-index:\s*(\d+)/g)) {
      const z = Number(m[1]);
      if (z >= 40 && z < rail) assert.ok(z <= backdrop, `z-index ${z} nằm trên nền mờ menu`);
    }
  });
});
