import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { checkPolishPrompts, cleanPolishPrompt, describePolishPrompts, effectiveGenrePolish, parsePolishPrompts, polishPromptGenres } from "./polish-prompts.ts";
import { GENRE_PROMPT_MAX, genrePrompt } from "./sub/genre-prompts.ts";
import { polishSystem } from "./sub/polish.ts";

describe("lệnh trau chuốt Admin sửa theo thể loại", () => {
  it("không có bản sửa thì dùng mặc định trong code; có thì dùng bản sửa", () => {
    assert.equal(effectiveGenrePolish("wuxia", {}), genrePrompt("wuxia").polish);
    assert.equal(effectiveGenrePolish("wuxia", { wuxia: "Use classical martial-arts tone." }), "Use classical martial-arts tone.");
    assert.equal(effectiveGenrePolish("wuxia", null), genrePrompt("wuxia").polish);
  });

  it("đọc kho: thể loại lạ, dữ liệu hỏng, chữ trống đều bỏ qua", () => {
    assert.deepEqual(parsePolishPrompts(null), {});
    assert.deepEqual(parsePolishPrompts("không phải json"), {});
    assert.deepEqual(parsePolishPrompts(JSON.stringify({ wuxia: "A", la: "B", auto: "  " })), { wuxia: "A" });
  });

  it("kiểm dữ liệu gửi lên: chặn thể loại lạ, chặn quá dài, chữ trống là về mặc định", () => {
    assert.throws(() => checkPolishPrompts({ la: "x" }), /không có trong ô chọn/);
    assert.throws(() => checkPolishPrompts({ wuxia: "x".repeat(GENRE_PROMPT_MAX + 1) }), /quá dài/);
    assert.throws(() => checkPolishPrompts([]), /không đúng/);
    assert.deepEqual(checkPolishPrompts({ wuxia: "  ", auto: "Keep it casual." }), { auto: "Keep it casual." });
    assert.ok(polishPromptGenres().includes("auto"));
  });

  it("gọn chữ: bỏ ký tự điều khiển, giữ xuống dòng", () => {
    assert.equal(cleanPolishPrompt("a\u0007b\nc"), "a b\nc");
  });

  it("bản sửa thay đúng phần giọng văn; phần khung cố định vẫn ở cuối lệnh", () => {
    const sys = polishSystem(2, { genre: "wuxia", context: "", language: "Vietnamese", genreText: "CUSTOM STYLE LINE" });
    assert.match(sys, /CUSTOM STYLE LINE/);
    assert.ok(!sys.includes(genrePrompt("wuxia").polish));
    assert.match(sys, /Keep the meaning/);
    assert.ok(sys.trimEnd().endsWith('with exactly 2 strings in the same order as "lines".'));
  });

  it("nhật ký ghi thể loại nào đổi, không chép nguyên lệnh", () => {
    const note = describePolishPrompts({}, { wuxia: "Secret style text" });
    assert.match(note, /sửa/);
    assert.doesNotMatch(note, /Secret style text/);
    assert.match(describePolishPrompts({ wuxia: "x" }, {}), /về mặc định/);
  });

  it("khung trau chuốt đọc lệnh Admin trước khi ước giá, Admin lưu được ở Cấu hình → Gói", () => {
    const hook = readFileSync(new URL("../components/use-polish.ts", import.meta.url), "utf8");
    assert.match(hook, /promptsRef\.current = await getPolishPrompts\(\)[\s\S]{0,80}const built = build\(\);/);
    const config = readFileSync(new URL("../components/admin-config.tsx", import.meta.url), "utf8");
    assert.match(config, /<PolishPromptBoard \/>/);
    const room = readFileSync(new URL("./polish-room.ts", import.meta.url), "utf8");
    assert.match(room, /savePolishPrompts[\s\S]{0,300}requireRole\(context\.userId, "chu"\)/);
  });
});
