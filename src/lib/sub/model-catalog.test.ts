import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LIVE_MODEL_38 } from "../live/live-price.ts";
import { MODEL_CATALOG, catalogFor, catalogModel, modelKindOf } from "./model-catalog.ts";
import { modelRoleNote, modelRoleOf } from "./model-role.ts";
import { ASR_MODELS, CHAT_MODELS } from "./models.ts";
import { PROVIDERS, PROVIDER_IDS } from "./provider.ts";

describe("danh mục model chung", () => {
  it("không trùng model trong cùng một nhà", () => {
    const seen = new Set<string>();
    for (const model of MODEL_CATALOG) {
      const key = `${model.provider}:${model.id}`;
      assert.ok(!seen.has(key), `trùng ${key}`);
      seen.add(key);
    }
  });

  it("mọi model nhận dạng và model dịch hiện có đều nằm trong danh mục", () => {
    for (const row of ASR_MODELS) assert.equal(MODEL_CATALOG.find((model) => model.id === row.id)?.kind, "asr", row.id);
    for (const row of CHAT_MODELS) {
      const found = MODEL_CATALOG.find((model) => model.id === row.id);
      assert.ok(found, row.id);
      assert.equal(found.kind, row.tier === "safety" ? "guard" : "chat");
    }
  });

  it("chỉ model nhận dạng có intake, và intake khớp khai của nhà", () => {
    for (const model of MODEL_CATALOG) {
      if (model.kind === "asr") assert.equal(model.intake, PROVIDERS[model.provider].intake, model.id);
      else assert.equal(model.intake, null, model.id);
    }
  });

  it("nhà khai khả năng nào thì có ít nhất một model loại đó", () => {
    for (const id of PROVIDER_IDS) {
      for (const cap of PROVIDERS[id].caps) assert.ok(catalogFor(id, cap).length > 0, `${id} khai ${cap} nhưng chưa có model ${cap} trong danh mục`);
    }
  });

  it("mỗi model trong danh mục thuộc loại mà nhà đó khai (trừ guard)", () => {
    for (const model of MODEL_CATALOG) {
      if (model.kind === "guard") continue;
      assert.ok(PROVIDERS[model.provider].caps.includes(model.kind), `${model.provider} chưa khai ${model.kind} cho ${model.id}`);
    }
  });

  it("tra một model", () => {
    assert.equal(catalogModel("deepgram", "deepgram-nova-3")?.intake, "link");
    assert.equal(catalogModel("groq", "whisper-large-v3")?.intake, "chunks");
    assert.equal(catalogModel("groq", "deepgram-nova-3"), null);
  });
});

describe("đoán việc của model ngoài danh mục", () => {
  it("Deepgram", () => {
    assert.equal(modelKindOf("deepgram", "nova-2"), "asr");
    assert.equal(modelKindOf("deepgram", "aura-2-luna-en"), "tts");
    assert.equal(modelKindOf("deepgram", "something-else"), null);
  });
  it("Groq và Alibaba", () => {
    assert.equal(modelKindOf("groq", "whisper-large-v3"), "asr");
    assert.equal(modelKindOf("groq", "playai-tts"), "tts");
    assert.equal(modelKindOf("groq", "meta-llama/llama-guard-4-12b"), "guard");
    assert.equal(modelKindOf("groq", "some/new-chat-model"), "chat");
    assert.equal(modelKindOf("alibaba", "qwen-plus"), "chat");
    assert.equal(modelKindOf("alibaba", "qwen3-tts-flash"), "tts");
    assert.equal(modelKindOf("alibaba", LIVE_MODEL_38), "live");
  });
});

describe("ghi chú vai của model (model-role)", () => {
  it("nhận ra model Deepgram và dịch trực tiếp, không còn gán nhầm là dịch", () => {
    assert.equal(modelRoleOf("deepgram-nova-3"), "asr");
    assert.equal(modelRoleOf("nova-3"), "asr");
    assert.equal(modelRoleOf("aura-2-thalia-en"), "tts");
    assert.equal(modelRoleOf("qwen3.8-livetranslate-flash-realtime"), "live");
    assert.match(modelRoleNote("qwen3.8-livetranslate-flash-realtime"), /trực tiếp/);
  });
  it("không đổi cách nhận ra các model cũ", () => {
    assert.equal(modelRoleOf("whisper-large-v3-turbo"), "asr");
    assert.equal(modelRoleOf("qwen3-tts-flash"), "tts");
    assert.equal(modelRoleOf("openai/gpt-oss-safeguard-20b"), "guard");
    assert.equal(modelRoleOf("qwen-plus"), "translate");
    assert.equal(modelRoleOf("openai/gpt-oss-120b"), "translate");
  });
});
