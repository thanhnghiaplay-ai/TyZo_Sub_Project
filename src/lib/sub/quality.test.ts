import test from "node:test";
import assert from "node:assert/strict";
import { bandOf, confidenceOf, healthOf, summarizeQuality } from "./quality.ts";
import type { RawAsrPart } from "./diagnostics.ts";

const part = (partIndex: number, kind: RawAsrPart["kind"], segs: Array<[string, number?, number?]> = [], language = "zh"): RawAsrPart => ({
  partIndex,
  start: partIndex * 60,
  end: partIndex * 60 + 60,
  requestedLanguage: "zh",
  detectedLanguage: language,
  language,
  kind,
  segments: segs.map(([text, avg_logprob, compression_ratio]) => ({ text, start: 0, end: 1, avg_logprob, compression_ratio })),
});

test("confidenceOf: e mũ logprob, kẹp 0..1, thiếu số thì null", () => {
  assert.ok(Math.abs((confidenceOf(-0.3) as number) - Math.exp(-0.3)) < 1e-9);
  assert.equal(confidenceOf(0.5), 1);
  assert.equal(confidenceOf(undefined), null);
  assert.equal(confidenceOf(NaN), null);
});

test("bandOf: cao, cần kiểm tra, thấp, nén cao, không rõ", () => {
  assert.equal(bandOf({ avg_logprob: -0.2 }), "high");
  assert.equal(bandOf({ avg_logprob: -0.5 }), "high");
  assert.equal(bandOf({ avg_logprob: -0.6 }), "check");
  assert.equal(bandOf({ avg_logprob: -0.9 }), "low");
  assert.equal(bandOf({ avg_logprob: -0.2, compression_ratio: 3 }), "low");
  assert.equal(bandOf({}), "unknown");
});

test("healthOf: ít câu thì chưa đánh giá", () => {
  const r = healthOf({ segments: 3, bands: { high: 3, check: 0, low: 0, unknown: 0 }, parts: { total: 1, decodeFail: 0 }, appFiltered: 0 });
  assert.equal(r.health, "unknown");
});

test("healthOf: xanh, vàng, đỏ theo ngưỡng", () => {
  const base = { segments: 100, parts: { total: 50, decodeFail: 0 }, appFiltered: 0 };
  assert.equal(healthOf({ ...base, bands: { high: 90, check: 8, low: 2, unknown: 0 } }).health, "green");
  assert.equal(healthOf({ ...base, bands: { high: 80, check: 6, low: 14, unknown: 0 } }).health, "yellow");
  assert.equal(healthOf({ ...base, bands: { high: 50, check: 20, low: 30, unknown: 0 } }).health, "red");
  assert.equal(healthOf({ ...base, bands: { high: 50, check: 40, low: 10, unknown: 0 } }).health, "yellow");
  assert.equal(healthOf({ ...base, parts: { total: 50, decodeFail: 8 }, bands: { high: 95, check: 5, low: 0, unknown: 0 } }).health, "red");
  assert.equal(healthOf({ ...base, parts: { total: 50, decodeFail: 3 }, bands: { high: 95, check: 5, low: 0, unknown: 0 } }).health, "yellow");
  assert.equal(healthOf({ ...base, appFiltered: 40, bands: { high: 95, check: 5, low: 0, unknown: 0 } }).health, "yellow");
});

test("summarizeQuality: đếm đoạn, câu, mức tin, ngôn ngữ", () => {
  const raw = [
    part(0, "whisper", [["你好吗朋友", -0.2], ["再见了", -0.4]]),
    part(1, "whisper", [["Hello there my friend", -0.9]], "en"),
    part(2, "whisper_empty"),
    part(3, "silence"),
    part(4, "decode_fail"),
  ];
  const s = summarizeQuality({ raw, rejects: [], kept: 3 });
  assert.equal(s.segments, 3);
  assert.deepEqual(s.bands, { high: 2, check: 0, low: 1, unknown: 0 });
  assert.deepEqual(s.parts, { total: 5, whisper: 2, empty: 1, silence: 1, decodeFail: 1 });
  assert.equal(s.keptCues, 3);
  assert.equal(s.byLanguage.length, 2);
  assert.ok(s.meanConfidence !== null && s.meanConfidence > 0 && s.meanConfidence < 1);
  assert.equal(s.health, "unknown");
});

test("summarizeQuality: câu trống và thiếu logprob không làm sai", () => {
  const raw = [part(0, "whisper", [["", -0.1], ["abc", undefined]])];
  const s = summarizeQuality({ raw, rejects: [], kept: 0 });
  assert.equal(s.segments, 1);
  assert.deepEqual(s.bands, { high: 0, check: 0, low: 0, unknown: 1 });
  assert.equal(s.meanConfidence, null);
});

test("summarizeQuality: kiểm tra ngôn ngữ, trung bình trước và sau chỉ tính câu đã đổi", () => {
  const lang = {
    suspect: 3,
    resent: 2,
    swapped: 1,
    usedSeconds: 60,
    budgetSeconds: 120,
    events: [
      { partIndex: 1, start: 60, requested: "zh", detected: "en", swapped: true, logprobBefore: -1.2, logprobAfter: -0.2, before: "a", after: "b" },
      { partIndex: 2, start: 120, requested: "zh", detected: "en", swapped: false, logprobBefore: -1, logprobAfter: -1, before: "a", after: "b" },
    ],
  };
  const s = summarizeQuality({ raw: [], rejects: [], kept: 0, lang });
  assert.equal(s.langCheck.suspect, 3);
  assert.equal(s.langCheck.swapped, 1);
  assert.ok(Math.abs((s.langCheck.meanBefore as number) - Math.exp(-1.2)) < 1e-9);
  assert.ok(Math.abs((s.langCheck.meanAfter as number) - Math.exp(-0.2)) < 1e-9);
});
