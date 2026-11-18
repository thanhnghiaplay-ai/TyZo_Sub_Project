import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { groupByHouse, houseSourceLine, isPulledHouse } from "./price-house.ts";

const none = { hour: null, inn: null, out: null, chars: null };
const rows = [
  { id: "a", house: "Groq", fix: none },
  { id: "b", house: "Groq", fix: { ...none, hour: 0.1 } },
  { id: "c", house: "Deepgram", fix: none },
  { id: "d", house: "Soniox", fix: none },
];

test("gom theo nhà, giữ thứ tự, đếm số bạn sửa", () => {
  const groups = groupByHouse(rows);
  assert.deepEqual(groups.map((g) => g.house), ["Groq", "Deepgram", "Soniox"]);
  assert.equal(groups[0].rows.length, 2);
  assert.equal(groups[0].fixedCount, 1);
  assert.equal(groups[1].fixedCount, 0);
});

test("chỉ Groq, Alibaba, Deepgram là nhà tự lấy", () => {
  assert.equal(isPulledHouse("Alibaba"), true);
  for (const house of ["AssemblyAI", "Soniox", "Speechmatics"]) assert.equal(isPulledHouse(house), false);
});

test("dòng nguồn giá", () => {
  const [groq, , soniox] = groupByHouse(rows);
  assert.match(houseSourceLine(groq), /tự lấy/);
  assert.match(houseSourceLine(groq), /1 model đang dùng số bạn sửa/);
  assert.match(houseSourceLine(soniox), /giá gắn sẵn, sửa tay khi nhà đổi giá/);
});

test("bảng giá: nút Lấy lại chỉ ở nhà tự lấy, một nút lưu, không còn đoạn văn Deepgram riêng", () => {
  const src = readFileSync(new URL("../components/model-usd-board.tsx", import.meta.url), "utf8");
  assert.match(src, /group\.pulled/);
  assert.equal((src.match(/Lưu số đô la/g) ?? []).length, 1);
  assert.doesNotMatch(src, /Giá Deepgram tự cập nhật/);
});
