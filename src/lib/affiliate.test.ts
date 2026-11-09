import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planCommission, runCommission } from "./affiliate.ts";

describe("hoa hồng", () => {
  it("gói 9.000 đồng với 20% là 1.800 đồng", () => {
    assert.equal(planCommission(9000, 2000), 1800);
  });

  it("lượt không trả quá nửa phần lãi", () => {
    assert.equal(runCommission(130000, 100000, 2000), 6000);
    assert.equal(runCommission(130000, 100000, 8000), 15000);
  });

  it("không có lãi thì không có hoa hồng", () => {
    assert.equal(runCommission(100000, 100000, 2000), 0);
    assert.equal(runCommission(80000, 100000, 2000), 0);
  });
});
