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

import { AFFILIATE_DEFAULT, commissionFor, MAX_SHARE_CAP_BP, parseAffiliateRules } from "./affiliate.ts";

describe("hoa hồng tính trên lời (web luôn giữ ít nhất nửa lời gộp)", () => {
  const rules = { ...AFFILIATE_DEFAULT, opexBp: 1500, maxShareBp: 4000, minMarginBp: 1500 };

  it("gói thuê phòng 9.000 đ: trừ 15% vận hành còn 7.650 đ lời, 20% là 1.530 đ", () => {
    const c = commissionFor({ revenue: 9000, cost: 0, rateBp: 2000, rules });
    assert.equal(c.opex, 1350);
    assert.equal(c.profit, 7650);
    assert.equal(c.amount, 1530);
    assert.equal(c.kept, 6120);
  });

  it("ví dụ của Chủ: web lời 10.000 đ thì hoa hồng không thể 8.000 đ", () => {
    const greedy = { ...rules, opexBp: 0, maxShareBp: 9000, minMarginBp: 0 };
    const c = commissionFor({ revenue: 20000, cost: 10000, rateBp: 8000, rules: parseAffiliateRules(JSON.stringify(greedy)) });
    assert.equal(c.profit, 10000);
    assert.ok(c.amount <= 5000, `hoa hồng ${c.amount}`);
    assert.ok(c.kept >= 5000);
  });

  it("đơn Token dịch: giá vốn là số Token × giá gốc Turbo", () => {
    // 1.000 Token, giá gốc 10 đ/Token = 10.000 đ vốn; bán 15.000 đ; vận hành 2.250 đ; lời 2.750 đ (18%).
    const c = commissionFor({ revenue: 15000, cost: 10000, rateBp: 2000, rules });
    assert.equal(c.profit, 2750);
    assert.equal(c.amount, 550);
  });

  it("lời mỏng hơn ngưỡng hoặc lỗ thì không có hoa hồng", () => {
    assert.equal(commissionFor({ revenue: 12000, cost: 10000, rateBp: 2000, rules }).reason, "mong");
    assert.equal(commissionFor({ revenue: 9000, cost: 10000, rateBp: 2000, rules }).reason, "lo");
    assert.equal(commissionFor({ revenue: 9000, cost: 10000, rateBp: 2000, rules }).amount, 0);
  });

  it("Admin đặt trần trên 50% vẫn bị kẹp về 50%", () => {
    assert.equal(parseAffiliateRules(JSON.stringify({ maxShareBp: 9000 })).maxShareBp, MAX_SHARE_CAP_BP);
  });

  it("mọi tổ hợp: hoa hồng ≤ nửa lời gộp và web không bao giờ lỗ vì hoa hồng", () => {
    for (const revenue of [1000, 9000, 39000, 99000, 250000])
      for (const costPct of [0, 30, 60, 85, 100, 120])
        for (const rate of [0, 1000, 2000, 5000, 10000])
          for (const share of [0, 2500, 5000, 9999]) {
            const c = commissionFor({ revenue, cost: Math.round((revenue * costPct) / 100), rateBp: rate, rules: parseAffiliateRules(JSON.stringify({ ...rules, maxShareBp: share })) });
            assert.ok(c.amount >= 0);
            assert.ok(c.amount * 2 <= Math.max(0, c.profit), JSON.stringify(c));
            if (c.profit <= 0) assert.equal(c.amount, 0);
          }
  });
});

import { cleanPayoutBank, maskAccount } from "./affiliate.ts";

describe("tài khoản nhận hoa hồng", () => {
  it("chuẩn hóa tên chủ tài khoản và số tài khoản", () => {
    assert.deepEqual(cleanPayoutBank({ bank: "Vietcombank", account: "0123 456-789", holder: "Nguyễn Văn Đạt" }), { bank: "vietcombank", account: "0123456789", holder: "NGUYEN VAN DAT" });
  });
  it("từ chối ngân hàng lạ, số tài khoản sai", () => {
    assert.throws(() => cleanPayoutBank({ bank: "abc", account: "0123456789", holder: "A B" }));
    assert.throws(() => cleanPayoutBank({ bank: "acb", account: "12ab", holder: "A B" }));
    assert.throws(() => cleanPayoutBank({ bank: "acb", account: "0123456789", holder: "!" }));
  });
  it("che số tài khoản", () => {
    assert.equal(maskAccount("0123456789"), "******6789");
  });
});
