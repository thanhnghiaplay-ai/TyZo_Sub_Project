import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { elapsedLabel, liveBalanceLine, liveButton, liveMinutes, liveMoneyLeft, liveStateText, liveWarn, liveWarnText } from "./live-view.ts";

describe("số dư và số phút", () => {
  it("tổng còn dùng được = số dư tự do + tiền đang giữ", () => {
    assert.equal(liveMoneyLeft({ free: 1000, heldLeft: 500 }), 1500);
    assert.equal(liveMoneyLeft({ free: -5, heldLeft: Number.NaN }), 0);
  });
  it("còn N phút theo giá một phút, làm tròn xuống", () => {
    assert.equal(liveMinutes(5000, 1000), 5);
    assert.equal(liveMinutes(1999, 1000), 1);
    assert.equal(liveMinutes(0, 1000), 0);
    assert.equal(liveMinutes(5000, null), null);
  });
  it("dòng số dư có số tiền và số phút", () => {
    assert.equal(liveBalanceLine(5000, 5), "5.000 đ · còn khoảng 5 phút");
    assert.equal(liveBalanceLine(5000, null), "5.000 đ");
  });
});

describe("cảnh báo sắp hết tiền", () => {
  const base = { minutes: 10, bridgeLow: false, denied: false, running: true };
  it("còn nhiều thì không báo", () => {
    assert.equal(liveWarn(base), "ok");
    assert.equal(liveWarnText("ok", 10), "");
  });
  it("dưới 3 phút báo sắp hết", () => {
    assert.equal(liveWarn({ ...base, minutes: 2 }), "low");
    assert.match(liveWarnText("low", 2), /Sắp hết tiền: còn khoảng 2 phút/);
  });
  it("cầu nối báo low thì báo dù còn nhiều phút theo ước tính", () => {
    assert.equal(liveWarn({ ...base, bridgeLow: true }), "low");
  });
  it("dưới 1 phút khi đang chạy là hết", () => {
    assert.equal(liveWarn({ ...base, minutes: 0 }), "out");
    assert.match(liveWarnText("out", 0), /tự dừng/);
  });
  it("chưa chạy mà ví trống thì chưa tính là hết phiên, chỉ báo thấp", () => {
    assert.equal(liveWarn({ minutes: 0, bridgeLow: false, denied: false, running: false }), "low");
  });
  it("chưa biết giá thì không bịa số phút", () => {
    assert.equal(liveWarn({ ...base, minutes: null }), "ok");
    assert.match(liveWarnText("low", null), /Sắp hết tiền\./);
  });
});

describe("thời gian và nút", () => {
  it("đồng hồ", () => {
    assert.equal(elapsedLabel(0), "0:00");
    assert.equal(elapsedLabel(65_000), "1:05");
    assert.equal(elapsedLabel(3_723_000), "1:02:03");
    assert.equal(elapsedLabel(Number.NaN), "0:00");
  });
  it("nút Bắt đầu / Dừng", () => {
    assert.deepEqual(liveButton("idle"), { label: "Bắt đầu", stops: false, disabled: false });
    assert.deepEqual(liveButton("closed"), { label: "Bắt đầu", stops: false, disabled: false });
    assert.equal(liveButton("live").stops, true);
    assert.equal(liveButton("connecting").disabled, false);
    assert.equal(liveButton("opening").disabled, true);
    assert.equal(liveButton("closing").disabled, true);
  });
  it("dòng trạng thái, có nói nối lại", () => {
    assert.equal(liveStateText("live", 0), "Đang dịch trực tiếp");
    assert.match(liveStateText("live", 2), /nối lại \(lần 2\)/);
    assert.equal(liveStateText("idle", 0), "Chưa bắt đầu");
  });
});
