import assert from "node:assert/strict";
import test from "node:test";
import { gradeOf } from "./model-grade.ts";
import { ALIBABA_ROWS } from "./alibaba-catalog.ts";
import { ASR_MODELS, CHAT_MODELS } from "./models.ts";
import { modelRoleOf } from "./model-role.ts";

test("model chat Groq lấy điểm từ CHAT_MODELS, tốc độ quy về thang 10", () => {
  const g = gradeOf("openai/gpt-oss-120b");
  assert.deepEqual(g, { quality: 9, speed: 5, asian: 7.5 });
  assert.equal(gradeOf("openai/gpt-oss-20b")?.speed, 10);
});

test("mọi model chat, nhận dạng và dịch của Alibaba trong catalog đều có điểm", () => {
  for (const m of CHAT_MODELS) assert.ok(gradeOf(m.id), m.id);
  for (const m of ASR_MODELS) assert.ok(gradeOf(m.id), m.id);
  for (const row of ALIBABA_ROWS) {
    if (modelRoleOf(row.id) === "translate" || modelRoleOf(row.id) === "asr") assert.ok(gradeOf(row.id), row.id);
  }
});

test("điểm nằm trong 0 đến 10, model lạ thì null", () => {
  for (const id of ["qwen-turbo", "qwen-plus", "qwen-max", "whisper-large-v3", "deepgram-nova-3"]) {
    const g = gradeOf(id)!;
    for (const v of [g.quality, g.speed, g.asian]) assert.ok(v >= 0 && v <= 10, id);
  }
  assert.equal(gradeOf("model-la-khong-co"), null);
});
