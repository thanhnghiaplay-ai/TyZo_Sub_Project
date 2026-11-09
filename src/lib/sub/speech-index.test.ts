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
});
