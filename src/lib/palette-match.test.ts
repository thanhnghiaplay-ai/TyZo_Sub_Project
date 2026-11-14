import assert from "node:assert/strict";
import test from "node:test";
import { matchCommands, type PaletteCommand } from "./palette-match.ts";

const run = () => {};
const list: PaletteCommand[] = [
  { id: "pick", label: "Chọn video", hint: "Việc", words: "tep file", run },
  { id: "pay", label: "Số dư và nạp tiền", hint: "Tài khoản", words: "nap", run },
  { id: "srt", label: "Tải phụ đề SRT", hint: "Tải", words: "xuat", run, disabled: true },
];

test("gõ không dấu vẫn tìm được lệnh", () => {
  assert.deepEqual(matchCommands(list, "nap tien").map((c) => c.id), ["pay"]);
  assert.deepEqual(matchCommands(list, "nap").map((c) => c.id), ["pay"]);
  assert.deepEqual(matchCommands(list, "chon vi").map((c) => c.id), ["pick"]);
});

test("ô trống liệt kê mọi lệnh còn dùng được, bỏ lệnh khóa", () => {
  assert.deepEqual(matchCommands(list, "").map((c) => c.id), ["pick", "pay"]);
  assert.deepEqual(matchCommands(list, "srt"), []);
});
