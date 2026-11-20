import assert from "node:assert/strict";
import { test } from "node:test";
import { STEP_ORDER, stepInfo } from "./studio-steps.ts";

test("chuỗi bước đúng thứ tự khách làm: key, phim, ngữ cảnh, thuyết minh, tải và dịch", () => {
  assert.deepEqual([...STEP_ORDER], ["key", "phim", "cast", "voice", "run"]);
});

test("mỗi bước trỏ sang bước kế, bước cuối không có bước kế", () => {
  assert.deepEqual(stepInfo("key"), { index: 1, total: 5, next: "phim", last: false });
  assert.equal(stepInfo("phim")?.next, "cast");
  assert.equal(stepInfo("cast")?.next, "voice");
  assert.equal(stepInfo("voice")?.next, "run");
  assert.deepEqual(stepInfo("run"), { index: 5, total: 5, next: null, last: true });
});

test("tab ngoài chuỗi (Kiểm tra, Thuật ngữ) không có thanh Tiếp tục", () => {
  assert.equal(stepInfo("check"), null);
  assert.equal(stepInfo("thuatngu"), null);
});
