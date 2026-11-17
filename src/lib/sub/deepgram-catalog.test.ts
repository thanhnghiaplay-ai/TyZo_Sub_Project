import assert from "node:assert/strict";
import test from "node:test";
import { DEEPGRAM_ROWS, deepgramRow } from "./deepgram-catalog.ts";

test("Nova-3 có giá giờ 0,258 đô", () => {
  assert.equal(deepgramRow("deepgram-nova-3")?.usdPerHour, 0.258);
  assert.equal(deepgramRow("khong-co"), null);
});

test("mọi dòng Deepgram là giá theo giờ, không có giá chữ hay token", () => {
  for (const row of DEEPGRAM_ROWS) {
    assert.ok((row.usdPerHour ?? 0) > 0);
    assert.equal(row.usdIn, null);
    assert.equal(row.usdPerMillionChars, null);
  }
});
