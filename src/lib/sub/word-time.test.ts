import assert from "node:assert/strict";
import { test } from "node:test";
import { refineTimes } from "./word-time.ts";
import { acceptSegment } from "./text.ts";
import { ingestAsrPart } from "./diagnostics.ts";
import type { Seg } from "./types.ts";

test("mốc câu đầu dời theo từ đầu tiên, không kéo ra ngoài", () => {
  const words = [{ word: "Don't", start: 0.7, end: 1.0 }, { word: "spill", start: 1.0, end: 1.4 }, { word: "x", start: 3.5, end: 3.9 }];
  assert.deepEqual(refineTimes(0, 2.68, words), { start: 0.7, end: 1.4 });
  assert.deepEqual(refineTimes(0, 2.68, []), { start: 0, end: 2.68 });
  assert.deepEqual(refineTimes(0, 2.68, [{ word: "a", start: 9, end: 9.5 }]), { start: 0, end: 2.68 });
});

test("ingestAsrPart dùng mốc từ cho câu đầu phần khó", () => {
  const segs: Seg[] = [];
  ingestAsrPart({
    partIndex: 0,
    chunkStart: 15,
    chunkEnd: 30,
    requestedLanguage: "en",
    result: {
      segments: [{ text: "Don't spill the beans yet.", start: 0, end: 3.36, no_speech_prob: 0.05, avg_logprob: -0.2, compression_ratio: 1.2 }],
      words: [{ word: "Don't", start: 1.4, end: 1.7 }, { word: "yet.", start: 3.0, end: 3.36 }],
    },
    segs,
    overlapGate: false,
  });
  assert.equal(segs.length, 1);
  assert.ok(Math.abs(segs[0].start - 16.4) < 1e-6);
});

test("câu cảm ơn đã xem kéo dài cả đoạn bị loại, thoại lặp thật được giữ", () => {
  const segs: Seg[] = [];
  const good = { no_speech_prob: 0.05, avg_logprob: -0.1, compression_ratio: 1.1 };
  const r = acceptSegment(segs, 15.7, 0, 14, "Thank you for watching.", 1, good, null, false);
  assert.equal(r.reason, "hallucination");
  const a = acceptSegment(segs, 0, 0, 2.7, "Keep it that way.", 0, good, null, false);
  const b = acceptSegment(segs, 15.7, 0, 2.7, "Keep it that way.", 1, good, null, false);
  assert.ok(a.accepted && b.accepted);
});
