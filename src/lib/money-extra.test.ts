import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { arpu, conversionRate, costPerMinute, lineGeometry, parseCategory, pathOf, safeDiv, sortCategories } from "./money-extra.ts";

describe("phân loại chi phí", () => {
  it("loại lạ hay thiếu về khac", () => {
    assert.equal(parseCategory("api"), "api");
    assert.equal(parseCategory("abc"), "khac");
    assert.equal(parseCategory(undefined), "khac");
    assert.equal(parseCategory(5), "khac");
  });
  it("gộp theo loại, lớn nhất lên đầu, bỏ loại 0", () => {
    const rows = sortCategories([
      { category: "api", amount: 100 },
      { category: "ha-tang", amount: 300 },
      { category: "api", amount: 250 },
      { category: "quang-cao", amount: 0 },
      { category: "lạ", amount: 20 },
    ]);
    assert.deepEqual(rows, [
      { category: "api", amount: 350 },
      { category: "ha-tang", amount: 300 },
      { category: "khac", amount: 20 },
    ]);
  });
  it("số âm không làm giảm tổng", () => {
    assert.deepEqual(sortCategories([{ category: "api", amount: -50 }]), []);
  });
});

describe("chỉ số", () => {
  it("chia cho 0 trả null", () => {
    assert.equal(safeDiv(5, 0), null);
    assert.equal(arpu(100000, 0), null);
    assert.equal(conversionRate(0, 0), null);
    assert.equal(costPerMinute(1000, 0), null);
  });
  it("ARPU làm tròn", () => {
    assert.equal(arpu(100000, 3), 33333);
  });
  it("chuyển đổi không vượt 100%", () => {
    assert.equal(conversionRate(4, 1), 0.25);
    assert.equal(conversionRate(2, 5), 1);
  });
  it("giá vốn mỗi phút âm thanh", () => {
    assert.equal(costPerMinute(600, 3600), 10);
    assert.equal(costPerMinute(1000, 90), 667);
  });
});

describe("đường biểu đồ", () => {
  const box = { width: 100, height: 50, pad: 5 };
  it("không có điểm thì rỗng", () => {
    assert.deepEqual(lineGeometry([[], []], box), { max: 0, lines: [[], []] });
  });
  it("điểm cao nhất ở sát đỉnh, 0 ở đáy", () => {
    const { max, lines } = lineGeometry([[0, 100], [50, 0]], box);
    assert.equal(max, 100);
    assert.equal(lines[0][0].y, 45);
    assert.equal(lines[0][1].y, 5);
    assert.equal(lines[0][0].x, 5);
    assert.equal(lines[0][1].x, 95);
    assert.equal(lines[1][0].y, 25);
  });
  it("một điểm đặt giữa; toàn 0 nằm đáy, không NaN", () => {
    const one = lineGeometry([[7]], box);
    assert.equal(one.lines[0][0].x, 50);
    const zero = lineGeometry([[0, 0]], box);
    assert.ok(zero.lines[0].every((p) => p.y === 45 && Number.isFinite(p.x)));
  });
  it("đường vẽ bắt đầu bằng M", () => {
    assert.equal(pathOf([{ x: 1, y: 2 }, { x: 3, y: 4 }]), "M1.0 2.0 L3.0 4.0");
  });
});
