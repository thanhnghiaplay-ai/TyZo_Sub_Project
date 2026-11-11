import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptSegment, toRawSrt, toSrt } from "./text.ts";
import type { Seg } from "./types.ts";

describe("bản Whisper gốc", () => {
  it("acceptSegment ghi chữ gốc vào raw", () => {
    const segs: Seg[] = [];
    const result = acceptSegment(segs, 0, 1, 3, " Hello there, my friend. ", 0);
    assert.equal(result.accepted, true);
    assert.equal(segs[0].raw, "Hello there, my friend.");
  });

  it("sửa tên kiểu phân tích phim đổi original nhưng không đổi raw", () => {
    const segs: Seg[] = [];
    acceptSegment(segs, 0, 1, 3, "Hey Jon, come here.", 0);
    // Giống applyNameFixes trong groq.ts: chỉ sửa original.
    segs[0].original = segs[0].original.replace("Jon", "John");
    assert.equal(segs[0].original, "Hey John, come here.");
    assert.equal(segs[0].raw, "Hey Jon, come here.");
    assert.match(toRawSrt(segs), /Hey Jon, come here\./);
  });

  it("SRT gốc có giờ, không lấy bản dịch, bản lưu cũ không có raw thì dùng original", () => {
    const withRaw: Seg = { start: 1, end: 2.5, original: "Hey John", raw: "Hey Jon", translation: "Này John" };
    const old: Seg = { start: 4, end: 5, original: "Old line", translation: "Câu cũ" };
    const out = toRawSrt([withRaw, old]);
    assert.equal(out, "1\n00:00:01,000 --> 00:00:02,500\nHey Jon\n\n2\n00:00:04,000 --> 00:00:05,000\nOld line\n");
    assert.doesNotMatch(out, /Này John|Câu cũ/);
    assert.match(toSrt([withRaw]), /Này John/);
  });
});
