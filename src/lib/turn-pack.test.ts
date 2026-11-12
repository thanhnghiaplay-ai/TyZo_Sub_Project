import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOLD_BUFFER, type PriceBook } from "./run-bill.ts";
import { quotePack, type ServicePack } from "./service-pack.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";
import { customerVisiblePrice, turnPackModels, turnPackProblem } from "./turn-pack.ts";

const pack = (over: Partial<ServicePack>): ServicePack => ({
  id: "pack_demo1",
  name: "Gói",
  note: "",
  enabled: true,
  doors: ["turn"],
  roles: {
    asr: { provider: "groq", model: "whisper-large-v3-turbo" },
    translate: { provider: "groq", model: "llama-3.3-70b-versatile" },
  },
  ...over,
});

describe("cửa trả theo lượt theo gói", () => {
  it("chưa có gói thì không chặn cửa cũ", () => {
    assert.equal(turnPackProblem([], { asr: "whisper-large-v3-turbo", chat: "llama-3.1-8b-instant" }), "");
    assert.equal(turnPackProblem([pack({ enabled: false })], { asr: "whisper-large-v3", chat: "x" }), "");
  });

  it("có gói thì phải khớp nhận dạng và dịch, gói Alibaba chưa chạy", () => {
    const groq = pack({});
    const ali = pack({
      id: "pack_ali01",
      roles: {
        asr: { provider: "alibaba", model: "qwen-audio-3.0-asr-flash-filetrans" },
        translate: { provider: "groq", model: "llama-3.3-70b-versatile" },
      },
    });
    assert.match(turnPackProblem([groq], { asr: "whisper-large-v3", chat: "llama-3.3-70b-versatile" }), /chọn một gói/);
    assert.equal(turnPackProblem([groq], { asr: "whisper-large-v3-turbo", chat: "llama-3.3-70b-versatile" }), "");
    assert.equal(turnPackProblem([ali], { asr: "qwen-audio-3.0-asr-flash-filetrans", chat: "llama-3.3-70b-versatile" }), "");
    const aliChat = pack({
      id: "pack_ali02",
      roles: {
        asr: { provider: "alibaba", model: "qwen-audio-3.0-asr-flash-filetrans" },
        translate: { provider: "alibaba", model: "qwen-turbo" },
      },
    });
    assert.match(turnPackProblem([aliChat], { asr: "qwen-audio-3.0-asr-flash-filetrans", chat: "qwen-turbo" }), /ngoài nhận dạng/);
    assert.equal(turnPackModels(groq).chat, "llama-3.3-70b-versatile");
  });

  it("khách chỉ thấy giá đã cộng phần trăm, không thấy giá gốc", () => {
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
    const book = (markup: number): PriceBook => ({
      rate: 25_000,
      desk: { markup, custom: {} },
      rows: [
        row({ id: "whisper-large-v3-turbo", usdPerHour: 0.04 }),
        row({ id: "llama-3.3-70b-versatile", usdIn: 0.075, usdOut: 0.3 }),
      ],
    });
    const groq = pack({
      roles: {
        asr: { provider: "groq", model: "whisper-large-v3-turbo" },
        translate: { provider: "groq", model: "llama-3.3-70b-versatile" },
      },
    });
    const bare = quotePack({ pack: groq, seconds: 600, door: "turn", narration: false, books: { groq: book(0) } });
    const marked = quotePack({ pack: groq, seconds: 600, door: "turn", narration: false, books: { groq: book(50) } });
    assert.equal(marked.ready, true);
    assert.ok((marked.marked ?? 0) > (bare.marked ?? 0));
    assert.equal(marked.hold, Math.ceil((marked.lines.filter((line) => line.role !== "narration").reduce((sum, line) => sum + (line.marked ?? 0), 0)) * HOLD_BUFFER));
    const line = customerVisiblePrice(marked.marked, marked.hold);
    const baseText = new Intl.NumberFormat("vi-VN").format(bare.marked ?? 0);
    assert.match(line, /Ước tính/);
    assert.equal(line.includes(baseText), false);
    assert.equal(/%|gốc|chênh/.test(line), false);
  });
});
