import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { packPriceVnd, tokensForBase } from "./token-math.ts";

describe("quy giây dịch", () => {
  it("1 giây Turbo là 1 đơn vị, model đắt hơn thì nhiều hơn", () => {
    assert.equal(tokensForBase(30_000, 0.3), 100_000);
    assert.equal(tokensForBase(0.3, 0.3), 1);
    assert.equal(tokensForBase(0, 0.3), 0);
    assert.equal(tokensForBase(10, 0), null);
  });

  it("giá gói là số giây nhân giá Turbo, phần chênh và đệm, làm tròn lên", () => {
    assert.equal(packPriceVnd(100_000, 0.3, 50, 1.2), 54_000);
    assert.equal(packPriceVnd(1, 0.2, 0, 1), 1);
    assert.equal(packPriceVnd(10, 0, 50, 1.2), null);
    assert.equal(packPriceVnd(10, 0.3, 50, 0), null);
  });
});
