import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLAN_PRICE_MAX,
  PLAN_PRICE_MIN,
  defaultPlanPrices,
  describePlanPrices,
  parsePlanPrices,
  planPricesProblem,
  plansWith,
  pricedPlan,
} from "./room-plan-prices.ts";
import { ROOM_PLANS } from "./room-plans.ts";

const good = () => ({
  ngay: { price: 10_000, strike: null as number | null },
  tuan: { price: 45_000, strike: 70_000 as number | null },
  thang: { price: 120_000, strike: 300_000 as number | null },
});

describe("giá thuê phòng chỉnh được", () => {
  it("mặc định đúng bằng bảng giá hiện tại, kể cả số tiết kiệm", () => {
    const plans = plansWith(null);
    for (const base of ROOM_PLANS) {
      const plan = plans.find((item) => item.id === base.id)!;
      assert.equal(plan.price, base.price);
      assert.equal(plan.strike, base.strike);
      assert.equal(plan.save, base.save, base.id);
      assert.equal(plan.hours, base.hours);
    }
    assert.equal(planPricesProblem(defaultPlanPrices()), "");
  });
  it("giá mới được áp, số tiết kiệm tự tính từ giá gạch trừ giá bán", () => {
    const plans = plansWith(good());
    assert.equal(plans[1].price, 45_000);
    assert.equal(plans[1].save, 25_000);
    assert.equal(plans[0].save, null);
    assert.equal(pricedPlan(good(), "thang")?.save, 180_000);
    assert.equal(pricedPlan(good(), "khong-co"), null);
  });
  it("mã, tên và số giờ không đổi theo giá", () => {
    const plans = plansWith(good());
    assert.deepEqual(plans.map((p) => [p.id, p.name, p.hours]), ROOM_PLANS.map((p) => [p.id, p.name, p.hours]));
  });
  it("chặn giá sai: ngoài khoảng, không nguyên, giá gạch thấp hơn giá bán, gói dài không đắt hơn gói ngắn", () => {
    assert.equal(planPricesProblem(good()), "");
    assert.match(planPricesProblem({ ...good(), ngay: { price: PLAN_PRICE_MIN - 1, strike: null } }), /phải từ/);
    assert.match(planPricesProblem({ ...good(), thang: { price: PLAN_PRICE_MAX + 1, strike: null } }), /phải từ/);
    assert.match(planPricesProblem({ ...good(), ngay: { price: 9_000.5, strike: null } }), /số nguyên/);
    assert.match(planPricesProblem({ ...good(), tuan: { price: 45_000, strike: 45_000 } }), /cao hơn giá bán/);
    assert.match(planPricesProblem({ ...good(), tuan: { price: 9_000, strike: null } }), /đắt hơn/);
    assert.match(planPricesProblem({ ...good(), thang: { price: 45_000, strike: null } }), /đắt hơn/);
  });
  it("đọc giá lưu: hợp lệ thì dùng, rỗng/hỏng/sai thì null để dùng mặc định", () => {
    assert.deepEqual(parsePlanPrices(JSON.stringify(good())), good());
    assert.equal(parsePlanPrices(null), null);
    assert.equal(parsePlanPrices(""), null);
    assert.equal(parsePlanPrices("không phải json"), null);
    assert.equal(parsePlanPrices(JSON.stringify({ ngay: { price: 1 } })), null);
    assert.equal(parsePlanPrices(JSON.stringify({ ...good(), tuan: { price: "39000", strike: null } })), null);
    assert.equal(parsePlanPrices(JSON.stringify({ ...good(), tuan: { price: 5_000, strike: null } })), null);
  });
  it("nhật ký ghi đúng chỗ đổi, không đổi thì nói rõ", () => {
    const text = describePlanPrices(null, good());
    assert.match(text, /24 giờ: 9\.000đ → 10\.000đ/);
    assert.match(text, /7 ngày: 39\.000đ → 45\.000đ/);
    assert.equal(describePlanPrices(good(), good()), "Lưu lại, không đổi giá.");
  });
});
