import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ALIBABA_ROWS } from "./alibaba-catalog.ts";
import { MODEL_CATALOG } from "./model-catalog.ts";
import { ASR_MODELS, CHAT_MODELS } from "./models.ts";
import { prettyModelId, shortModelName, shortModelNames } from "./model-short.ts";

test("rút gọn từ mã model", () => {
  assert.equal(prettyModelId("qwen3.8-27b"), "Qwen 3.8 27B");
  assert.equal(prettyModelId("qwen-plus"), "Qwen Plus");
  assert.equal(prettyModelId("qwen3-asr-flash"), "Qwen 3 ASR Flash");
  assert.equal(prettyModelId("meta-llama/llama-4-scout"), "Llama 4 Scout");
});

test("model có trong danh mục thì lấy nhãn danh mục", () => {
  assert.equal(shortModelName("whisper-large-v3-turbo"), "Whisper Turbo");
  assert.equal(shortModelName("openai/gpt-oss-120b"), CHAT_MODELS.find((m) => m.id === "openai/gpt-oss-120b")?.name);
});

test("mọi model đã biết có tên ngắn, không chứa dấu «/», không dài", () => {
  const ids = [
    ...MODEL_CATALOG.map((model) => model.id),
    ...ASR_MODELS.map((row) => row.id),
    ...ALIBABA_ROWS.map((row) => row.id),
  ];
  for (const id of ids) {
    const name = shortModelName(id);
    assert.ok(name.length > 0, id);
    assert.ok(name.length <= 40, `${id} → ${name} quá dài`);
    assert.ok(!name.includes("/"), `${id} → ${name} còn dấu /`);
  }
});

test("hai model trùng tên ngắn thì thêm mã để phân biệt", () => {
  const out = shortModelNames(["qwen-plus", "qwen-plus-2025", "qwen-plus-2024"]);
  assert.equal(out["qwen-plus"], "Qwen Plus");
  assert.notEqual(out["qwen-plus-2025"], out["qwen-plus-2024"]);
  const dup = shortModelNames(["a/qwen-max", "b/qwen-max"]);
  assert.notEqual(dup["a/qwen-max"], dup["b/qwen-max"]);
});

test("ô chọn gói không còn gắn câu vai trò vào từng dòng", () => {
  const source = readFileSync(new URL("../../components/service-pack-board.tsx", import.meta.url), "utf8");
  assert.ok(!source.includes("modelRoleNote"), "service-pack-board.tsx không được dùng modelRoleNote");
});
