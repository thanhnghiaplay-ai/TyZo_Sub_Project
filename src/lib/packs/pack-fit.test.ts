import assert from "node:assert/strict";
import test from "node:test";
import { fitsRole, modelsForRole } from "./pack-fit.ts";

const GROQ = ["whisper-large-v3-turbo", "openai/gpt-oss-120b", "openai/gpt-oss-safeguard-20b", "canopylabs/orpheus-v1-english"];
const ALI = ["qwen-plus", "qwen-max", "qwen-audio-3.0-asr-flash-filetrans", "qwen3-tts-flash"];

test("nhận dạng chỉ model nhận dạng", () => {
  assert.deepEqual(modelsForRole("asr", "groq", GROQ), ["whisper-large-v3-turbo"]);
  assert.deepEqual(modelsForRole("asr", "alibaba", ALI), ["qwen-audio-3.0-asr-flash-filetrans"]);
});

test("dịch, ngữ cảnh, đối chiếu, tóm tắt chỉ model dịch, không kiểm duyệt", () => {
  for (const role of ["translate", "context", "review", "summary"] as const) {
    assert.deepEqual(modelsForRole(role, "groq", GROQ), ["openai/gpt-oss-120b"]);
    assert.deepEqual(modelsForRole(role, "alibaba", ALI), ["qwen-plus", "qwen-max"]);
  }
});

test("thuyết minh chỉ giọng đọc; Alibaba chưa có thì rỗng", () => {
  assert.deepEqual(modelsForRole("narration", "groq", GROQ), ["canopylabs/orpheus-v1-english"]);
  assert.deepEqual(modelsForRole("narration", "alibaba", ALI), []);
});

test("nhà nhận dạng không được gán việc dịch", () => {
  assert.equal(fitsRole("translate", { provider: "tyzo-modal", model: "tyzo-modal-nhanh" }), false);
  assert.equal(fitsRole("asr", { provider: "tyzo-modal", model: "tyzo-modal-ky" }), true);
});
