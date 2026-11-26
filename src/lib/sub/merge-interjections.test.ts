import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeInterjections } from "./merge-interjections.ts";

const L = (start: number, end: number, text: string) => ({ text, start, end });

test("gộp cảm thán lặp sát nhau, giữ câu có nội dung và cảm thán cách xa", () => {
  const out = mergeInterjections([
    L(589.04, 589.29, "え、"), L(589.29, 589.55, "え、"), L(589.55, 589.8, "え、"), L(589.8, 590.05, "え、"), L(590.05, 590.31, "え、"), L(590.31, 590.43, "え"),
    L(14, 15, "遅れそう？"), L(16, 17, "遅れそう？"), L(30, 31, "あー、"), L(31.5, 32, "あー、"),
    L(40, 41, "やわらかい、"), L(41.2, 42, "やわらかい"), L(50, 51, "はい"), L(51.2, 52, "はい"), L(60, 61, "あー、"), L(65, 66, "あー"),
  ]);
  assert.deepEqual(out.map((l) => [l.start, l.end, l.text]), [
    [589.04, 590.43, "え、え、え…"], [14, 15, "遅れそう？"], [16, 17, "遅れそう？"], [30, 32, "あー、あー"],
    [40, 41, "やわらかい、"], [41.2, 42, "やわらかい"], [50, 51, "はい"], [51.2, 52, "はい"], [60, 61, "あー、"], [65, 66, "あー"],
  ]);
});

test("tiếng Hàn, Anh cũng gộp; danh sách rỗng giữ rỗng", () => {
  assert.deepEqual(mergeInterjections([L(0, 0.5, "아"), L(0.6, 1, "아")]).map((l) => l.text), ["아, 아"]);
  assert.deepEqual(mergeInterjections([L(0, 0.5, "Oh!"), L(0.6, 1, "oh")]).length, 1);
  assert.deepEqual(mergeInterjections([]), []);
});
