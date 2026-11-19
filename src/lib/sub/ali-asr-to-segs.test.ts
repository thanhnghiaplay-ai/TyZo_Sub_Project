import test from "node:test";
import assert from "node:assert/strict";
import { segsFromAli } from "./ali-asr-to-segs.ts";
import { sentencesFromTranscript } from "./ali-filetrans.ts";

test("mốc giây của câu Alibaba giữ nguyên, không bị chia 1000 lần nữa", () => {
  const segs = segsFromAli([
    { start: 12.5, end: 15.25, text: "你好" },
    { start: 0.5, end: 2, text: "师父" },
  ]);
  assert.deepEqual(segs.map((s) => [s.start, s.end, s.original]), [
    [0.5, 2, "师父"],
    [12.5, 15.25, "你好"],
  ]);
});

test("từ JSON Alibaba (mili-giây) đến Seg: mốc đúng theo giây", () => {
  const parsed = sentencesFromTranscript({
    transcripts: [{ sentences: [{ begin_time: 10000, end_time: 12000, text: "你好" }] }],
  });
  const segs = segsFromAli(parsed.sentences);
  assert.equal(segs[0].start, 10);
  assert.equal(segs[0].end, 12);
});

test("bỏ câu rỗng, ép cuối câu lớn hơn đầu câu", () => {
  const segs = segsFromAli([
    { start: 3, end: 3, text: "好" },
    { start: 4, end: 5, text: "  " },
  ]);
  assert.equal(segs.length, 1);
  assert.ok(segs[0].end > segs[0].start);
});
