import assert from "node:assert/strict";
import test from "node:test";
import { ledgerRows } from "./ledger-view.ts";

test("mua Token hiện +Token và tiền, ẩn cặp bù nhầm", () => {
  const rows = ledgerRows([
    { id: 3, kind: "nap", amount: 6407, note: "Nap sepay TZZEKV85" },
    { id: 2, kind: "goi-giay", amount: -6407, note: "Bù 10000 Token dịch từ đơn đã trả, gỡ số dư nhầm" },
    { id: 1, kind: "nap", amount: 6425, note: "Mua 10000 Token dịch, hạn 30 ngày" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].main, "+10.000 Token dịch");
  assert.equal(rows[0].money, "6.425 đ");
  assert.equal(rows[0].tone, "up");
});

test("đơn bị từ chối vẫn hiện, giữ chỗ ẩn", () => {
  const rows = ledgerRows([
    { id: 2, kind: "huy-nap", amount: 0, note: "Từ chối đơn" },
    { id: 1, kind: "giu", amount: -500, note: "Giữ chỗ phiếu abc" },
  ]);
  assert.deepEqual(rows.map((r) => r.main), ["Từ chối"]);
});
