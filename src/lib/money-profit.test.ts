import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { profitOf, tokenCostVnd } from "./money-profit.ts";

describe("giá vốn Token dịch", () => {
  it("Token × giá Turbo, làm tròn; thiếu giá thì 0", () => {
    assert.equal(tokenCostVnd(1000, 0.35), 350);
    assert.equal(tokenCostVnd(0, 0.35), 0);
    assert.equal(tokenCostVnd(1000, null), 0);
  });
});

describe("lời lỗ theo tiền thật", () => {
  it("ca của Chủ: thu 12.832, giá vốn 18.843 thì lỗ 6.011, không phải −18.843", () => {
    const got = profitOf({ revenue: 12832, von: 18843, hoa: 0, chi: 0 });
    assert.equal(got.lai, -6011);
    assert.equal(got.loi, -6011);
  });
  it("trừ hoa hồng và chi phí ghi tay", () => {
    const got = profitOf({ revenue: 100000, von: 30000, hoa: 5000, chi: 20000 });
    assert.equal(got.lai, 70000);
    assert.equal(got.loi, 45000);
  });
  it("không có gì thì bằng 0, số lạ không làm hỏng", () => {
    assert.deepEqual(profitOf({ revenue: 0, von: 0, hoa: 0, chi: 0 }), { lai: 0, loi: 0 });
    assert.deepEqual(profitOf({ revenue: Number.NaN, von: -5, hoa: Number.NaN, chi: 0 }), { lai: 0, loi: 0 });
  });
  it("máy chủ và màn hình dùng chung hàm này, không còn công thức goi + luot", () => {
    const server = readFileSync(new URL("./admin-room.ts", import.meta.url), "utf8");
    const screen = readFileSync(new URL("../components/admin-company.tsx", import.meta.url), "utf8");
    assert.ok(server.includes("profitOf("));
    assert.ok(!/const lai = goi \+ luot - von/.test(server));
    assert.ok(!screen.includes("breakdown.lai - cost - breakdown.hoa"));
  });
  it("giá vốn Token dịch = Token × giá gốc Turbo; thiếu giá thì 0", () => {
    assert.equal(tokenCostVnd(600, 0.5), 300);
    assert.equal(tokenCostVnd(0, 0.5), 0);
    assert.equal(tokenCostVnd(600, null), 0);
  });
  it("getMoney cộng giá vốn Token dịch vào von", () => {
    const server = readFileSync(new URL("./admin-room.ts", import.meta.url), "utf8");
    assert.ok(server.includes("tokenCostVnd(used.tokens, turbo)"));
  });
});
