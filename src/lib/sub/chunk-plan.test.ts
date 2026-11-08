import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunkOverlapsPrevious, chunksFromSpans, energyThreshold, spansFromEnergy } from "./chunk-plan.ts";

describe("cắt theo khoảng ngừng", () => {
  it("hai đoạn cách xa thành hai phần, không còn một khối 60 giây", () => {
    const spans = spansFromEnergy([0.1, 0.1, 0, 0, 0, 0.1]);
    assert.equal(spans.length, 2);
    const chunks = chunksFromSpans(spans, 6);
    assert.equal(chunks.length, 2);
    assert.ok(chunks[0][1] < 3);
    assert.ok(chunks[1][0] > 4);
    assert.equal(chunkOverlapsPrevious([[0, 100], [4000, 5000]], 1), false);
  });

  it("ngừng ngắn thì gộp, lời liền 90 giây thì cắt có chồng", () => {
    const close = chunksFromSpans(
      [
        { start: 0, end: 10 },
        { start: 11, end: 20 },
      ],
      20,
    );
    assert.equal(close.length, 1);
    const long = chunksFromSpans([{ start: 0, end: 90 }], 90);
    assert.equal(long.length, 2);
    assert.ok(long[1][0] < 60);
    assert.equal(chunkOverlapsPrevious([[0, 16000 * 60], [16000 * 58, 16000 * 90]], 1), true);
  });

  it("file nói nhỏ hơn mốc cố định vẫn có đoạn", () => {
    const levels = [0.001, 0.001, 0, 0, 0.0008];
    const spans = spansFromEnergy(levels, 1, energyThreshold(levels));
    assert.ok(spans.length >= 1);
  });
});
