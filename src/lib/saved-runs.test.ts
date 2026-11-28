import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { emptyJob, restoreModalProgress, snapshotModalProgress } from "./pipeline/job.ts";
import { SAVED_MAX, keysToDrop, savedSummary, snapshotSegs, usableSaved, type SavedRun } from "./saved-runs.ts";

const run = (over: Partial<SavedRun> = {}): SavedRun => ({
  ownerId: "account-A",
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
    assert.equal(usableSaved(run(), "file:a.mp4:1:2|", "zh", "account-A"), true);
    assert.equal(usableSaved(run(), "file:b.mp4:1:2|", "zh", "account-A"), false);
    assert.equal(usableSaved(run(), "file:a.mp4:1:2|", "ja", "account-A"), false);
    assert.equal(usableSaved(run({ segs: [] }), "file:a.mp4:1:2|", "zh", "account-A"), false);
    assert.equal(usableSaved(null, "x", "zh", "account-A"), false);
  });

  it("giữ tối đa 5 tệp gần nhất", () => {
    const many = Array.from({ length: SAVED_MAX + 2 }, (_, i) => ({ key: `k${i}`, at: `2026-11-2${i}T00:00:00Z` }));
    assert.deepEqual(keysToDrop(many).sort(), ["k0", "k1"]);
  });

  it("nối vào luồng chạy: lưu đúng tệp, hỏi khôi phục, Làm lại xóa bản lưu; điều khoản có nói", () => {
    const pipe = readFileSync(new URL("../components/use-pipeline.ts", import.meta.url), "utf8");
    assert.match(pipe, /snapshotModalProgress\(j, asrModel\)/);
    assert.match(pipe, /title: "Khôi phục bản đã làm\?"/);
    assert.match(pipe, /j\.pcmId = key;\s*j\.doneSource = saved\.source;/);
    assert.match(pipe, /clearJob\(\);\s*void dropSaved\(savedOwnerRef\.current, mediaId\(\)\);/);
    const terms = readFileSync(new URL("../components/terms-document.tsx", import.meta.url), "utf8");
    assert.match(terms, /Phụ đề bạn đã làm[^.]*tối đa 5 tệp gần nhất cũng được lưu trên máy bạn/);
  });
});

// Cross-account reproduction uses the public eligibility predicate before touching IndexedDB.
it("R5-008: cùng tệp của A không được khôi phục cho B hoặc phiên chưa đăng nhập", () => {
  const check = usableSaved as unknown as (value: SavedRun, key: string, source: string, owner: string) => boolean;
  const saved = { ...run(), ownerId: "account-A" };
  assert.equal(check(saved, saved.key, saved.source, "account-B"), false);
  assert.equal(check(saved, saved.key, saved.source, ""), false);
});


it("nạp lại tiến độ Modal gồm cả câu chờ đoạn đến trước, chỉ từ đúng tệp và model", () => {
  const job = emptyJob();
  job.parts = [[0, 16000], [16000, 32000], [32000, 48000]];
  job.nextPart = 1;
  job.asrBuf.set(2, { segments: [{ text: "日本語", start: 0, end: 0.6 }] });
  job.heardOffset.set(2, 0.2);
  job.heard.set(2, new Float32Array([1, 2, 3]));
  const model = "tyzo-modal-nhanh";
  const progress = snapshotModalProgress(job, model);
  assert.ok(progress);
  const record = structuredClone(run({ source: "ja", segs: [], modalProgress: progress }));
  assert.equal(usableSaved(record, record.key, "ja", record.ownerId, "tyzo-modal-ky"), false);
  assert.equal(usableSaved(record, record.key, "ja", record.ownerId, model), true);
  const restored = emptyJob();
  restoreModalProgress(restored, record.modalProgress!);
  assert.deepEqual(restored.parts, job.parts);
  assert.equal(restored.nextPart, 1);
  assert.deepEqual(restored.asrBuf, job.asrBuf);
  assert.equal(restored.heardOffset.get(2), 0.2);
  assert.equal(restored.heard.size, 0);
  assert.equal(restored.pcm, null);
});
