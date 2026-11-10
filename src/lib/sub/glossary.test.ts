import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  findMatches,
  glossaryTarget,
  hasLeftoverPlaceholder,
  restoreTerms,
  settleGlossaryLines,
  stripLeftoverPlaceholders,
} from "./glossary.ts";
import { translationMessages } from "./text.ts";

const map = new Map<string, string>([["{{G0}}", "hiện trường"]]);

describe("glossaryTarget", () => {
  const term = {
    source: "然后",
    target: "rồi sau đó",
    renders: { vi: "rồi sau đó", ko: "그리고 나서", ja: "それから", en: "then" },
  };

  it("chọn đúng ngôn ngữ đích, ngôn ngữ khác thì dùng bản dự phòng", () => {
    assert.equal(glossaryTarget(term, "Vietnamese"), "rồi sau đó");
    assert.equal(glossaryTarget(term, "Korean"), "그리고 나서");
    assert.equal(glossaryTarget(term, "Japanese"), "それから");
    assert.equal(glossaryTarget(term, "English"), "then");
    assert.equal(glossaryTarget(term, "French"), "rồi sau đó");
    assert.equal(glossaryTarget({ source: "然后", target: "rồi" }, "Korean"), "rồi");
  });
});

describe("thuật ngữ Sex theo ngôn ngữ nguồn", () => {
  it("Anh, Hàn, Nhật có bản Sex dịch sang tiếng Việt", () => {
    for (const lang of ["en", "ja", "ko"] as const) {
      const terms = JSON.parse(readFileSync(new URL(`../../../data/glossaries/${lang}/sex.json`, import.meta.url), "utf8"));
      assert.ok(terms.length >= 90, lang);
      assert.ok(terms.every((term: { source: string; target: string }) => term.source.length >= 2 && term.target));
    }
    const en = JSON.parse(readFileSync(new URL("../../../data/glossaries/en/sex.json", import.meta.url), "utf8"));
    assert.equal(en.find((term: { source: string }) => term.source === "orgasm").target, "lên đỉnh");
    assert.equal(en.find((term: { source: string }) => term.source === "cum").target, "lên đỉnh");
    for (const lang of ["en", "ja", "ko"] as const) {
      const auto = JSON.parse(readFileSync(new URL(`../../../data/glossaries/${lang}/auto.json`, import.meta.url), "utf8"));
      assert.ok(auto.length >= 30, lang);
    }
    const action = JSON.parse(readFileSync(new URL("../../../data/glossaries/en/action.json", import.meta.url), "utf8"));
    assert.equal(action.find((term: { source: string }) => term.source === "copy that").target, "đã rõ");
    assert.equal(action.find((term: { source: string }) => term.source === "make a move").target, "ra tay");
    assert.ok(action.length >= 60);
  });
});

describe("từ một ký tự", () => {
  it("tiếng Trung giữ, tiếng Anh bỏ", () => {
    const zh = findMatches("朕知道", [{ source: "朕", target: "trẫm" }], "zh");
    assert.equal(zh.length, 1);
    assert.equal(zh[0]?.term.target, "trẫm");
    assert.equal(findMatches("I am here", [{ source: "I", target: "tôi" }], "en").length, 0);
  });
});

describe("restoreTerms", () => {
  it("giữ khoảng trắng quanh placeholder", () => {
    assert.equal(restoreTerms(["Anh ra {{G0}} ngay"], map)[0], "Anh ra hiện trường ngay");
    assert.equal(restoreTerms(["{{G0}} nhé"], map)[0], "hiện trường nhé");
    assert.equal(restoreTerms(["Tới {{G0}}, rồi đi"], map)[0], "Tới hiện trường, rồi đi");
    assert.equal(restoreTerms(["{{G0}}nhé"], map)[0], "hiện trườngnhé");
  });

  it("nhận biến thể LLM hay viết, không thêm khoảng trắng", () => {
    assert.equal(restoreTerms(["{{ G0 }}"], map)[0], "hiện trường");
    assert.equal(restoreTerms(["{{g0}}"], map)[0], "hiện trường");
    assert.equal(restoreTerms(["Đi tới {G0}"], map)[0], "Đi tới hiện trường");
    assert.equal(restoreTerms(["[[G0]]"], map)[0], "hiện trường");
    assert.equal(restoreTerms(["[[ G0 ]]"], map)[0], "hiện trường");
  });

  it("không nhầm G1 với G10", () => {
    const both = new Map<string, string>([
      ["{{G1}}", "một"],
      ["{{G10}}", "mười"],
    ]);
    assert.equal(restoreTerms(["{{G1}} {{G10}}"], both)[0], "một mười");
    assert.equal(restoreTerms(["{G1} [[G10]]"], both)[0], "một mười");
    assert.equal(restoreTerms(["{{G10}}"], both)[0], "mười");
    assert.equal(restoreTerms(["{{G1}}0"], both)[0], "một0");
    assert.equal(restoreTerms(["{{g10}}"], both)[0], "mười");
  });
});

describe("placeholder bị mất hoặc sót", () => {
  it("câu mất placeholder được đánh dấu dịch lại", () => {
    const settled = settleGlossaryLines(["Đi tới {{G0}}"], ["Đi tới"], map);
    assert.deepEqual(settled.retryIndexes, [0]);
    assert.equal(settled.lines[0], "Đi tới");
  });

  it("câu đã restore đúng thì không dịch lại", () => {
    const settled = settleGlossaryLines(["Anh ra {{G0}} ngay"], ["Anh ra {G0} ngay"], map);
    assert.deepEqual(settled.retryIndexes, []);
    assert.equal(settled.lines[0], "Anh ra hiện trường ngay");
  });

  it("token lạ còn sót thì đánh dấu dịch lại, và strip không để {{G lọt ra", () => {
    const settled = settleGlossaryLines(["Đi {{G0}}"], ["Đi {{G0}} {{G9}}"], map);
    assert.deepEqual(settled.retryIndexes, [0]);
    assert.equal(hasLeftoverPlaceholder(settled.lines[0]), true);
    const cleaned = stripLeftoverPlaceholders("Đi tới {G0} và {{G9}}");
    assert.equal(cleaned.includes("{{G"), false);
    assert.equal(cleaned.includes("{G"), false);
    assert.equal(cleaned, "Đi tới và");
  });
});

describe("prompt dịch", () => {
  it("dặn giữ nguyên token {{G<số>}}", () => {
    const messages = translationMessages(["Đi {{G0}}"], "Vietnamese", { genre: "auto", context: "" });
    const system = messages[0].content;
    assert.match(system, /\{\{G0\}\}/);
    assert.match(system, /\{\{G1\}\} is a different token from \{\{G10\}\}/);
    assert.match(system, /Do not translate, delete, reorder or change the digits/);
  });
});
