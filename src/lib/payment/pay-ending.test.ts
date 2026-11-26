import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = read("../../styles.css");
const block = css.slice(css.indexOf("/* PAY-END"), css.indexOf("/* Bước 6.4"));

test("hai màn thanh toán dùng chung PayEnding, không còn chép riêng lời cảm ơn/xin lỗi", () => {
  for (const file of ["../../components/pay-slip.tsx"]) {
    const source = read(file);
    assert.ok(source.includes("<PayEnding"), file);
    assert.ok(!source.includes("Xin cảm ơn"), `${file} còn chép lời cảm ơn`);
    assert.ok(!source.includes("Xin lỗi vì sự bất tiện"), `${file} còn chép lời xin lỗi`);
  }
  const ending = read("../../components/pay-ending.tsx");
  assert.ok(ending.includes("Xin cảm ơn") && ending.includes("Xin lỗi vì sự bất tiện này"));
});

test("PAY-END: màu theo bộ màu của web, không gắn cứng mã màu", () => {
  assert.ok(block.length > 500, "thiếu khối PAY-END");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(block), "khối PAY-END không được có mã màu cứng");
  assert.match(block, /var\(--color-accent\)/);
});

test("PAY-END: tôn trọng nút tắt hiệu ứng và giảm chuyển động; xin lỗi không có tia sáng", () => {
  assert.match(block, /html\[data-fx="off"\] \.pay-end-glow/);
  assert.match(block, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  const ending = read("../../components/pay-ending.tsx");
  assert.match(ending, /thanks &&\s*\n?\s*Array\.from/);
  assert.ok(ending.includes('role="status"'));
});
