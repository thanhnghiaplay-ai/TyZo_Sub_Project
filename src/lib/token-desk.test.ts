import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkGiayDesk, GIAY_DESK_DEFAULT, parseGiayDesk } from "./token-desk.ts";

describe("bàn gói giây", () => {
  it("chưa lưu thì dùng ba gói mặc định", () => {
    const desk = parseGiayDesk(null);
    assert.equal(desk.markup, 50);
    assert.equal(desk.buffer, 1.2);
    assert.equal(desk.packs.length, GIAY_DESK_DEFAULT.packs.length);
  });

  it("chặn phần trăm và đệm lệch", () => {
    assert.throws(() => checkGiayDesk({ markup: 501, buffer: 1.2, packs: [] }), /Phần trăm/);
    assert.throws(() => checkGiayDesk({ markup: 50, buffer: 0.5, packs: [] }), /đệm/);
  });

  it("bỏ gói trùng mã", () => {
    const desk = checkGiayDesk({
      markup: 10,
      buffer: 1.5,
      packs: [
        { id: "a", tokens: 100, days: 7 },
        { id: "a", tokens: 200, days: 7 },
      ],
    });
    assert.equal(desk.packs.length, 1);
    assert.equal(desk.packs[0].tokens, 100);
  });
});
