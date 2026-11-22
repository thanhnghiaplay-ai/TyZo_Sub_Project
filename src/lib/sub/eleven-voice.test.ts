import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ELEVEN_TTS_ID,
  elevenPieces,
  elevenReady,
  elevenSpeakBody,
  elevenSpeakPath,
  elevenTtsErrorText,
  parseElevenVoices,
  pickElevenVoice,
} from "./eleven-voice.ts";
import { ELEVENLABS_BASE_ROWS } from "./elevenlabs-base.ts";
import { modelRoleOf } from "./model-role.ts";
import { catalogFor } from "./model-catalog.ts";
import { providerHas } from "./provider.ts";

describe("giọng đọc ElevenLabs: khai báo", () => {
  it("nhà có khả năng đọc, model ở danh mục và bảng giá theo ký tự", () => {
    assert.equal(providerHas("elevenlabs", "tts"), true);
    assert.equal(providerHas("elevenlabs", "chat"), false);
    assert.deepEqual(catalogFor("elevenlabs", "tts").map((m) => m.id), [ELEVEN_TTS_ID]);
    assert.equal(ELEVENLABS_BASE_ROWS.find((row) => row.id === ELEVEN_TTS_ID)?.usdPerMillionChars, 40);
    assert.equal(modelRoleOf(ELEVEN_TTS_ID), "tts");
  });
  it("đọc được tiếng Việt và các tiếng của app, trừ tiếng Thái", () => {
    assert.equal(elevenReady("Vietnamese"), "vi");
    assert.equal(elevenReady("English"), "en");
    assert.equal(elevenReady("Arabic"), "ar");
    assert.equal(elevenReady("Thai"), null);
    assert.equal(elevenReady("Klingon"), null);
  });
});

describe("danh sách giọng", () => {
  const payload = {
    voices: [
      { voice_id: "AAAAAAAAAAAAAAAAAAAA", name: "Lan  Anh", labels: { gender: "female" } },
      { voice_id: "BBBBBBBBBBBBBBBBBBBB", name: "Minh", labels: { gender: "male" } },
      { voice_id: "CCCCCCCCCCCCCCCCCCCC", name: "Khác", labels: {} },
      { voice_id: "../bad", name: "x" },
      { voice_id: "AAAAAAAAAAAAAAAAAAAA", name: "trùng" },
    ],
  };
  const list = parseElevenVoices(payload);
  it("đọc mã, tên, giới; bỏ mã lạ và trùng", () => {
    assert.deepEqual(list, [
      { id: "AAAAAAAAAAAAAAAAAAAA", name: "Lan Anh", gender: "female" },
      { id: "BBBBBBBBBBBBBBBBBBBB", name: "Minh", gender: "male" },
      { id: "CCCCCCCCCCCCCCCCCCCC", name: "Khác", gender: "any" },
    ]);
    assert.deepEqual(parseElevenVoices(null), []);
  });
  it("chọn giọng: giữ giọng đã chọn; đọc theo phim thì đổi sang giọng đúng giới", () => {
    assert.equal(pickElevenVoice(list, "BBBBBBBBBBBBBBBBBBBB", "female", false), "BBBBBBBBBBBBBBBBBBBB");
    assert.equal(pickElevenVoice(list, "BBBBBBBBBBBBBBBBBBBB", "female", true), "AAAAAAAAAAAAAAAAAAAA");
    assert.equal(pickElevenVoice(list, "", "male", true), "BBBBBBBBBBBBBBBBBBBB");
    assert.equal(pickElevenVoice(list, "", "any", false), "AAAAAAAAAAAAAAAAAAAA");
    assert.equal(pickElevenVoice([], "x", "any", false), null);
  });
});

describe("yêu cầu đọc", () => {
  it("đường, thân, cắt mảnh", () => {
    assert.equal(elevenSpeakPath("AAAAAAAAAAAAAAAAAAAA"), "/text-to-speech/AAAAAAAAAAAAAAAAAAAA?output_format=mp3_44100_128");
    assert.throws(() => elevenSpeakPath("../../x"));
    assert.deepEqual(elevenSpeakBody("  Xin   chào ", "vi"), { text: "Xin chào", model_id: "eleven_flash_v2_5", language_code: "vi" });
    assert.deepEqual(elevenSpeakBody("Hi", ""), { text: "Hi", model_id: "eleven_flash_v2_5" });
    assert.throws(() => elevenSpeakBody("  ", "vi"));
    const pieces = elevenPieces("Câu một dài. ".repeat(60), 100);
    assert.ok(pieces.length > 1 && pieces.every((p) => p.length <= 100));
    assert.deepEqual(elevenPieces(""), []);
  });
  it("lỗi tiếng Việt", () => {
    assert.match(elevenTtsErrorText(401, null), /Key ElevenLabs không đúng/);
    assert.match(elevenTtsErrorText(402, null), /hết hạn mức/);
    assert.match(elevenTtsErrorText(404, { detail: { status: "voice_not_found", message: "Voice not found" } }), /giọng khác/);
    assert.match(elevenTtsErrorText(429, null), /giới hạn tốc độ/);
    const perm = { detail: { status: "missing_permissions", message: "The API key you used is missing the permission voices_read to execute this operation." } };
    assert.match(elevenTtsErrorText(401, perm), /đúng nhưng thiếu quyền voices_read/);
  });
});
