import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ticketMoneyLine, ticketPart } from "./ticket-line.ts";
import { runEstimate } from "./wallet-view.ts";
import { customerVisiblePrice } from "./turn-pack.ts";

describe("thẻ phiếu Admin (v5.31.2)", () => {
  it("phiếu Token: đơn vị Token dịch, giữ ban đầu, trừ, trả lại; không còn «Giữ 0 giây»", () => {
    const line = ticketMoneyLine({ held: 0, charged: 16000, released: 14000, refunded: 0, status: "da-tru", unit: "token" });
    assert.equal(line, "Giữ 30.000 Token dịch · trừ 16.000 Token dịch · trả lại 14.000 Token dịch");
    assert.doesNotMatch(line, /giây/);
    assert.match(ticketMoneyLine({ held: 20000, charged: 3000, released: 0, refunded: 0, status: "dang-giu", unit: "token" }), /Giữ 23\.000 Token dịch · trừ 3\.000 Token dịch · đang giữ 20\.000/);
    assert.match(ticketMoneyLine({ held: 0, charged: 5000, released: 0, refunded: 1000, status: "da-hoan", unit: "vnd" }), /Trừ 5\.000 đ · Hoàn 1\.000 đ/);
  });

  it("nhãn phần việc: phần dịch che tên tệp sau tiền tố; việc phụ không che", () => {
    assert.deepEqual(ticketPart("Dịch tiếp · Tap 1.mp4"), { tag: "Phần dịch", name: "Tap 1.mp4", system: false });
    assert.equal(ticketPart("Phân tích nội dung").system, true);
    assert.equal(ticketPart("Khoảng trống").tag, "Dò khoảng trống");
    assert.deepEqual(ticketPart("Tap 1.mp4"), { tag: null, name: "Tap 1.mp4", system: false });
  });
});

describe("ước tính Token theo hai phần (v5.31.2)", () => {
  const row = { id: "p", total: 48000, hold: 48000, asrHold: 30000, chatHold: 20000 };
  it("chưa nhận dạng: cần đủ cả hai phần (giữ lần lượt)", () => {
    const e = runEstimate(row, 36000)!;
    assert.equal(e.hold, 50000);
    assert.equal(e.enough, false);
    assert.equal(e.short, 14000);
  });
  it("đã nhận dạng xong: chỉ cần phần dịch", () => {
    const e = runEstimate(row, 36000, "chat")!;
    assert.equal(e.hold, 20000);
    assert.equal(e.enough, true);
  });
  it("máy chủ cũ không trả phần: giữ cách cũ", () => {
    assert.equal(runEstimate({ id: "p", total: 48000, hold: 48000 }, 0)!.hold, 48000);
  });
  it("câu giá ở bước cuối ghi hai phần", () => {
    assert.match(customerVisiblePrice(48000, 48000, false, { asr: 30000, chat: 20000 }), /nhận dạng 30\.000, dịch 20\.000/);
  });
});
