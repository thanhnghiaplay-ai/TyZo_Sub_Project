import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exportNotice, payTurnNotice, roomAccess, trialFileProblem } from "./room-plans.ts";

const now = Date.parse("2026-11-05T10:00:00.000Z");

describe("hạn gói", () => {
  it("đăng ký chưa nạp là dùng thử", () => {
    assert.equal(
      roomAccess({ plan: null, planUntil: null, trialLeft: 1 }, now).text,
      "Dùng thử: còn 1 tệp, tối đa 10 phút. Không xuất file Vietsub.",
    );
  });

  it("hết lượt thì phải mua gói", () => {
    assert.match(roomAccess({ plan: "ngay", planUntil: "2026-11-05T09:00:00.000Z", trialLeft: 0 }, now).text, /hết hạn/);
  });

  it("còn hạn thì không giới hạn số tệp", () => {
    const access = roomAccess({ plan: "tuan", planUntil: "2026-11-06T10:00:00.000Z", trialLeft: 0 }, now);
    assert.equal(access.kind, "paid");
    assert.match(access.text, /không giới hạn số tệp/);
  });

  it("quá 10 phút hoặc quá 100 MB thì từ chối", () => {
    assert.match(trialFileProblem(11 * 60, 1000) || "", /10 phút/);
    assert.match(trialFileProblem(60, 101 * 1024 * 1024) || "", /100 MB/);
    assert.equal(trialFileProblem(9 * 60, 20 * 1024 * 1024), null);
  });

  it("xuất file chỉ khi còn hạn", () => {
    assert.equal(exportNotice({ plan: null, planUntil: null, trialLeft: 1 }, now), "Tài khoản dùng thử không xuất được file Vietsub.");
    assert.equal(
      exportNotice({ plan: "ngay", planUntil: "2026-11-05T09:00:00.000Z", trialLeft: 0 }, now),
      "Gói đã hết hạn. Không xuất được file Vietsub.",
    );
    assert.equal(exportNotice({ plan: "tuan", planUntil: "2026-11-06T10:00:00.000Z", trialLeft: 0 }, now), null);
  });

  it("trả theo lượt không lấy câu của gói hết hạn", () => {
    assert.match(payTurnNotice({ plan: "ngay", planUntil: "2026-11-05T09:00:00.000Z", trialLeft: 0 }, now), /tiền trừ trong ví/);
    assert.match(payTurnNotice({ plan: "tuan", planUntil: "2026-11-06T10:00:00.000Z", trialLeft: 0 }, now), /Số ngày của gói thuê không bị trừ/);
    assert.match(payTurnNotice({ plan: null, planUntil: null, trialLeft: 1 }, now), /Bản dùng thử/);
  });
});