import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkRunDesk, dayStartIso, parseRunDesk } from "./run-desk.ts";

describe("bàn trả theo lượt", () => {
  it("thiếu dữ liệu thì cửa đóng và chưa có giá", () => {
    const desk = parseRunDesk(null);
    assert.equal(desk.open, false);
    assert.equal(desk.turbo, 0);
    assert.equal(desk.large, 0);
  });

  it("câu đóng cũ được đổi sang câu tạm ngưng", () => {
    const desk = parseRunDesk(JSON.stringify({ turbo: 0, large: 0, open: false, note: "Cửa trả theo lượt chưa mở.", cap: 0 }));
    assert.match(desk.note, /tạm ngưng để hoàn thiện/);
  });
  it("mở cửa được khi chưa niêm yết, để xem khung", () => {
    const desk = checkRunDesk({ turbo: 0, large: 0, open: true, note: "xem khung", cap: 0 });
    assert.equal(desk.open, true);
  });

  it("mốc ngày theo giờ Việt Nam", () => {
    assert.equal(dayStartIso(new Date("2026-11-06T16:30:00Z")), new Date("2026-11-06T00:00:00+07:00").toISOString());
    assert.equal(dayStartIso(new Date("2026-11-06T17:30:00Z")), new Date("2026-11-07T00:00:00+07:00").toISOString());
  });
});
