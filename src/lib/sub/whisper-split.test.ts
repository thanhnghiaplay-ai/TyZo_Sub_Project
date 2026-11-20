import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitLongSegment } from "./whisper-split.ts";
import { ingestAsrPart } from "./diagnostics.ts";
import type { Seg } from "./types.ts";

const strip = (text: string) => text.replace(/[\s，,。.！!？?；;…、:："“”"'‘’()（）\-—]/g, "");

/** Mỗi chữ Hán một «từ» 0,25 giây, như Whisper trả mốc từ cho tiếng Trung. */
function charWords(text: string, from: number, step = 0.25) {
  const words: Array<{ word: string; start: number; end: number }> = [];
  let t = from;
  for (const ch of strip(text)) {
    words.push({ word: ch, start: t, end: t + step });
    t += step;
  }
  return words;
}

const ZH =
  "小和尚，你为什么哭啊？师父，我的糖被人偷走了。别难过，我们再去买一些吧。好的，谢谢师父，我们走吧！";

describe("splitLongSegment", () => {
  it("segment ngắn giữ nguyên một mảnh", () => {
    const one = splitLongSegment("Hello, how are you today?", 1, 3.5);
    assert.deepEqual(one, [{ start: 1, end: 3.5, text: "Hello, how are you today?" }]);
    const zh = splitLongSegment("你好，今天怎么样？", 0, 2);
    assert.equal(zh.length, 1);
  });

  it("tiếng Trung liền mạch: một segment dài thành từng câu, mốc theo từ, không mất chữ", () => {
    const words = charWords(ZH, 1);
    const end = 1 + words.length * 0.25;
    const pieces = splitLongSegment(ZH, 0, end, words);
    assert.ok(pieces.length >= 3, `chỉ ${pieces.length} mảnh`);
    assert.equal(strip(pieces.map((p) => p.text).join("")), strip(ZH));
    for (const p of pieces) assert.match(p.text, /[。！？]$/, `«${p.text}» không kết thúc ở dấu câu`);
    // Mảnh đầu bắt đầu ở từ đầu tiên (1 giây), không phải mốc 0 của segment.
    assert.ok(Math.abs(pieces[0].start - 1) < 1e-6);
    for (let i = 0; i < pieces.length; i++) {
      assert.ok(pieces[i].end > pieces[i].start);
      assert.ok(pieces[i].end <= end + 0.25);
      if (i) assert.ok(pieces[i].start >= pieces[i - 1].end - 1e-9, "mảnh chồng nhau");
    }
  });

  it("segment ngắn dưới 30 chữ mà có 2 câu cũng được tách (Whisper hay gộp 2 đến 4 câu thành 1 segment)", () => {
    const two = "小和尚你为什么哭啊？师父我的糖被人偷走了。";
    assert.ok(strip(two).length < 30);
    const words = charWords(two, 2, 0.2);
    const pieces = splitLongSegment(two, 0, 2 + words.length * 0.2, words);
    assert.equal(pieces.length, 2);
    assert.equal(pieces[0].text, "小和尚你为什么哭啊？");
    assert.equal(pieces[1].text, "师父我的糖被人偷走了。");
    assert.ok(pieces[1].start >= pieces[0].end - 1e-9);
    // Một câu đơn dài 12 chữ vẫn nguyên một dòng.
    assert.equal(splitLongSegment("师父我的糖被人偷走了。", 0, 3).length, 1);
  });

  it("không có mốc từ thì chia theo số chữ, vẫn tăng dần và nằm trong segment", () => {
    const pieces = splitLongSegment(ZH, 10, 20);
    assert.ok(pieces.length >= 3);
    assert.ok(pieces[0].start >= 10);
    assert.ok(pieces[pieces.length - 1].end <= 20 + 1e-9);
    for (let i = 1; i < pieces.length; i++) assert.ok(pieces[i].start >= pieces[i - 1].end - 1e-9);
  });

  it("mốc từ lệch hẳn với chữ thì quay về chia theo số chữ", () => {
    const pieces = splitLongSegment(ZH, 0, 12, [{ word: "x", start: 0, end: 1 }, { word: "y", start: 1, end: 2 }]);
    assert.ok(pieces.length >= 3);
    assert.ok(pieces[pieces.length - 1].end <= 12 + 1e-9);
  });

  it("không có dấu câu mà quá dài thì tách đều để khỏi thành một dòng dài", () => {
    const flat = strip(ZH).repeat(2);
    assert.ok(flat.length > 40);
    const pieces = splitLongSegment(flat, 0, 16);
    assert.ok(pieces.length >= 3, `chỉ ${pieces.length} mảnh`);
    assert.equal(pieces.map((p) => p.text).join(""), flat);
    for (const p of pieces) assert.ok(strip(p.text).length <= 28, "mảnh vẫn quá dài");
    // Đúng 28 chữ không dấu vẫn giữ một dòng (chưa tới ngưỡng tách cứng), 29 chữ thì tách.
    assert.equal(splitLongSegment(strip(ZH).slice(0, 28), 0, 6).length, 1);
    assert.ok(splitLongSegment(strip(ZH).slice(0, 29), 0, 6).length >= 2);
  });

  it("tiếng Anh dài tách theo câu, số thập phân không bị cắt đôi", () => {
    const en =
      "The rate rose to 3.5 percent in March after a long and slow recovery across the region. Nobody expected that result at all. We will see what happens next quarter, but the outlook is good.";
    const pieces = splitLongSegment(en, 0, 14);
    assert.ok(pieces.length >= 2);
    assert.ok(pieces.some((p) => p.text.includes("3.5 percent")));
    assert.equal(pieces.map((p) => p.text).join(" ").replace(/\s+/g, " "), en);
  });

  it("đầu vào hỏng thì trả lại nguyên", () => {
    assert.equal(splitLongSegment(ZH, NaN, 5).length, 1);
    assert.equal(splitLongSegment(ZH, 5, 5).length, 1);
  });
});

describe("ingestAsrPart tách câu dài của Whisper", () => {
  it("3 segment dài liền mạch (như video Tiểu hòa thượng) thành nhiều câu phụ đề", () => {
    const parts = [ZH, ZH, ZH];
    const segments = parts.map((text, i) => ({
      text,
      start: i * 12,
      end: i * 12 + 11.5,
      no_speech_prob: 0.02,
      avg_logprob: -0.15,
      compression_ratio: 1.1,
    }));
    const words = parts.flatMap((text, i) => charWords(text, i * 12 + 0.4, 0.2));
    const segs: Seg[] = [];
    ingestAsrPart({
      partIndex: 0,
      chunkStart: 0,
      chunkEnd: 36,
      requestedLanguage: "zh",
      result: { language: "chinese", segments, words },
      segs,
      overlapGate: false,
    });
    assert.ok(segs.length >= 9, `chỉ ${segs.length} câu`);
    for (let i = 1; i < segs.length; i++) assert.ok(segs[i].start >= segs[i - 1].start);
  });

  it("segment ngắn không bị đổi: vẫn một câu, mốc theo từ đầu", () => {
    const segs: Seg[] = [];
    ingestAsrPart({
      partIndex: 0,
      chunkStart: 0,
      chunkEnd: 15,
      requestedLanguage: "en",
      result: {
        segments: [{ text: "Don't spill the beans yet.", start: 0, end: 3.36, no_speech_prob: 0.05, avg_logprob: -0.2, compression_ratio: 1.2 }],
        words: [{ word: "Don't", start: 1.4, end: 1.7 }, { word: "yet.", start: 3.0, end: 3.36 }],
      },
      segs,
      overlapGate: false,
    });
    assert.equal(segs.length, 1);
    assert.ok(Math.abs(segs[0].start - 1.4) < 1e-6);
  });
});
