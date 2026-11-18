import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { dong, dongOrNull, formatMoney } from "./money-format.ts";

test("dong định dạng kiểu Việt kèm đơn vị", () => {
  assert.equal(dong(0), "0 đ");
  assert.equal(dong(9000), "9.000 đ");
  assert.equal(dong(1234567), "1.234.567 đ");
});

test("dongOrNull: thiếu số thì trả chữ thay thế, có số thì làm tròn rồi định dạng", () => {
  assert.equal(dongOrNull(null, "chưa đủ giá"), "chưa đủ giá");
  assert.equal(dongOrNull(1234.6, "x"), "1.235 đ");
  assert.equal(dongOrNull(0, "x"), "0 đ");
});

test("formatMoney cũ vẫn như trước", () => {
  assert.equal(formatMoney(100000), "100.000");
  assert.equal(formatMoney("1.000"), "1.000");
});

test("không còn hàm dong chép tay ở src (trừ money-format.ts và ledger-view.ts vì ledger lấy trị tuyệt đối)", () => {
  const root = new URL("../", import.meta.url);
  const hits: string[] = [];
  const walk = (dir: URL) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const next = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
      if (entry.isDirectory()) walk(next);
      else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        const text = readFileSync(next, "utf8");
        if (/function dong\(/.test(text) && !/money-format\.ts$|ledger-view\.ts$/.test(entry.name)) hits.push(entry.name);
      }
    }
  };
  walk(root);
  assert.deepEqual(hits, []);
});
