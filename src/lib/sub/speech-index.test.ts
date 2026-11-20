import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Seg } from "./types.ts";
import { speechIndex } from "./text.ts";

const cues = [{ start: 10, end: 10.8 } as Seg];

describe("speechIndex", () => {
  it("câu ngắn vẫn đọc khi chờ sau", () => {
    assert.equal(speechIndex(cues, 11, 1), 0);
  });

  it("đọc trước 0,5 giây", () => {
    assert.equal(speechIndex(cues, 9.6, -0.5), 0);
  });

  it("đúng lúc thì chưa đọc trước câu", () => {
    assert.equal(speechIndex(cues, 9.6, 0), -1);
  });

  it("không đọc vào khoảng im giữa các từ", () => {
    const withTalk = [{ start: 10, end: 14, talk: [[10, 10.4], [12.2, 12.8]] } as Seg];
    assert.equal(speechIndex(withTalk, 10.2, 0), 0);
    assert.equal(speechIndex(withTalk, 11.2, 0), -1);
    assert.equal(speechIndex(withTalk, 12.4, 0), 0);
  });
});
