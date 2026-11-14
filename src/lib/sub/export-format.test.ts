import assert from "node:assert/strict";
import test from "node:test";
import { toSrt, toTxt, toVtt } from "./text.ts";
import type { Seg } from "./types.ts";

const seg = (start: number, end: number, original: string, translation: string | null, extra: Partial<Seg> = {}): Seg =>
  ({ start, end, original, translation, ...extra }) as Seg;

const items = [seg(1.5, 3.2, "Hello", "Xin chào"), seg(3.5, 5, "Bye", null), seg(6, 7, "No", "x", { translationFailed: true })];

test("SRT dùng dấu phẩy, VTT dùng dấu chấm và có dòng WEBVTT", () => {
  assert.match(toSrt(items), /00:00:01,500 --> 00:00:03,200/);
  const vtt = toVtt(items);
  assert.ok(vtt.startsWith("WEBVTT\n\n"));
  assert.match(vtt, /00:00:01\.500 --> 00:00:03\.200/);
  assert.doesNotMatch(vtt, /\d,\d{3} -->/);
});

test("VTT và SRT cùng chữ, câu chưa dịch giữ nhãn", () => {
  assert.match(toVtt(items), /\[chưa dịch\] Bye/);
  assert.match(toVtt(items), /\[không dịch được\] No/);
});

test("TXT chỉ có chữ, mỗi câu một dòng, không giờ", () => {
  assert.equal(toTxt(items), "Xin chào\n[chưa dịch] Bye\n[không dịch được] No\n");
  assert.doesNotMatch(toTxt(items), /-->/);
});

test("TXT gộp xuống dòng trong một câu", () => {
  assert.equal(toTxt([seg(0, 1, "a", "dòng một\n dòng hai")]), "dòng một dòng hai\n");
});
