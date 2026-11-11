import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resendSeconds, watchIntent, type WatchCue } from "./watch-run.ts";

const line = (patch: Partial<WatchCue> = {}): WatchCue => ({
  start: 0,
  end: 10,
  translation: "xin chào",
  ...patch,
});

const base = {
  running: false,
  segs: [line()],
  pcmId: "file:a",
  mediaId: "file:a",
  doneSource: "zh",
  source: "zh",
  appliedSig: "vi|m",
  sig: "vi|m",
  asrLeft: false,
};

describe("nút xem phim", () => {
  it("đang chạy thì chỉ hủy", () => {
    assert.equal(watchIntent({ ...base, running: true, sig: "khác" }), "Hủy");
  });

  it("đổi file hoặc ngôn ngữ nguồn là nhận dạng lại, không xóa khi mới đổi ô", () => {
    assert.equal(watchIntent({ ...base, mediaId: "file:b" }), "Nhận dạng lại");
    assert.equal(watchIntent({ ...base, source: "ko" }), "Nhận dạng lại");
    assert.equal(watchIntent({ ...base, segs: [] }), "Tải và dịch");
  });

  it("đổi cách dịch khi đã nghe xong là dịch lại, không nhận dạng", () => {
    assert.equal(watchIntent({ ...base, sig: "vi|khác" }), "Dịch lại");
    assert.equal(watchIntent({ ...base, segs: [line({ stale: true })] }), "Dịch lại");
  });

  it("còn đoạn nghe thì tiếp tục, kể cả vừa đổi model, để không bỏ phí nhận dạng", () => {
    assert.equal(watchIntent({ ...base, asrLeft: true, sig: "vi|khác" }), "Tiếp tục");
  });

  it("xem xong thì ẩn nút. Đổi kiểu chữ không nằm trong chữ ký nên không hiện dịch lại", () => {
    assert.equal(watchIntent(base), "");
    assert.equal(watchIntent({ ...base, segs: [line({ translation: null })] }), "Tiếp tục");
  });
});

describe("giây dịch lại", () => {
  it("không tính câu đã sửa, và không tính câu đã là bản mới", () => {
    const segs = [
      line({ start: 0, end: 10, edited: true }),
      line({ start: 10, end: 30, stale: true }),
      line({ start: 30, end: 40 }),
    ];
    assert.equal(resendSeconds(segs, "vi|m", "vi|m"), 20);
    assert.equal(resendSeconds(segs, "vi|m", "vi|khác"), 30);
  });

  it("toàn câu đã sửa thì không còn gì để giữ tiền", () => {
    assert.equal(resendSeconds([line({ edited: true })], "a", "b"), 0);
  });
});
