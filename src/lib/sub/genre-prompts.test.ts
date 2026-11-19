import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GENRE_LABELS, glossaryPair } from "../glossary-share.ts";
import { GENRES } from "../home-state.ts";
import {
  FALLBACK_GENRE_PROMPT,
  GENRE_PROMPT_MAX,
  GENRE_PROMPTS,
  genreHint,
  genrePrompt,
  hasGenrePrompt,
} from "./genre-prompts.ts";

const OLD_HINTED = new Set([
  "action", "adventure", "crime", "scifi", "horror", "romance", "psychological", "comedy", "costume",
  "historical", "mystery", "sports", "adult", "sex", "series", "daily",
]);

describe("kho prompt theo thể loại", () => {
  it("mọi thể loại trong ô chọn đều có prompt riêng", () => {
    for (const [id] of GENRES) {
      assert.ok(hasGenrePrompt(id), `thiếu prompt cho thể loại ${id}`);
      assert.notEqual(genrePrompt(id), FALLBACK_GENRE_PROMPT, `${id} đang rơi về dự phòng`);
    }
  });

  it("không có prompt cho thể loại không còn trong ô chọn", () => {
    const ids = new Set(GENRES.map(([id]) => id));
    for (const id of Object.keys(GENRE_PROMPTS)) assert.ok(ids.has(id), `${id} có prompt nhưng không có trong ô chọn`);
  });

  it("độ dài nằm trong giới hạn và không rỗng", () => {
    for (const [id, p] of Object.entries(GENRE_PROMPTS)) {
      assert.ok(p.polish.trim().length > 80, `${id}: prompt quá ngắn`);
      assert.ok(p.polish.length <= GENRE_PROMPT_MAX, `${id}: prompt dài ${p.polish.length} > ${GENRE_PROMPT_MAX}`);
      assert.ok(p.label.trim().length > 0, `${id}: thiếu tên hiển thị`);
      if (p.hint) assert.ok(p.hint.length <= 300, `${id}: gợi ý quá dài`);
    }
    assert.ok(FALLBACK_GENRE_PROMPT.polish.length <= GENRE_PROMPT_MAX);
  });

  it("tên hiển thị khớp với ô chọn", () => {
    for (const [id, label] of GENRES) {
      assert.equal(GENRE_PROMPTS[id].label, label);
      assert.equal(GENRE_LABELS[id], label);
    }
  });

  it("thể loại lạ, rỗng hoặc viết hoa rơi về dự phòng hoặc khớp đúng", () => {
    assert.equal(genrePrompt("khong-co"), FALLBACK_GENRE_PROMPT);
    assert.equal(genrePrompt(""), FALLBACK_GENRE_PROMPT);
    assert.equal(genrePrompt("toString"), FALLBACK_GENRE_PROMPT);
    assert.equal(hasGenrePrompt("constructor"), false);
    assert.equal(genrePrompt("  WUXIA "), GENRE_PROMPTS.wuxia);
  });

  it("thể loại mới có gợi ý cho bước dịch, thể loại cũ giữ gợi ý ở text.ts", () => {
    for (const [id] of GENRES) {
      if (OLD_HINTED.has(id) || id === "auto") assert.equal(genreHint(id), "", `${id} không nên có gợi ý trùng`);
      else assert.ok(genreHint(id).length > 20, `${id} thiếu gợi ý cho bước dịch`);
    }
    assert.equal(genreHint("khong-co"), "");
  });

  it("thể loại 18+ dặn không kiểm duyệt hay làm nhẹ", () => {
    for (const id of ["adult", "sex", "softcore"]) assert.match(GENRE_PROMPTS[id].polish, /censor/i);
    for (const id of ["adult", "sex", "softcore"]) assert.match(GENRE_PROMPTS[id].polish, /soften/i);
  });

  it("thể loại cổ trang dặn xưng hô cổ, thể loại hằng ngày dặn xưng hô hiện đại", () => {
    for (const id of ["costume", "wuxia", "xianxia"]) assert.match(GENRE_PROMPTS[id].polish, /ta\/ngươi/);
    assert.match(GENRE_PROMPTS.daily.polish, /2020s/);
  });

  it("thể loại mới dùng được ở bộ thuật ngữ (không bị báo thể loại sai)", () => {
    for (const [id] of GENRES) assert.deepEqual(glossaryPair("ja", id), { lang: "ja", genre: id });
    assert.throws(() => glossaryPair("ja", "khong-co"));
  });
});
