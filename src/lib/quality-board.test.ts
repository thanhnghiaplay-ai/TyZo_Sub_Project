import test from "node:test";
import assert from "node:assert/strict";
import { compareVersionDesc, groupRollup, hintsFor, langCheckVerdict, parseQualityReport, reportFromSummary, rollup, type BoardRow } from "./quality-board.ts";
import { summarizeQuality } from "./sub/quality.ts";

const good = {
  appVersion: "3.13.0",
  keySource: "own",
  asrModel: "whisper-large-v3-turbo",
  sourceLang: "zh",
  seconds: 600,
  segments: 100,
  high: 80,
  check: 15,
  low: 5,
  unknown: 0,
  confMean: 0.7,
  partsTotal: 12,
  partsWhisper: 10,
  partsEmpty: 1,
  partsSilence: 1,
  partsDecodeFail: 0,
  appFiltered: 3,
  keptCues: 95,
  health: "green",
  langCheck: false,
  langSuspect: 0,
  langResent: 0,
  langSwapped: 0,
  langBefore: null,
  langAfter: null,
};

const row = (over: Partial<BoardRow> = {}): BoardRow => ({
  day: "2026-11-11",
  keySource: "own",
  sourceLang: "zh",
  asrModel: "whisper-large-v3-turbo",
  appVersion: "3.13.0",
  runs: 1,
  seconds: 600,
  segments: 100,
  high: 80,
  check: 15,
  low: 5,
  unknown: 0,
  confSum: 70,
  confWeight: 100,
  partsTotal: 12,
  partsWhisper: 10,
  partsEmpty: 1,
  partsSilence: 1,
  partsDecodeFail: 0,
  appFiltered: 3,
  keptCues: 95,
  langRuns: 0,
  langSuspect: 0,
  langResent: 0,
  langSwapped: 0,
  langBeforeSum: 0,
  langAfterSum: 0,
  langWeight: 0,
  healthGreen: 1,
  healthYellow: 0,
  healthRed: 0,
  healthUnknown: 0,
  ...over,
});

test("parseQualityReport: nhận bản đúng và chỉ giữ các trường đã định", () => {
  const out = parseQualityReport({ ...good, extra: "tên tệp.mp4", text: "phụ đề" });
  assert.equal(out.segments, 100);
  assert.equal("extra" in out, false);
  assert.equal("text" in out, false);
});

test("parseQualityReport: từ chối dữ liệu sai", () => {
  const bad = (over: Record<string, unknown>) => assert.throws(() => parseQualityReport({ ...good, ...over }));
  bad({ appVersion: "abc" });
  bad({ keySource: "khac" });
  bad({ sourceLang: "vi" });
  bad({ health: "blue" });
  bad({ segments: -1 });
  bad({ segments: NaN });
  bad({ confMean: 1.5 });
  bad({ high: 90, check: 20 });
  bad({ partsWhisper: 20 });
  bad({ langSuspect: 0, langResent: 1 });
  bad({ partsTotal: 0, partsWhisper: 0, partsEmpty: 0, partsSilence: 0 });
  bad({ asrModel: "x y" });
  assert.throws(() => parseQualityReport(null));
  assert.throws(() => parseQualityReport("x"));
});

test("reportFromSummary tạo bản báo hợp lệ và không chứa chữ", () => {
  const raw = [
    {
      partIndex: 0, start: 0, end: 60, requestedLanguage: "zh", detectedLanguage: "chinese", language: "zh", kind: "whisper" as const,
      segments: [{ text: "你好朋友们大家好", start: 0, end: 2, avg_logprob: -0.2 }, { text: "再见", start: 2, end: 3, avg_logprob: -0.3 }],
    },
  ];
  const s = summarizeQuality({ raw, rejects: [], kept: 2 });
  const rep = reportFromSummary(s, { appVersion: "3.13.0", keySource: "room", asrModel: "whisper-large-v3", sourceLang: "zh", seconds: 59.6, langCheck: true });
  assert.equal(rep.seconds, 60);
  assert.equal(rep.segments, 2);
  assert.equal(JSON.stringify(rep).includes("你好"), false);
  assert.doesNotThrow(() => parseQualityReport(rep));
});

test("rollup: cộng số, độ tin theo trọng số, đèn theo tổng", () => {
  const r = rollup([row(), row({ keySource: "room", confSum: 30, confWeight: 100, high: 50, check: 30, low: 20 })]);
  assert.equal(r.runs, 2);
  assert.equal(r.segments, 200);
  assert.equal(r.bands.high, 130);
  assert.ok(Math.abs((r.meanConfidence as number) - 0.5) < 1e-9);
  assert.equal(r.health, "yellow");
});

test("rollup: không có dòng thì đèn chưa đủ số liệu, độ tin null", () => {
  const r = rollup([]);
  assert.equal(r.health, "unknown");
  assert.equal(r.meanConfidence, null);
  assert.equal(r.runs, 0);
});

test("rollup: kiểm tra ngôn ngữ trung bình trước/sau theo trọng số số đoạn đổi", () => {
  const r = rollup([
    row({ langRuns: 1, langSuspect: 3, langResent: 2, langSwapped: 2, langBeforeSum: 0.3 * 2, langAfterSum: 0.8 * 2, langWeight: 2 }),
    row({ langRuns: 1, langSuspect: 1, langResent: 1, langSwapped: 1, langBeforeSum: 0.6, langAfterSum: 0.9, langWeight: 1 }),
  ]);
  assert.equal(r.lang.swapped, 3);
  assert.ok(Math.abs((r.lang.meanBefore as number) - 0.4) < 1e-9);
  assert.ok(Math.abs((r.lang.meanAfter as number) - (0.8 * 2 + 0.9) / 3) < 1e-9);
});

test("groupRollup nhóm theo khóa và sắp xếp", () => {
  const g = groupRollup([row({ sourceLang: "zh" }), row({ sourceLang: "en" }), row({ sourceLang: "zh" })], (r) => r.sourceLang);
  assert.deepEqual(g.map((x) => [x.key, x.rollup.runs]), [["en", 1], ["zh", 2]]);
});

test("compareVersionDesc: mới trước", () => {
  assert.deepEqual(["3.9.0", "3.13.0", "3.12.1"].sort(compareVersionDesc), ["3.13.0", "3.12.1", "3.9.0"]);
});

test("hintsFor: không có số thì không gợi ý, số xấu thì gợi ý đúng chỗ", () => {
  assert.deepEqual(hintsFor(rollup([])), []);
  assert.deepEqual(hintsFor(rollup([row()])), []);
  const bad = hintsFor(rollup([row({ partsDecodeFail: 4, low: 30, high: 60, check: 10, appFiltered: 40, partsEmpty: 5 })]));
  assert.equal(bad.length, 4);
  assert.ok(bad.some((h) => h.includes("không trả câu")));
  assert.ok(bad.some((h) => h.includes("giải mã")));
  assert.ok(bad.some((h) => h.includes("độ tin thấp")));
  assert.ok(bad.some((h) => h.includes("lọc")));
});

test("langCheckVerdict", () => {
  const base = { runsOn: 1, suspect: 20, resent: 15, swapped: 12, meanBefore: 0.3, meanAfter: 0.6 };
  assert.ok(langCheckVerdict({ ...base, runsOn: 0 }).includes("Chưa có lần chạy"));
  assert.ok(langCheckVerdict({ ...base, swapped: 3 }).includes("chưa đủ"));
  assert.ok(langCheckVerdict(base).includes("Có ích"));
  assert.ok(langCheckVerdict({ ...base, meanAfter: 0.32 }).includes("Chưa rõ"));
  assert.ok(langCheckVerdict({ ...base, meanAfter: 0.2 }).includes("Chưa nên bật"));
  assert.ok(langCheckVerdict({ ...base, meanBefore: null }).includes("Chưa có độ tin"));
});

test("chuỗi đầy đủ: đủ bốn loại đoạn và kiểm tra ngôn ngữ đều ra bản báo hợp lệ", () => {
  const mk = (partIndex: number, kind: "whisper" | "whisper_empty" | "silence" | "decode_fail", segs: Array<[string, number]> = []) => ({
    partIndex, start: partIndex * 60, end: partIndex * 60 + 60, requestedLanguage: "zh", detectedLanguage: "chinese", language: "zh", kind,
    segments: segs.map(([text, avg_logprob]) => ({ text, start: 0, end: 1, avg_logprob })),
  });
  const raw = [mk(0, "whisper", [["这个项目黄了", -0.2], ["你我都脱不了干系", -0.9]]), mk(1, "whisper_empty"), mk(2, "silence"), mk(3, "decode_fail")];
  const lang = {
    suspect: 2, resent: 1, swapped: 1, usedSeconds: 60, budgetSeconds: 120,
    events: [{ partIndex: 0, start: 0, requested: "zh", detected: "en", swapped: true, logprobBefore: -1, logprobAfter: -0.3, before: "x", after: "y" }],
  };
  const s = summarizeQuality({ raw, rejects: [], kept: 2, lang });
  const rep = reportFromSummary(s, { appVersion: "3.13.0", keySource: "own", asrModel: "whisper-large-v3-turbo", sourceLang: "zh", seconds: 240, langCheck: true });
  const parsed = parseQualityReport(JSON.parse(JSON.stringify(rep)));
  assert.equal(parsed.partsTotal, 4);
  assert.equal(parsed.partsDecodeFail, 1);
  assert.equal(parsed.langSwapped, 1);
  assert.ok(parsed.langBefore !== null && parsed.langAfter !== null && parsed.langAfter > parsed.langBefore);
});

test("bản báo đi qua JSON: giá trị null vẫn hợp lệ", () => {
  const raw = [{ partIndex: 0, start: 0, end: 60, requestedLanguage: "en", detectedLanguage: "english", language: "en", kind: "whisper" as const, segments: [{ text: "hello there my friend", start: 0, end: 1 }] }];
  const s = summarizeQuality({ raw, rejects: [], kept: 1 });
  const rep = reportFromSummary(s, { appVersion: "3.13.0", keySource: "room", asrModel: "whisper-large-v3", sourceLang: "en", seconds: 60, langCheck: false });
  assert.equal(rep.confMean, null);
  assert.doesNotThrow(() => parseQualityReport(JSON.parse(JSON.stringify(rep))));
});
