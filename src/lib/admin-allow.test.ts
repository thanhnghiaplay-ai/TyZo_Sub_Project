import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { emailIsOwner } from "./admin-allow.server.ts";

describe("email chủ", () => {
  const previous = process.env.ADMIN_EMAIL;

  afterEach(() => {
    if (previous == null) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previous;
  });

  it("chỉ đúng email trong biến máy chủ", () => {
    process.env.ADMIN_EMAIL = "Chu@TyZo.test";
    assert.equal(emailIsOwner("chu@tyzo.test"), true);
    assert.equal(emailIsOwner("khach@tyzo.test"), false);
  });
});
