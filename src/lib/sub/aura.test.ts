import assert from "node:assert/strict";
import test from "node:test";
import { auraErrorText, auraModel, auraPieces, auraReady, auraSpeakUrl, auraVoiceOk, defaultAuraVoice, isAuraModel, AURA_MAX_CHARS } from "./aura.ts";

test("auraReady chỉ nhận tiếng Anh và Tây Ban Nha", () => {
  assert.equal(auraReady("English"), "en");
  assert.equal(auraReady("Spanish"), "es");
  assert.equal(auraReady("Vietnamese"), null);
  assert.equal(auraReady("Japanese"), null);
});

test("giọng mặc định theo giới tính", () => {
  assert.equal(defaultAuraVoice("en", "female"), "thalia");
  assert.equal(defaultAuraVoice("en", "male"), "apollo");
  assert.equal(defaultAuraVoice("es", "any"), "celeste");
  assert.equal(auraVoiceOk("en", "celeste"), false);
});

test("tên model và địa chỉ", () => {
  assert.equal(auraModel("thalia", "en"), "aura-2-thalia-en");
  assert.equal(isAuraModel("aura-2-thalia-en"), true);
  assert.equal(isAuraModel("aura-2-thalia-vi"), false);
  assert.equal(isAuraModel("nova-3"), false);
  assert.equal(auraSpeakUrl("aura-2-sirio-es"), "https://api.deepgram.com/v1/speak?model=aura-2-sirio-es&encoding=mp3");
  assert.throws(() => auraSpeakUrl("nova-3"), /không đúng/);
});

test("auraPieces cắt theo dấu câu và không vượt trần", () => {
  assert.deepEqual(auraPieces("  "), []);
  assert.deepEqual(auraPieces("Hello there."), ["Hello there."]);
  const long = Array.from({ length: 60 }, (_, i) => `Sentence number ${i}.`).join(" ");
  const pieces = auraPieces(long, 200);
  assert.ok(pieces.length > 3);
  for (const piece of pieces) assert.ok(piece.length <= 200 && piece.length > 0);
  assert.equal(pieces.join(" "), long);
  for (const piece of auraPieces("x".repeat(5000), 99999)) assert.ok(piece.length <= AURA_MAX_CHARS);
});

test("câu báo lỗi", () => {
  assert.match(auraErrorText(401, null), /Key Deepgram/);
  assert.match(auraErrorText(402, null), /hết tiền/);
  assert.match(auraErrorText(429, null), /giới hạn/);
  assert.match(auraErrorText(400, { err_msg: "bad text" }), /bad text/);
  assert.match(auraErrorText(500, null), /500/);
});
