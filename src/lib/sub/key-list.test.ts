import assert from "node:assert/strict";
import test from "node:test";
import { KEY_LIST_TRUSTED, keyListHas } from "./key-list.ts";
import { PROVIDER_IDS } from "./provider.ts";

test("mọi nhà đều khai độ tin cậy", () => {
  for (const id of PROVIDER_IDS) assert.equal(typeof KEY_LIST_TRUSTED[id], "boolean", id);
});

test("Groq: có / không có / chưa đọc được", () => {
  assert.equal(keyListHas("groq", "whisper-large-v3", ["whisper-large-v3"]), true);
  assert.equal(keyListHas("groq", "whisper-large-v3", ["llama-3.3-70b-versatile"]), false);
  assert.equal(keyListHas("groq", "whisper-large-v3", null), null);
  assert.equal(keyListHas("groq", "whisper-large-v3", []), null);
});

test("nhà chưa đáng tin thì không bao giờ khóa", () => {
  assert.equal(keyListHas("alibaba", "qwen-audio-3.0-asr-flash-filetrans", ["qwen-plus"]), null);
});
