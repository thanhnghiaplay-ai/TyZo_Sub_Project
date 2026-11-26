import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { prependPack } from "./pack-order.ts";

test("gói mới nằm đầu, gói cũ bị đẩy xuống và không đổi thứ tự", () => {
  assert.deepEqual(prependPack(["a", "b"], "c"), ["c", "a", "b"]);
  assert.deepEqual(prependPack([], "x"), ["x"]);
});

test("không sửa danh sách gốc", () => {
  const list = ["a"];
  prependPack(list, "b");
  assert.deepEqual(list, ["a"]);
});

test("bảng gói dịch: thêm gói luôn chèn đầu, nút Lưu ở trên cùng hàng với nút Thêm", () => {
  const src = readFileSync(new URL("../../components/service-pack-board.tsx", import.meta.url), "utf8");
  assert.ok(!/setPacks\(\(current\) => \[\.\.\.current, /.test(src), "không được chèn gói mới vào cuối");
  assert.equal((src.match(/prependPack\(/g) ?? []).length, 2, "thêm tay và dựng tự động đều chèn đầu");
  const add = src.indexOf("Thêm gói dịch\n");
  const save = src.indexOf("Lưu các gói dịch\n");
  const list = src.indexOf("{packs.map(");
  assert.ok(add > 0 && save > 0 && list > 0);
  assert.ok(save < list, "nút Lưu phải nằm trước danh sách gói");
  assert.equal(src.slice(list).includes("Lưu các gói dịch\n"), false, "không còn nút Lưu ở cuối danh sách");
});
