import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asrCost, billedSecondsOf, chatCost, estimateHold, speechCost, type PriceBook } from "./run-bill.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";

const row = (over: Partial<GroqLiveRow>): GroqLiveRow => ({
  id: "x", speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null,
  unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...over,
});

const book = (markup = 0, custom: PriceBook["desk"]["custom"] = {}): PriceBook => ({
  rate: 25_000,
  desk: { markup, custom },
  rows: [
    row({ id: "whisper-large-v3-turbo", usdPerHour: 0.04 }),
    row({ id: "chat-model", usdIn: 0.075, usdOut: 0.3 }),
    row({ id: "tts-model", usdPerMillionChars: 22 }),
  ],
});

describe("tính tiền theo giá Groq", () => {
  it("nhận dạng: giờ âm thanh nhân tỷ giá, tối thiểu 10 giây", () => {
    // 0.04 USD/giờ × 25.000 = 1.000 đ/giờ → 0,2778 đ/giây
    assert.equal(asrCost(book(), "whisper-large-v3-turbo", 3600), 1000);
    assert.equal(asrCost(book(), "whisper-large-v3-turbo", 1), asrCost(book(), "whisper-large-v3-turbo", 10));
  });

  it("phần chênh nâng giá đều", () => {
    assert.equal(asrCost(book(50), "whisper-large-v3-turbo", 3600), 1500);
    assert.equal(asrCost(book(100), "whisper-large-v3-turbo", 3600), 2000);
  });

  it("giá Chủ đặt tay thay cho giá Groq cộng chênh", () => {
    const custom = { "whisper-large-v3-turbo": { hour: 7200, inn: 0, out: 0 } };
    assert.equal(asrCost(book(50, custom), "whisper-large-v3-turbo", 3600), 7200);
  });

  it("dịch: token vào và ra tính riêng", () => {
    // vào 0,075×25.000=1.875 đ/triệu, ra 0,3×25.000=7.500 đ/triệu
    assert.equal(chatCost(book(), "chat-model", 1_000_000, 0), 1875);
    assert.equal(chatCost(book(), "chat-model", 0, 1_000_000), 7500);
    assert.equal(chatCost(book(), "chat-model", 1000, 1000), Math.ceil((1.875 + 7.5)));
  });

  it("đọc: theo số ký tự, có dùng thì tối thiểu 1 đ", () => {
    assert.equal(speechCost(book(), "tts-model", 1_000_000), 550_000);
    assert.equal(speechCost(book(), "tts-model", 1), 1);
    assert.equal(speechCost(book(), "tts-model", 0), 0);
  });

  it("model chưa có giá thì trả null, không bao giờ miễn phí", () => {
    assert.equal(asrCost(book(), "khong-co", 60), null);
    assert.equal(chatCost(book(), "khong-co", 10, 10), null);
    assert.equal(speechCost(book(), "khong-co", 10), null);
    assert.equal(estimateHold(book(), "whisper-large-v3-turbo", "khong-co", 60), null);
  });

  it("giữ chỗ lớn hơn chi phí nhận dạng cộng dịch ước, có đệm", () => {
    const hold = estimateHold(book(), "whisper-large-v3-turbo", "chat-model", 3600)!;
    const raw = asrCost(book(), "whisper-large-v3-turbo", 3600)! + chatCost(book(), "chat-model", 3600 * 12 + 1500, 3600 * 8 + 500)!;
    assert.ok(hold >= raw * 1.5 - 1 && hold <= raw * 1.5 + 2);
  });

  it("billedSecondsOf lấy duration, không có thì lấy mốc cuối", () => {
    assert.equal(billedSecondsOf({ duration: 12.5 }), 12.5);
    assert.equal(billedSecondsOf({ segments: [{ end: 3 }, { end: 9 }] }), 9);
    assert.equal(billedSecondsOf(null), 0);
  });
});
