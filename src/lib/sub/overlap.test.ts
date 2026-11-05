import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OVERLAP_SECONDS, acceptSegment } from "./text.ts";
import type { Seg } from "./types.ts";

const chunkStart = 58;
const boundary = chunkStart + OVERLAP_SECONDS * 0.5;

function cue(start: number, end: number, text: string, translation: string | null = null): Seg {
  return { start, end, original: text, translation };
}

describe("câu ở vùng chồng hai đoạn", () => {
  it("mốc vẫn là giữa vùng chồng, không siết thêm", () => {
    assert.equal(OVERLAP_SECONDS, 2);
    assert.equal(boundary, 59);
  });

  it("câu nằm hẳn ở nửa đầu vùng chồng vẫn thuộc đoạn trước", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, chunkStart, 0.1, 0.5, "câu cũ", 1, {});
    assert.equal(decision.reason, "overlap");
    assert.equal(decision.start, 58.1);
    assert.ok(decision.start! < boundary);
    assert.equal((decision.start! + decision.end!) / 2 < boundary, true);
    assert.equal(segs.length, 0);
  });

  it("câu bắt đầu trước mốc 1 giây nhưng điểm giữa nằm ở đoạn sau thì được giữ", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, chunkStart, 0.2, 2.4, "Tôi đi về nhà", 1, {});
    assert.equal(decision.accepted, true);
    assert.equal(decision.reason, null);
    assert.equal(decision.start, 58.2);
    assert.ok(decision.start! < boundary);
    assert.ok((decision.start! + 60.4) / 2 >= boundary);
    assert.deepEqual(
      segs.map((seg) => seg.original),
      ["Tôi đi về nhà"],
    );
  });

  it("câu đã có ở đoạn trước không bị thêm lần nữa", () => {
    const segs = [cue(57.6, 60.1, "Tôi đi đây rồi", "Anh đi đây rồi")];
    const decision = acceptSegment(segs, chunkStart, 0.4, 2.2, "Tôi đi đây rồi", 1, {});
    assert.equal(decision.reason, "duplicate");
    assert.equal(segs.length, 1);
    assert.equal(segs[0].original, "Tôi đi đây rồi");
    assert.equal(segs[0].translation, "Anh đi đây rồi");
    assert.equal(segs[0].start, 57.6);
    assert.ok(segs[0].end >= 60.2);
  });

  it("câu đoạn sau dài hơn thì nối vào câu bị cắt, không tạo câu thứ hai", () => {
    const segs = [cue(57.8, 59.9, "Tôi đang đi", "Đang đi")];
    const decision = acceptSegment(segs, chunkStart, 0.3, 3, "Tôi đang đi về nhà", 1, {});
    assert.equal(decision.reason, "duplicate");
    assert.equal(segs.length, 1);
    assert.equal(segs[0].original, "Tôi đang đi về nhà");
    assert.equal(segs[0].translation, null);
    assert.equal(segs[0].start, 57.8);
    assert.ok(segs[0].end >= 61);
  });

  it("câu khác ở đoạn sau vẫn được giữ, câu trước không bị xóa", () => {
    const segs = [cue(56, 57.5, "Câu trước đó")];
    const decision = acceptSegment(segs, chunkStart, 0.4, 2.5, "Câu mới hoàn toàn", 1, {});
    assert.equal(decision.accepted, true);
    assert.deepEqual(
      segs.map((seg) => seg.original),
      ["Câu trước đó", "Câu mới hoàn toàn"],
    );
  });

  it("câu Trung ngắn bị cắt rồi dài hơn thì gộp, câu lặp sau đó vẫn giữ", () => {
    const segs = [cue(10, 11.2, "我知道")];
    const longer = acceptSegment(segs, 10, 0.2, 1.6, "我知道了", 0, {});
    assert.equal(longer.reason, "duplicate");
    assert.equal(segs.length, 1);
    assert.equal(segs[0].original, "我知道了");
    const again = acceptSegment(segs, 0, 13, 14, "我知道了", 0, {});
    assert.equal(again.accepted, true);
    assert.equal(segs.length, 2);
    const laterFirst = [cue(20, 21, "我知道了")];
    const earlier = acceptSegment(laterFirst, 0, 5, 6, "我知道了", 0, {});
    assert.equal(earlier.accepted, true);
    assert.equal(laterFirst.length, 2);
  });

  it("lời ngắn tự tin ở sau mốc vẫn giữ — không siết filter", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, chunkStart, 1.1, 1.5, "Ừ", 1, { no_speech_prob: 0.2, avg_logprob: -0.1 });
    assert.equal(decision.accepted, true);
    assert.equal(segs[0].original, "Ừ");
  });
});
