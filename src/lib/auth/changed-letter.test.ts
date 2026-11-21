import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CHANGE_PASSWORD_PATH, changedLetterTo } from "./changed-letter.ts";

describe("thư «Mật khẩu đã đổi» khi đổi trong trang tài khoản", () => {
  it("đổi xong thì báo đúng email trong kết quả", () => {
    assert.equal(changedLetterTo(CHANGE_PASSWORD_PATH, { token: null, user: { email: "a@gmail.com" } }), "a@gmail.com");
  });

  it("kết quả thiếu email thì lấy email của phiên", () => {
    assert.equal(changedLetterTo(CHANGE_PASSWORD_PATH, { token: null, user: {} }, "b@gmail.com"), "b@gmail.com");
  });

  it("sai mật khẩu cũ hay lỗi khác thì không gửi (dạng lỗi Better Auth trả về: status, body, statusCode)", () => {
    assert.equal(changedLetterTo(CHANGE_PASSWORD_PATH, { status: "BAD_REQUEST", body: {}, statusCode: 400, name: "APIError" }, "a@gmail.com"), null);
    assert.equal(changedLetterTo(CHANGE_PASSWORD_PATH, new Error("x"), "a@gmail.com"), null);
    assert.equal(changedLetterTo(CHANGE_PASSWORD_PATH, null, "a@gmail.com"), null);
  });

  it("đường khác không gửi (đặt lại qua thư đã có onPasswordReset riêng)", () => {
    assert.equal(changedLetterTo("/reset-password", { user: { email: "a@gmail.com" } }), null);
    assert.equal(changedLetterTo("/sign-in/email", { user: { email: "a@gmail.com" } }), null);
    assert.equal(changedLetterTo(undefined, { user: { email: "a@gmail.com" } }), null);
  });

  it("máy chủ xác thực đã gắn hook này", () => {
    const server = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
    assert.match(server, /hooks:\s*\{\s*after: createAuthMiddleware/);
    assert.match(server, /changedLetterTo\(ctx\.path, ctx\.context\.returned/);
    assert.match(server, /sendAuthLetter\("changed", to\)/);
  });
});
