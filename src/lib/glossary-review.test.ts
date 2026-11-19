import assert from "node:assert/strict";
import test from "node:test";
import { cleanReviewFilter, emptyGenres, reviewFilterValue, statLine, summarizeStats, type StatRow } from "./glossary-review.ts";

const labels = { auto: "Tự động", wuxia: "Kiếm hiệp", xianxia: "Tiên hiệp", comedy: "Hài" };
const rows: StatRow[] = [
  { lang: "zh", genre: "wuxia", total: 40, reviewed: 10, hidden: 2 },
  { lang: "zh", genre: "auto", total: 100, reviewed: 100, hidden: 0 },
  { lang: "ko", genre: "comedy", total: 5, reviewed: 0, hidden: 0 },
];

test("cleanReviewFilter chỉ nhận giá trị hợp lệ", () => {
  assert.equal(cleanReviewFilter("draft"), "draft");
  assert.equal(cleanReviewFilter("reviewed"), "reviewed");
  assert.equal(cleanReviewFilter("x"), "all");
  assert.equal(cleanReviewFilter(undefined), "all");
});

test("reviewFilterValue đổi sang điều kiện SQL", () => {
  assert.equal(reviewFilterValue("all"), null);
  assert.equal(reviewFilterValue("reviewed"), true);
  assert.equal(reviewFilterValue("draft"), false);
});

test("summarizeStats gộp theo ngôn ngữ, đếm chưa duyệt, sắp nhiều mục trước", () => {
  const out = summarizeStats(rows, labels);
  assert.deepEqual(out.map((l) => l.lang), ["ko", "zh"]);
  const zh = out[1];
  assert.equal(zh.total, 140);
  assert.equal(zh.reviewed, 110);
  assert.equal(zh.draft, 30);
  assert.deepEqual(zh.genres.map((g) => g.genre), ["auto", "wuxia"]);
  assert.equal(zh.genres[1].label, "Kiếm hiệp");
  assert.equal(zh.genres[1].draft, 30);
  assert.equal(out[0].genres[0].draft, 5);
});

test("summarizeStats chịu số lạ (âm, vượt tổng) và thể loại không có nhãn", () => {
  const out = summarizeStats([{ lang: "en", genre: "lạ", total: 3, reviewed: 9, hidden: -1 }], labels);
  assert.equal(out[0].genres[0].reviewed, 3);
  assert.equal(out[0].genres[0].draft, 0);
  assert.equal(out[0].genres[0].hidden, 0);
  assert.equal(out[0].genres[0].label, "lạ");
});

test("emptyGenres liệt kê thể loại chưa có mục nào của một ngôn ngữ", () => {
  assert.deepEqual(emptyGenres(rows, "zh", labels), ["xianxia", "comedy"]);
  assert.deepEqual(emptyGenres(rows, "ja", labels), ["auto", "wuxia", "xianxia", "comedy"]);
});

test("statLine", () => {
  assert.equal(statLine(0, 0), "Chưa có mục nào.");
  assert.equal(statLine(320, 300), "320 mục: 300 đã duyệt, 20 chưa duyệt.");
});
