import assert from "node:assert/strict";
import test from "node:test";
import { formatMinutes, minutesLeft, pickPrice, runEstimate, type PriceRow } from "./wallet-view.ts";

const rows: PriceRow[] = [
  { id: "a", total: 900, hold: 1200 },
  { id: "b", total: 600, hold: 800 },
  { id: "c", total: null, hold: 0 },
];

test("pickPrice ưu tiên gói đang chọn, không có thì lấy gói rẻ nhất có giá", () => {
  assert.deepEqual(pickPrice(rows, "a"), { row: rows[0], exact: true });
  assert.deepEqual(pickPrice(rows, "zzz"), { row: rows[1], exact: false });
  assert.deepEqual(pickPrice(rows, null), { row: rows[1], exact: false });
  assert.equal(pickPrice([rows[2]], "c"), null);
  assert.equal(pickPrice([], null), null);
});

test("minutesLeft chia số dư cho giá một phút, làm tròn xuống", () => {
  assert.equal(minutesLeft(25_000, 600), 41);
  assert.equal(minutesLeft(25_200, 600), 42);
  assert.equal(minutesLeft(0, 600), 0);
  assert.equal(minutesLeft(-5, 600), 0);
  assert.equal(minutesLeft(10_000, null), null);
  assert.equal(minutesLeft(10_000, 0), null);
});

test("formatMinutes viết gọn", () => {
  assert.equal(formatMinutes(0), "dưới 1 phút");
  assert.equal(formatMinutes(42), "42 phút");
  assert.equal(formatMinutes(60), "1 giờ");
  assert.equal(formatMinutes(125), "2 giờ 5 phút");
});

test("runEstimate so số giữ với số dư", () => {
  assert.deepEqual(runEstimate(rows[0], 2000), { total: 900, hold: 1200, enough: true, short: 0 });
  assert.deepEqual(runEstimate(rows[0], 1000), { total: 900, hold: 1200, enough: false, short: 200 });
  assert.deepEqual(runEstimate({ id: "x", total: 500, hold: 0 }, 400), { total: 500, hold: 500, enough: false, short: 100 });
  assert.equal(runEstimate(rows[2], 5000), null);
  assert.equal(runEstimate(null, 5000), null);
});
