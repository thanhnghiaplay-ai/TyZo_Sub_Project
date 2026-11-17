import assert from "node:assert/strict";
import test from "node:test";
import { DEEPGRAM_ROWS, deepgramRow, deepgramRowFor } from "./deepgram-catalog.ts";

test("Nova-3 có giá giờ 0,288 đô", () => {
  assert.equal(deepgramRow("deepgram-nova-3")?.usdPerHour, 0.288);
  assert.equal(deepgramRow("khong-co"), null);
});

test("mỗi dòng Deepgram chỉ có một loại giá (giờ hoặc ký tự), không có giá token", () => {
  for (const row of DEEPGRAM_ROWS) {
    assert.ok((row.usdPerHour ?? 0) > 0 !== (row.usdPerMillionChars ?? 0) > 0);
    assert.equal(row.usdIn, null);
    assert.equal(row.usdOut, null);
  }
});

test("mọi giọng Aura-2 dùng chung giá 30 đô mỗi triệu ký tự", () => {
  const row = deepgramRowFor("aura-2-thalia-en");
  assert.equal(row?.id, "aura-2-thalia-en");
  assert.equal(row?.usdPerMillionChars, 30);
  assert.equal(deepgramRowFor("aura-2-sirio-es")?.usdPerMillionChars, 30);
  assert.equal(deepgramRowFor("aura-2-thalia-vi"), null);
  assert.equal(deepgramRowFor("deepgram-nova-3")?.usdPerHour, 0.288);
});
