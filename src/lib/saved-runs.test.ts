import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SAVED_MAX, keysToDrop, savedSummary, snapshotSegs, usableSaved, type SavedRun } from "./saved-runs.ts";

const run = (over: Partial<SavedRun> = {}): SavedRun => ({
  key: "file:a.mp4:1:2|",
  at: "2026-11-21T10:00:00Z",
  fileName: "a.mp4",
  source: "zh",
  target: "Vietnamese",
  segs: [
    { start: 0, end: 1, original: "你好", translation: "Chào", busy: true },
    { start: 1, end: 2, original: "再见", translation: null },
  ],
  bible: null,
  ...over,
});

describe("phụ đề lưu trên máy theo tệp (v5.33.0)", () => {
  it("bỏ trạng thái tạm trước khi lưu, giữ chữ và giờ", () => {
    const out = snapshotSegs(run().segs);
    assert.equal("busy" in out[0], false);
    assert.equal(out[0].translation, "Chào");
  });

  it("tóm tắt: số câu, số đã dịch", () => {
    const sum = savedSummary(run());
    assert.equal(sum.total, 2);
    assert.equal(sum.done, 1);
  });

  it("chỉ dùng bản lưu đúng tệp và đúng tiếng gốc", () => {
    assert.equal(usableSaved(run(), "file:a.mp4:1:2|", "zh"), true);
    assert.equal(usableSaved(run(), "file:b.mp4:1:2|", "zh"), false);
    assert.equal(usableSaved(run(), "file:a.mp4:1:2|", "ja"), false);
    assert.equal(usableSaved(run({ segs: [] }), "file:a.mp4:1:2|", "zh"), false);
    assert.equal(usableSaved(null, "x", "zh"), false);
  });

  it("giữ tối đa 5 tệp gần nhất", () => {
    const many = Array.from({ length: SAVED_MAX + 2 }, (_, i) => ({ key: `k${i}`, at: `2026-11-2${i}T00:00:00Z` }));
    assert.deepEqual(keysToDrop(many).sort(), ["k0", "k1"]);
  });

  it("nối vào luồng chạy: lưu khi nhận dạng xong, hỏi khôi phục, Làm lại xóa bản lưu; điều khoản có nói", () => {
    const pipe = readFileSync(new URL("../components/use-pipeline.ts", import.meta.url), "utf8");
    assert.match(pipe, /if \(!key \|\| !segs\.length \|\| j\.pcmId !== key \|\| !j\.doneSource \|\| j\.nextPart < j\.parts\.length\) return;/);
    assert.match(pipe, /title: "Khôi phục bản đã làm\?"/);
    assert.match(pipe, /j\.pcmId = key;\s*j\.doneSource = saved\.source;/);
    assert.match(pipe, /clearJob\(\);\s*void dropSaved\(mediaId\(\)\);/);
    const terms = readFileSync(new URL("../components/terms-document.tsx", import.meta.url), "utf8");
    assert.match(terms, /Phụ đề bạn đã làm[^.]*tối đa 5 tệp gần nhất cũng được lưu trên máy bạn/);
  });
});
