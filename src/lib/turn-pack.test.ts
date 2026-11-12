import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ServicePack } from "./service-pack.ts";
import { turnPackModels, turnPackProblem } from "./turn-pack.ts";

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
    assert.match(turnPackProblem([ali], { asr: "qwen-audio-3.0-asr-flash-filetrans", chat: "llama-3.3-70b-versatile" }), /Alibaba/);
    assert.equal(turnPackModels(groq).chat, "llama-3.3-70b-versatile");
  });
});
