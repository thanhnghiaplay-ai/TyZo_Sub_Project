import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANALYZE_MAX_CHARS, analyzeMessages, parseBible } from "./analyze.ts";

const base = { language: "Vietnamese", title: "", notes: "", gloss: "", lines: ["Hello An.", "Hi Binh."] };

describe("analyzeMessages dựng câu lệnh phân tích phim", () => {
  it("có lệnh hệ thống đòi JSON và ngôn ngữ đích, lời thoại nằm ở tin người dùng", () => {
    const [sys, user] = analyzeMessages(base);
    assert.equal(sys?.role, "system");
    assert.equal(user?.role, "user");
    assert.match(sys?.content || "", /subtitle translation into Vietnamese/);
    assert.match(sys?.content || "", /Return only JSON/);
    assert.match(user?.content || "", /TRANSCRIPT:\nHello An\.\nHi Binh\./);
  });

  it("không có thông tin thì ghi (none); có tên phim, ghi chú, thuật ngữ thì gộp bằng dấu |", () => {
    assert.match(analyzeMessages(base)[1]?.content || "", /^Known info: \(none\)/);
    const user = analyzeMessages({ ...base, title: "Phim A", notes: "ghi chú", gloss: "Kim Long => Rồng Vàng\nHanoi" })[1]?.content || "";
    assert.match(user, /^Known info: Phim A \| ghi chú \| Kim Long => Rồng Vàng; Hanoi\n/);
  });

  it("ghi chú cắt ở 1500 ký tự, thuật ngữ tối đa 80 mục", () => {
    const user = analyzeMessages({ ...base, notes: "x".repeat(3000), gloss: Array.from({ length: 120 }, (_, i) => `a${i} => b${i}`).join("\n") })[1]?.content || "";
    assert.ok(!user.includes("x".repeat(1501)));
    assert.ok(user.includes("a79 => b79"));
    assert.ok(!user.includes("a80 => b80"));
  });

  it("phụ đề quá dài thì giữ đầu, giữa, cuối và chèn dấu cắt", () => {
    const lines = Array.from({ length: 6000 }, (_, i) => `dòng ${String(i).padStart(5, "0")} nội dung`);
    const user = analyzeMessages({ ...base, lines })[1]?.content || "";
    assert.ok(lines.join("\n").length > ANALYZE_MAX_CHARS);
    assert.match(user, /\[\.\.\.\]/);
    assert.ok(user.includes("dòng 00000"));
    assert.ok(user.includes("dòng 05999"));
    assert.ok(user.length < ANALYZE_MAX_CHARS);
  });
});

describe("parseBible đọc kết quả phân tích", () => {
  it("đọc JSON thường và JSON bọc trong hàng rào ```", () => {
    const json = '{"summary":"s","characters":[{"name":"An","gender":"male"}],"terms":[]}';
    assert.equal(parseBible(json).summary, "s");
    assert.equal(parseBible("```json\n" + json + "\n```").characters?.[0]?.name, "An");
  });

  it("JSON hỏng hoặc không phải đối tượng thì ném lỗi, không trả giá trị rỗng", () => {
    assert.throws(() => parseBible("không phải json"));
    assert.throws(() => parseBible(""));
    assert.throws(() => parseBible("null"), /không phải đối tượng/);
    assert.throws(() => parseBible("[1,2]"), /không phải đối tượng/);
  });
});
