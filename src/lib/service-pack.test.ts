import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chatCost, type PriceBook } from "./run-bill.ts";
import { HOLD_BUFFER } from "./run-bill.ts";
import {
  checkServicePacks,
  CONTEXT_TOKENS,
  parseServicePacks,
  quotePack,
  reviewTokens,
  translateTokens,
  type ServicePack,
} from "./service-pack.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";

const row = (over: Partial<GroqLiveRow>): GroqLiveRow => ({
  id: "x",
  speed: null,
  usdIn: null,
  usdOut: null,
  usdPerHour: null,
  usdPerMillionChars: null,
  unlisted: false,
  limits: [],
  contextTokens: null,
  maxCompletionTokens: null,
  maxFile: null,
  ...over,
});

function book(markup = 0): PriceBook {
  return {
    rate: 25_000,
    desk: { markup, custom: {} },
    rows: [
      row({ id: "whisper-large-v3-turbo", usdPerHour: 0.04 }),
      row({ id: "chat-model", usdIn: 0.075, usdOut: 0.3 }),
      row({ id: "review-model", usdIn: 0.15, usdOut: 0.6 }),
      row({ id: "qwen-plus", usdIn: 0.4, usdOut: 1.2 }),
      row({ id: "qwen3-tts-flash", usdPerMillionChars: 10 }),
    ],
  };
}

const pack = (roles: ServicePack["roles"], doors: ServicePack["doors"] = ["turn", "rent"]): ServicePack => ({
  id: "pack_demo1",
  name: "Gói thử",
  note: "Phim dài",
  enabled: true,
  doors,
  roles,
});

describe("báo giá gói dịch", () => {
  it("cửa trả theo lượt cộng phần chênh và giữ chỗ, không giữ tiền thuyết minh", () => {
    const quote = quotePack({
      pack: pack({
        asr: { provider: "groq", model: "whisper-large-v3-turbo" },
        translate: { provider: "groq", model: "chat-model" },
        narration: { provider: "alibaba", model: "qwen3-tts-flash" },
      }),
      seconds: 3600,
      door: "turn",
      narration: true,
      books: { groq: book(100), alibaba: book(100) },
    });
    assert.equal(quote.ready, true);
    const ticket = quote.lines.filter((line) => line.role !== "narration");
    const ticketMarked = ticket.reduce((sum, line) => sum + (line.marked ?? 0), 0);
    const ticketBase = ticket.reduce((sum, line) => sum + (line.base ?? 0), 0);
    assert.equal(ticketMarked, ticketBase * 2);
    assert.equal(quote.hold, Math.ceil(ticketMarked * HOLD_BUFFER));
    assert.ok((quote.narration ?? 0) > 0);
    assert.equal(quote.marked, ticketMarked + (quote.narration ?? 0));
  });

  it("thiếu ngữ cảnh và đối chiếu thì cộng vào lượt dịch, không tách dòng", () => {
    const quote = quotePack({
      pack: pack({
        asr: { provider: "groq", model: "whisper-large-v3-turbo" },
        translate: { provider: "groq", model: "chat-model" },
      }),
      seconds: 600,
      door: "turn",
      narration: false,
      books: { groq: book(0) },
    });
    assert.equal(quote.lines.some((line) => line.role === "context" || line.role === "review"), false);
    const spoken = translateTokens(600);
    const review = reviewTokens(600);
    const folded = chatCost(
      book(0),
      "chat-model",
      spoken.inn + CONTEXT_TOKENS.inn + review.inn,
      spoken.out + CONTEXT_TOKENS.out + review.out,
    );
    assert.equal(quote.lines.find((line) => line.role === "translate")?.base, folded);
  });

  it("gán đối chiếu riêng thì tách dòng và tính model đó", () => {
    const quote = quotePack({
      pack: pack({
        asr: { provider: "groq", model: "whisper-large-v3-turbo" },
        translate: { provider: "alibaba", model: "qwen-plus" },
        review: { provider: "groq", model: "review-model" },
      }),
      seconds: 600,
      door: "turn",
      narration: false,
      books: { groq: book(0), alibaba: book(0) },
    });
    assert.equal(quote.lines.find((line) => line.role === "review")?.model, "review-model");
    assert.equal(quote.ready, true);
  });

  it("cửa thuê phòng không lấy phần chênh và không giữ ví", () => {
    const quote = quotePack({
      pack: pack({
        asr: { provider: "groq", model: "whisper-large-v3-turbo" },
        translate: { provider: "groq", model: "chat-model" },
      }),
      seconds: 3600,
      door: "rent",
      narration: false,
      books: { groq: book(100) },
    });
    assert.equal(quote.hold, 0);
    assert.equal(quote.marked, quote.base);
    assert.equal(quote.ready, true);
  });

  it("model chưa có giá thì không cho chạy cửa trả theo lượt", () => {
    const quote = quotePack({
      pack: pack({
        asr: { provider: "alibaba", model: "qwen3-asr-flash" },
        translate: { provider: "alibaba", model: "qwen-plus" },
      }),
      seconds: 120,
      door: "turn",
      narration: false,
      books: { alibaba: book(0) },
    });
    assert.equal(quote.ready, false);
    assert.equal(quote.hold, 0);
  });

  it("tóm tắt trùng model ngữ cảnh thì không tính thêm lượt", () => {
    const quote = quotePack({
      pack: pack({
        asr: { provider: "groq", model: "whisper-large-v3-turbo" },
        translate: { provider: "groq", model: "chat-model" },
        context: { provider: "groq", model: "chat-model" },
        summary: { provider: "groq", model: "chat-model" },
      }),
      seconds: 60,
      door: "turn",
      narration: false,
      books: { groq: book(0) },
    });
    assert.equal(quote.lines.some((line) => line.role === "summary"), false);
  });

  it("đọc và ghi danh sách gói", () => {
    const saved = checkServicePacks([
      pack({
        asr: { provider: "groq", model: "whisper-large-v3-turbo" },
        translate: { provider: "alibaba", model: "qwen-plus" },
      }),
    ]);
    assert.equal(parseServicePacks(JSON.stringify(saved))[0]?.name, "Gói thử");
    assert.throws(() => checkServicePacks([{ ...saved[0], roles: { asr: saved[0].roles.asr } }]), /nhận dạng và model dịch/);
  });

  it("dịch lại không tính nhận dạng và không giữ tiền thuyết minh", () => {
    const roles = {
      asr: { provider: "groq" as const, model: "whisper-large-v3-turbo" },
      translate: { provider: "groq" as const, model: "chat-model" },
      review: { provider: "groq" as const, model: "review-model" },
      narration: { provider: "alibaba" as const, model: "qwen3-tts-flash" },
    };
    const full = quotePack({
      pack: pack(roles),
      seconds: 600,
      door: "turn",
      narration: true,
      books: { groq: book(0), alibaba: book(0) },
    });
    const again = quotePack({
      pack: pack(roles),
      seconds: 600,
      door: "turn",
      narration: true,
      scope: "translate",
      books: { groq: book(0), alibaba: book(0) },
    });
    assert.equal(again.ready, true);
    assert.equal(again.lines.some((line) => line.role === "asr"), false);
    assert.equal(again.lines.some((line) => line.role === "narration"), false);
    assert.equal(again.narration, 0);
    assert.ok((again.hold ?? 0) > 0);
    assert.ok((again.hold ?? 0) < (full.hold ?? 0));
  });
});
