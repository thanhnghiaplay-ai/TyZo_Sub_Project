import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkRunDesk, dayStartIso, parseRunDesk, quoteVnd } from "./run-desk.ts";

describe("bàn trả theo lượt", () => {
  it("mặc định cửa mở, chưa tăng giá", () => {
    const desk = parseRunDesk(null);
    assert.equal(desk.maintenance, false);
    assert.equal(desk.markup, 0);
  });

  it("câu đóng cũ không giữ cửa ở trạng thái bảo trì", () => {
    const desk = parseRunDesk(JSON.stringify({ open: false, note: "Cửa trả theo lượt chưa mở.", turbo: 0, large: 0, cap: 0 }));
    assert.equal(desk.maintenance, false);
  });

  it("bảo trì phải có nội dung", () => {
    assert.throws(() => checkRunDesk({ maintenance: true, note: "ngắn", cap: 0, markup: 0, custom: {} }), /bảo trì/);
  });

  it("giá riêng thắng phần trăm, không có giá riêng thì cộng phần trăm", () => {
    assert.equal(quoteVnd(1000, 25, 0), 1250);
    assert.equal(quoteVnd(1000, 25, 1800), 1800);
  });

  it("mốc ngày theo giờ Việt Nam", () => {
    assert.equal(dayStartIso(new Date("2026-11-06T16:30:00Z")), new Date("2026-11-06T00:00:00+07:00").toISOString());
    assert.equal(dayStartIso(new Date("2026-11-06T17:30:00Z")), new Date("2026-11-07T00:00:00+07:00").toISOString());
  });
});
