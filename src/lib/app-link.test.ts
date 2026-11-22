import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanDeviceName, codeFromBytes, LINK_ALPHABET, normalizeCode, readDeviceToken, showCode } from "./app-link.ts";

describe("mã liên kết ứng dụng", () => {
  it("dựng mã 8 ký tự trong bảng chữ, hiện có gạch giữa", () => {
    const code = codeFromBytes(new Uint8Array([0, 1, 2, 3, 250, 251, 252, 255]));
    assert.equal(code.length, 8);
    for (const ch of code) assert.ok(LINK_ALPHABET.includes(ch));
    assert.equal(showCode(code), `${code.slice(0, 4)}-${code.slice(4)}`);
  });

  it("nhận mã gõ thường, có cách hoặc gạch", () => {
    assert.equal(normalizeCode("abcd-efgh"), "ABCDEFGH");
    assert.equal(normalizeCode(" ab cd ef gh "), "ABCDEFGH");
  });

  it("từ chối mã sai dạng hoặc có chữ dễ nhầm", () => {
    assert.equal(normalizeCode("ABC"), null);
    assert.equal(normalizeCode("ABCDEFGO"), null);
    assert.equal(normalizeCode("ABCDEFGI"), null);
    assert.equal(normalizeCode(12345678), null);
  });

  it("tên máy gọn, có tên mặc định", () => {
    assert.equal(cleanDeviceName("  Xiaomi\n M2007J3SG "), "Xiaomi M2007J3SG");
    assert.equal(cleanDeviceName(""), "Điện thoại Android");
    assert.equal(cleanDeviceName(null), "Điện thoại Android");
    assert.equal(cleanDeviceName("x".repeat(100)).length, 60);
  });

  it("chỉ đọc khóa máy đúng dạng", () => {
    const token = `tzd_${"a".repeat(43)}`;
    assert.equal(readDeviceToken(`Bearer ${token}`), token);
    assert.equal(readDeviceToken(`Basic ${token}`), null);
    assert.equal(readDeviceToken("Bearer abc"), null);
    assert.equal(readDeviceToken(null), null);
  });
});
