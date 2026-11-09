import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanSuggestion, glossaryPair } from "./glossary-share.ts";

describe("glossary share", () => {
  it("bỏ link và chuỗi số dài", () => {
    assert.deepEqual(cleanSuggestion("xin chào", "hello"), { source: "xin chào", target: "hello" });
    assert.equal(cleanSuggestion("tên", "https://a.b"), null);
    assert.equal(cleanSuggestion("123456789", "một"), null);
  });

  it("giữ cụm ngắn", () => {
    assert.deepEqual(cleanSuggestion("  đọc  ", "xem"), { source: "đọc", target: "xem" });
  });

  it("chỉ nhận ngôn ngữ và thể loại đã có", () => {
    assert.deepEqual(glossaryPair("ZH", "Sex"), { lang: "zh", genre: "sex" });
    assert.throws(() => glossaryPair("vi", "sex"));
  });
});
