import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mailProblem, withDomain } from "./mail-domains.ts";

describe("email đăng ký", () => {
  it("gắn đuôi phổ biến và chặn email tạm", () => {
    assert.equal(withDomain("ten", "gmail.com"), "ten@gmail.com");
    assert.equal(withDomain("ten@yahoo.com", "icloud.com"), "ten@icloud.com");
    assert.equal(mailProblem("a@gmail.com"), null);
    assert.match(mailProblem("a@yopmail.com") || "", /email tạm/);
  });
});
