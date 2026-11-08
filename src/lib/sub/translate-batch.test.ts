import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyIndexTranslations,
  blankTranslationIndexes,
  contiguousRuns,
  cueText,
  findCueIndex,
  optsForRange,
  parseTranslations,
  toSrt,
  untranslated,
} from "./text.ts";
import type { Seg } from "./types.ts";

describe("parseTranslations bắt đúng số câu", () => {
  it("thiếu câu thì lỗi cả lần gọi để dịch lại, không gắn lệch hàng", () => {
    assert.throws(() => parseTranslations(JSON.stringify({ t: ["một", "hai", "ba", "bốn", "năm", "sáu"] }), 8), /thiếu câu/);
  });

  it("ô không phải chuỗi là câu lỗi, các câu khác giữ nguyên", () => {
    const lines = parseTranslations(JSON.stringify({ t: ["một", 2, "ba"] }), 3);
    assert.deepEqual(lines, ["một", "", "ba"]);
    assert.deepEqual(blankTranslationIndexes(lines), [1]);
  });

  it("dài hơn số câu thì cũng lỗi, không cắt lấy phần đầu", () => {
    assert.throws(() => parseTranslations(JSON.stringify({ t: ["một", "hai", "ba"] }), 2), /thiếu câu/);
  });

  it("JSON hỏng hoặc không có mảng vẫn lỗi cả lần gọi", () => {
    assert.throws(() => parseTranslations("không phải json", 3), /JSON không hợp lệ/);
    assert.throws(() => parseTranslations(JSON.stringify({ t: "một" }), 1), /không đúng định dạng/);
  });
});

describe("chỉ dịch lại câu lỗi", () => {
  it("batch 8 câu chỉ chọn 2 câu trống, 6 câu đã dịch không bị ghi đè", () => {
    const full = ["Một.", "Hai.", "Ba.", "Bốn.", "Năm.", "Sáu.", "", "  "];
    const indexes = blankTranslationIndexes(full);
    assert.deepEqual(indexes, [6, 7]);
    assert.equal(indexes.length, 2);
    const merged = applyIndexTranslations(full, indexes, ["Bảy.", "Tám."]);
    assert.deepEqual(merged.slice(0, 6), full.slice(0, 6));
    assert.deepEqual(merged.slice(6), ["Bảy.", "Tám."]);
    const still = applyIndexTranslations(full, indexes, ["", ""]);
    assert.deepEqual(still, full);
  });

  it("câu lỗi không liền nhau thì tách cụm, không gộp thành một batch cả 8", () => {
    assert.deepEqual(contiguousRuns([6, 7]), [[6, 7]]);
    assert.deepEqual(contiguousRuns([1, 4, 5]), [[1], [4, 5]]);
  });

  it("cắt batch vẫn giữ addressLock/bible và thêm câu xung quanh vào ctx", () => {
    const opts = optsForRange(
      { genre: "daily", context: "LOCK\nbible", ctx: ["câu trước"], nxt: ["câu sau batch"], fix: true },
      ["một", "hai", "ba", "bốn"],
      2,
      4,
      ["Một", "Hai", "", ""],
    );
    assert.equal(opts.context, "LOCK\nbible");
    assert.equal(opts.fix, true);
    assert.equal(opts.genre, "daily");
    assert.deepEqual(opts.ctx, ["câu trước", { o: "một", t: "Một" }, { o: "hai", t: "Hai" }]);
    assert.deepEqual(opts.nxt, ["câu sau batch"]);
  });
});

describe("câu lỗi không hiện như bản dịch", () => {
  it("cue trống khi lỗi hoặc chưa dịch, SRT không lấy câu gốc làm bản dịch", () => {
    const failed: Seg = { start: 1, end: 2, original: "こんにちは", translation: "", translationFailed: true };
    assert.equal(cueText(failed), "");
    assert.match(toSrt([failed]), /không dịch được/);
    const waiting: Seg = { start: 3, end: 4, original: "好的", translation: null };
    assert.equal(cueText(waiting), "");
    assert.match(toSrt([waiting]), /\[chưa dịch\] 好的/);
  });

  it("câu gốc ngắn trả lại nguyên văn thì vẫn là chưa dịch, tên riêng Latin thì giữ", () => {
    assert.equal(untranslated("好的", "好的"), true);
    assert.equal(untranslated("不行", "不行"), true);
    assert.equal(untranslated("うん", "うん"), true);
    assert.equal(untranslated("OK", "OK"), false);
    assert.equal(untranslated("Max", "Max"), false);
    assert.equal(untranslated("你好", "xin chào"), false);
  });

  it("câu dài vẫn hiện khi có nhiều câu ngắn đã kết thúc", () => {
    const items: Seg[] = [
      { start: 0, end: 12, original: "dài", translation: "dài" },
      { start: 1, end: 1.4, original: "a", translation: "a" },
      { start: 2, end: 2.4, original: "b", translation: "b" },
      { start: 3, end: 3.4, original: "c", translation: "c" },
      { start: 4, end: 4.4, original: "d", translation: "d" },
      { start: 5, end: 5.4, original: "e", translation: "e" },
    ];
    assert.equal(findCueIndex(items, 6), 0);
  });
});
