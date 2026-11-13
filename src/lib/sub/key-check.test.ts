import test from "node:test";
import assert from "node:assert/strict";
import { judgeKey, type KeyProbe } from "./key-check.ts";

const base: KeyProbe = { status: 200, ids: ["whisper-large-v3-turbo", "openai/gpt-oss-120b"], retryAfter: 0, remainingRequests: null, remainingTokens: null };
const need = { asr: "whisper-large-v3-turbo", chat: "openai/gpt-oss-120b" };

test("key mở đủ cả hai model thì ok và đếm model", () => {
  const out = judgeKey(base, need);
  assert.equal(out.state, "ok");
  assert.match(out.text, /2 model/);
});

test("không nói số còn lại khi Groq không gửi", () => {
  assert.doesNotMatch(judgeKey(base, need).text, /còn/);
});

test("có số còn lại thì hiện", () => {
  const out = judgeKey({ ...base, remainingRequests: 12, remainingTokens: 3400 }, need);
  assert.match(out.text, /còn 12 lượt gọi/);
  assert.match(out.text, /còn 3400 token/);
});

test("401 và 403 là key sai", () => {
  assert.equal(judgeKey({ ...base, status: 401, ids: [] }, need).state, "bad");
  assert.equal(judgeKey({ ...base, status: 403, ids: [] }, need).state, "bad");
});

test("429 chặn và nói số phút chờ", () => {
  const out = judgeKey({ ...base, status: 429, ids: [], retryAfter: 600 }, need);
  assert.equal(out.state, "bad");
  assert.match(out.text, /10 phút/);
  assert.match(judgeKey({ ...base, status: 429, ids: [], retryAfter: 30 }, need).text, /30 giây/);
});

test("mất mạng hoặc Groq lỗi 5xx thì chỉ cảnh báo, không chặn", () => {
  assert.equal(judgeKey({ ...base, status: 0, ids: [] }, need).state, "warn");
  assert.equal(judgeKey({ ...base, status: 503, ids: [] }, need).state, "warn");
});

test("model dịch không có trên key thì chặn và nêu tên", () => {
  const out = judgeKey({ ...base, ids: ["whisper-large-v3-turbo"] }, need);
  assert.equal(out.state, "bad");
  assert.match(out.text, /openai\/gpt-oss-120b/);
});

test("model nhận dạng không có trên key thì chặn", () => {
  const out = judgeKey({ ...base, ids: ["openai/gpt-oss-120b"] }, need);
  assert.equal(out.state, "bad");
  assert.match(out.text, /whisper-large-v3-turbo/);
});

test("không dùng Whisper Groq hoặc để máy tự chọn model dịch thì không đòi model đó", () => {
  assert.equal(judgeKey({ ...base, ids: ["x"] }, { asr: null, chat: null }).state, "ok");
});

test("Groq trả danh sách rỗng thì chỉ cảnh báo", () => {
  assert.equal(judgeKey({ ...base, ids: [] }, need).state, "warn");
});

test("mã lạ khác 2xx bị chặn", () => {
  assert.equal(judgeKey({ ...base, status: 404, ids: [] }, need).state, "bad");
});
