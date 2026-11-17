import assert from "node:assert/strict";
import test from "node:test";
import { asrPickerRows } from "./asr-picker.ts";
import { ASR_MODELS } from "./sub/models.ts";

const none = () => false;

test("mọi model nhận dạng trong ASR_MODELS đều có hàng, giữ thứ tự nhà", () => {
  const rows = asrPickerRows({ showRoomPrice: false, allow: {}, roomHeld: none });
  for (const model of ASR_MODELS) assert.ok(rows.some((row) => row.id === model.id), model.id);
  assert.equal(rows.length, ASR_MODELS.length);
});

test("thuê phòng: chưa lưu danh sách thì mở hết", () => {
  const rows = asrPickerRows({ showRoomPrice: false, allow: { groq: null, alibaba: null, deepgram: null }, roomHeld: none });
  assert.ok(rows.every((row) => !row.disabled && row.state === "open"));
});

test("thuê phòng: Chủ chỉ mở Whisper Turbo thì các model khác khóa 'closed'", () => {
  const rows = asrPickerRows({ showRoomPrice: false, allow: { groq: ["whisper-large-v3-turbo"], alibaba: [], deepgram: [] }, roomHeld: none });
  const by = Object.fromEntries(rows.map((row) => [row.id, row]));
  assert.equal(by["whisper-large-v3-turbo"].disabled, false);
  assert.equal(by["whisper-large-v3"].state, "closed");
  assert.equal(by["deepgram-nova-3"].disabled, true);
  assert.equal(by["qwen-audio-3.0-asr-flash-filetrans"].state, "closed");
});

test("trả theo lượt: Groq theo roomHeld, nhà khác khóa 'noRoom'", () => {
  const rows = asrPickerRows({ showRoomPrice: true, allow: {}, roomHeld: (id) => id === "whisper-large-v3" });
  const by = Object.fromEntries(rows.map((row) => [row.id, row]));
  assert.equal(by["whisper-large-v3-turbo"].state, "room");
  assert.equal(by["whisper-large-v3-turbo"].disabled, false);
  assert.equal(by["whisper-large-v3"].disabled, true);
  assert.equal(by["deepgram-nova-3"].state, "noRoom");
  assert.equal(by["deepgram-nova-3"].disabled, true);
});
