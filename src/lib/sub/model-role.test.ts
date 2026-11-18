import assert from "node:assert/strict";
import test from "node:test";
import { modelRoleOf } from "./model-role.ts";

test("đoán việc của model theo tên", () => {
  assert.equal(modelRoleOf("whisper-large-v3-turbo"), "asr");
  assert.equal(modelRoleOf("qwen-audio-3.0-asr-flash-filetrans"), "asr");
  assert.equal(modelRoleOf("qwen3-tts-flash"), "tts");
  assert.equal(modelRoleOf("openai/gpt-oss-safeguard-20b"), "guard");
  assert.equal(modelRoleOf("qwen-plus"), "translate");
});

test("model nhận dạng của AssemblyAI, Speechmatics, Soniox là asr", () => {
  for (const id of ["assemblyai-universal-3-5-pro", "assemblyai-universal-2", "speechmatics-enhanced", "speechmatics-standard", "soniox-stt-async"]) {
    assert.equal(modelRoleOf(id), "asr", id);
  }
});
