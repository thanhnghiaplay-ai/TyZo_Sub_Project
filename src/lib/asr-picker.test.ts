import assert from "node:assert/strict";
import test from "node:test";
import { asrPickerRows } from "./asr-picker.ts";
import { asrHouse } from "./sub/asr-house.ts";
import { ASR_MODELS } from "./sub/models.ts";
import { PROVIDER_IDS } from "./sub/provider.ts";

const none = () => false;

test("mọi model nhận dạng của nhà đã ready đều có hàng; nhà chưa ready (ready: false) bị ẩn", () => {
  const rows = asrPickerRows({ showRoomPrice: false, allow: {}, roomHeld: none });
  const shown = ASR_MODELS.filter((model) => {
    const house = asrHouse(model.id);
    return house !== null && PROVIDER_IDS.includes(house);
  });
  for (const model of shown) assert.ok(rows.some((row) => row.id === model.id), model.id);
  assert.equal(rows.length, shown.length);
  for (const model of ASR_MODELS) {
    const house = asrHouse(model.id);
    if (house && !PROVIDER_IDS.includes(house)) assert.ok(!rows.some((row) => row.id === model.id), `${model.id} chưa ready mà đã hiện`);
  }
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

test("trả theo lượt: mọi nhà chạy được, model bị giữ thì khóa", () => {
  const rows = asrPickerRows({ showRoomPrice: true, allow: {}, roomHeld: (id) => id === "whisper-large-v3" });
  const by = Object.fromEntries(rows.map((row) => [row.id, row]));
  assert.equal(by["whisper-large-v3-turbo"].state, "room");
  assert.equal(by["whisper-large-v3-turbo"].disabled, false);
  assert.equal(by["whisper-large-v3"].disabled, true);
  assert.equal(by["deepgram-nova-3"].state, "room");
  assert.equal(by["deepgram-nova-3"].disabled, false);
  assert.equal(by["qwen-audio-3.0-asr-flash-filetrans"].disabled, false);
});

test("key khách không có model Groq thì khóa 'noKey'; Chủ chưa mở vẫn 'closed'; nhà chưa đáng tin không khóa", () => {
  const rows = asrPickerRows({
    showRoomPrice: false,
    allow: { groq: ["whisper-large-v3-turbo", "whisper-large-v3"], alibaba: null, deepgram: null },
    roomHeld: none,
    keyModels: { groq: ["whisper-large-v3-turbo"], alibaba: ["qwen-plus"], deepgram: ["x"] },
  });
  const by = Object.fromEntries(rows.map((row) => [row.id, row]));
  assert.equal(by["whisper-large-v3-turbo"].state, "open");
  assert.equal(by["whisper-large-v3"].state, "noKey");
  assert.equal(by["whisper-large-v3"].disabled, true);
  assert.equal(by["deepgram-nova-3"].state, "open");
  assert.equal(by["qwen-audio-3.0-asr-flash-filetrans"].state, "open");
});
