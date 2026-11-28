/** RE8-011: kiểm bộ phân tích giá GPU (mô phỏng). Không đổi giá thật. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { COMBOS, MARGINS, analyze, comboTable } from "./gpu-pricing.mjs";

test("biên lợi nhuận: doanh thu cần = chi phí / (1 − biên), phí tối thiểu và hệ số tăng theo biên", () => {
  const a = analyze();
  for (const groups of Object.values(a)) for (const rows of Object.values(groups)) for (const r of rows) {
    assert.ok(r.cost > 0 && r.charged > 0);
    for (let i = 1; i < MARGINS.length; i++) {
      assert.ok(r.minFee[MARGINS[i]] > r.minFee[MARGINS[i - 1]]);
      assert.ok(r.factor[MARGINS[i]] > r.factor[MARGINS[i - 1]]);
    }
    assert.ok(Math.abs(r.minFee[0.2] - r.cost / 0.8) < 1e-12);
    const b = r.breakdown;
    assert.ok(Math.abs(b.asr.boot + b.asr.busy + b.asr.idle + b.llm.boot + b.llm.active + b.llm.idle - r.cost) < 1e-9, "tách pha cộng lại đúng tổng");
  }
});

test("việc ngắn đơn lẻ lỗ với hệ số 3; phim dài cao điểm có lãi; kỹ có chi phí máy chữ", () => {
  const cur = analyze()["hiện tại (dự phòng 2, chờ tắt 60 s)"];
  assert.ok(cur["nhanh · đơn lẻ"][0].coverage < 0.5);
  assert.ok(cur["nhanh · cao điểm"].at(-1).coverage > 1);
  assert.ok(cur["ky · đơn lẻ"][0].breakdown.llm.boot > 0);
  assert.equal(cur["nhanh · đơn lẻ"][0].breakdown.llm.boot, 0);
});

test("bảng kết hợp đủ dòng và cột", () => {
  const t = comboTable().split("\n");
  assert.equal(t.length, 2 + 2 * 4 * 5);
  assert.ok(t[0].includes(Object.keys(COMBOS)[3]));
});
