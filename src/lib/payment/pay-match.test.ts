import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountMatches, cassoHits, codesIn, isPayCode, makePayCode, randomPayCode, sepayHit, vietqrPayload } from "./pay-match.ts";

describe("nạp tiền", () => {
  it("mã đơn đứng riêng và đọc được trong nội dung", () => {
    const code = makePayCode("abc123");
    assert.equal(isPayCode(code), true);
    assert.deepEqual(codesIn(`chuyen khoan ${code} abc`), [code]);
  });

  it("bỏ giao dịch tiền ra và nhận tiền vào", () => {
    assert.equal(sepayHit({ transferType: "out", transferAmount: 10000, id: "1", code: "TZABCDEF" }), null);
    const hit = sepayHit({ id: 9, transferAmount: 19000, content: "Nap TZABCDEF" });
    assert.equal(hit?.amount, 19000);
    assert.deepEqual(codesIn(hit?.text ?? ""), ["TZABCDEF"]);
  });

  it("đọc danh sách giao dịch Casso", () => {
    const hits = cassoHits({ data: [{ id: 4, amount: 59000, description: "TZABCDEF" }] });
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.ref, "4");
  });

  it("khớp số tài khoản khi cả hai bên có số", () => {
    assert.equal(accountMatches("0123456789", "123456789"), true);
    assert.equal(accountMatches("999", "0123456789"), false);
    assert.equal(accountMatches("", "0123456789"), true);
  });

  it("lập được chuỗi VietQR khi nhận ra ngân hàng", () => {
    const payload = vietqrPayload({ bank: "MB", account: "0123456789", amount: 10000, info: "TZABC234" });
    assert.ok(payload);
    assert.match(payload!, /^000201/);
    assert.ok(payload!.includes("970422"));
    assert.ok(payload!.includes("0123456789"));
    assert.ok(payload!.includes("TZABC234"));
    assert.equal(vietqrPayload({ bank: "Ngan hang la", account: "0123456789", amount: 10000, info: "TZABC234" }), null);
  });
});

describe("mã đơn ngẫu nhiên", () => {
  it("đủ 32 ký tự khác nhau theo từng byte và luôn đúng dạng TZxxxxxx", () => {
    const code = randomPayCode(new Uint8Array([0, 1, 2, 3, 4, 5]));
    assert.equal(code, "TZABCDEF");
    assert.ok(isPayCode(code));
    const seen = new Set<string>();
    for (let b = 0; b < 256; b += 1) seen.add(randomPayCode(new Uint8Array([b, 0, 0, 0, 0, 0])));
    assert.equal(seen.size, 32);
    assert.ok(isPayCode(randomPayCode(new Uint8Array([255, 255, 255, 255, 255, 255]))));
  });
});
