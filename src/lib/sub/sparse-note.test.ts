import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sparseSpeechNote } from "./sparse-note.ts";

const seg = (start: number, end: number, original: string) => ({ start, end, original });

describe("sparseSpeechNote", () => {
  it("báo khi clip 34 giây chỉ ra 2 câu thưa (số đo thật của clip Tiểu hòa thượng)", () => {
    const note = sparseSpeechNote({
      lang: "zh",
      seconds: 34,
      segs: [seg(0, 29.98, "词曲 李宗盛"), seg(30, 32.64, "谁就也会让你失望后天")],
    });
    assert.match(note, /sót lời/);
  });

  it("không báo khi lời đủ dày (11 câu, khoảng 4 chữ/giây)", () => {
    const segs = Array.from({ length: 11 }, (_, i) => seg(i * 3, i * 3 + 2.8, "师父如果一件事说了很多遍对"));
    assert.equal(sparseSpeechNote({ lang: "zh", seconds: 34, segs }), "");
  });

  it("không báo với video ngắn hơn 20 giây", () => {
    assert.equal(sparseSpeechNote({ lang: "zh", seconds: 12, segs: [seg(0, 11, "好")] }), "");
  });

  it("bỏ qua ngôn ngữ không đo (vi, auto) và danh sách rỗng", () => {
    assert.equal(sparseSpeechNote({ lang: "vi", seconds: 60, segs: [seg(0, 50, "a")] }), "");
    assert.equal(sparseSpeechNote({ lang: "zh", seconds: 60, segs: [] }), "");
  });

  it("ưu tiên chữ thô (raw) khi có, và không đụng tới câu bịa hay lệch ngôn ngữ", () => {
    const segs = Array.from({ length: 12 }, (_, i) => ({ start: i * 5, end: i * 5 + 4.5, raw: "我们今天去公园玩好不好呀", original: "x" }));
    assert.equal(sparseSpeechNote({ lang: "zh", seconds: 60, segs }), "");
  });

  it("tiếng Anh ngưỡng 6 chữ/giây: thoại thưa 30 giây bị báo, thoại bình thường thì không", () => {
    assert.match(sparseSpeechNote({ lang: "en", seconds: 30, segs: [seg(0, 29, "hello there")] }), /sót lời/);
    const dense = Array.from({ length: 10 }, (_, i) => seg(i * 3, i * 3 + 2.9, "this is a normal sentence in the film"));
    assert.equal(sparseSpeechNote({ lang: "en", seconds: 30, segs: dense }), "");
  });
});
