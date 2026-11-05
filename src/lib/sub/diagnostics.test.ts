import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptSegment, SHORT_LOGPROB_KEEP } from "./text.ts";
import { buildDiagnosticsExport, ingestAsrPart, keepRejectedCue, languageBucket, slicePcm, summarizeDiagnostics, type RejectEntry } from "./diagnostics.ts";
import type { Seg } from "./types.ts";

function cue(start: number, text: string, end = start + 1): Seg {
  return { start, end, original: text, translation: null };
}

describe("acceptSegment — cùng kết quả phụ đề, có lý do loại", () => {
  it("giữ câu nói bình thường", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, 0, 1.2, 2.4, "  Xin chào  ", 0, { no_speech_prob: 0.1, avg_logprob: -0.2 });
    assert.equal(decision.accepted, true);
    assert.equal(decision.reason, null);
    assert.equal(segs.length, 1);
    assert.equal(segs[0].original, "Xin chào");
    assert.equal(segs[0].start, 1.2);
    assert.equal(segs[0].end, 2.4);
    assert.equal(segs[0].translation, null);
  });

  it("giữ lời ngắn khi model tự tin — không siết filter", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, 0, 0, 0.4, "Ừ", 0, { no_speech_prob: 0.2, avg_logprob: -0.1 });
    assert.equal(decision.accepted, true);
    assert.equal(segs.length, 1);
    assert.equal(segs[0].original, "Ừ");
  });

  it("bỏ A/Ah dù model tự tin", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, 5, 0.2, 0.5, "A", 0, { no_speech_prob: 0.05, avg_logprob: -0.1 });
    assert.equal(decision.accepted, false);
    assert.equal(decision.reason, "non_speech");
    assert.equal(decision.text, "A");
    assert.equal(decision.start, 5.2);
    assert.equal(segs.length, 0);
  });

  it("không loại câu ảo khi điểm số tự tin", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, 0, 0, 1, "Thanks for watching", 0, { no_speech_prob: 0.1, avg_logprob: -0.2 });
    assert.equal(decision.accepted, true);
    assert.equal(segs.length, 1);
  });

  it("loại câu ảo khi no_speech cao", () => {
    const segs: Seg[] = [];
    const decision = acceptSegment(segs, 0, 0, 1, "Thanks for watching", 0, { no_speech_prob: 0.4, avg_logprob: -0.2 });
    assert.equal(decision.reason, "hallucination");
    assert.equal(segs.length, 0);
  });

  it("loại nén cao, độ tin thấp, biên chồng và câu trùng", () => {
    const segs: Seg[] = [];
    assert.equal(acceptSegment(segs, 0, 0, 1, "hello there", 0, { compression_ratio: 2.5, avg_logprob: -0.6 }).reason, "compression");
    assert.equal(acceptSegment(segs, 0, 0, 1, "hello there", 0, { no_speech_prob: 0.9, avg_logprob: -0.9 }).reason, "low_confidence");
    assert.equal(acceptSegment(segs, 0, 0, 0.3, "Ừ", 0, { no_speech_prob: 0.7 }).reason, "short_uncertain");
    assert.equal(acceptSegment(segs, 0, 0, 0.4, "Yeah", 0, { no_speech_prob: 0.9 }).reason, "brief_uncertain");
    assert.equal(segs.length, 0);

    const keptShort: Seg[] = [];
    const sure = acceptSegment(keptShort, 0, 0, 0.3, "Ừ", 0, { no_speech_prob: 0.7, avg_logprob: SHORT_LOGPROB_KEEP });
    assert.equal(sure.accepted, true);
    assert.equal(keptShort[0].original, "Ừ");
    const stillShort = acceptSegment([], 0, 0, 0.3, "Ừ", 0, { no_speech_prob: 0.7, avg_logprob: SHORT_LOGPROB_KEEP - 0.2 });
    assert.equal(stillShort.reason, "short_uncertain");
    const sureBrief = acceptSegment([], 0, 0, 0.4, "Yeah", 0, { no_speech_prob: 0.9, avg_logprob: -0.2 });
    assert.equal(sureBrief.accepted, true);
    const breath = acceptSegment([], 0, 0, 0.4, "A", 0, { no_speech_prob: 0.05, avg_logprob: -0.1 });
    assert.equal(breath.reason, "non_speech");
    assert.equal(acceptSegment(segs, 0, Number.NaN, 1, "xin chào", 0).reason, "bad_time");
    assert.equal(acceptSegment(segs, 0, 0, 1, "   ", 0).reason, "empty");
    assert.equal(acceptSegment(segs, 0, 0, 1, "...", 0).reason, "no_letters");
    assert.equal(segs.length, 0);

    const kept = acceptSegment(segs, 10, 1.2, 2, "Tôi đi đây", 1, {});
    assert.equal(kept.accepted, true);
    const overlap = acceptSegment(segs, 12, 0.2, 0.8, "câu sau", 1, {});
    assert.equal(overlap.reason, "overlap");
    assert.equal(overlap.start, 12.2);
    const dup = acceptSegment(segs, 10, 1.3, 2.2, "Tôi đi đây", 0, {});
    assert.equal(dup.reason, "duplicate");
    assert.deepEqual(
      segs.map((seg) => seg.original),
      ["Tôi đi đây"],
    );
  });
});

describe("ingestAsrPart", () => {
  it("phân biệt Whisper không trả câu với app lọc bỏ", () => {
    const segs: Seg[] = [];
    const empty = ingestAsrPart({
      partIndex: 0,
      chunkStart: 0,
      chunkEnd: 60,
      requestedLanguage: "ja",
      result: { language: "ja", segments: [] },
      segs,
    });
    assert.equal(empty.raw.kind, "whisper_empty");
    assert.equal(empty.rejects.length, 0);
    assert.equal(segs.length, 0);

    const mixed = ingestAsrPart({
      partIndex: 1,
      chunkStart: 58,
      chunkEnd: 118,
      requestedLanguage: "",
      result: {
        language: "Japanese",
        segments: [
          { text: "おはよう", start: 2, end: 3, no_speech_prob: 0.1, avg_logprob: -0.2, compression_ratio: 1.1 },
          { text: "Ah", start: 4, end: 4.4, no_speech_prob: 0.2, avg_logprob: -0.3, compression_ratio: 1 },
          null,
        ],
      },
      segs,
    });
    assert.equal(mixed.raw.kind, "whisper");
    assert.equal(mixed.raw.language, "japanese");
    assert.equal(mixed.raw.segments.length, 3);
    assert.equal(mixed.rejects.length, 1);
    assert.equal(mixed.rejects[0].reason, "non_speech");
    assert.equal(mixed.rejects[0].text, "Ah");
    assert.equal(mixed.rejects[0].no_speech_prob, 0.2);
    assert.equal(mixed.rejects[0].language, "japanese");
    assert.deepEqual(
      segs.map((seg) => seg.original),
      ["おはよう"],
    );

    const silence = ingestAsrPart({
      partIndex: 2,
      chunkStart: 120,
      chunkEnd: 180,
      requestedLanguage: "ja",
      result: "skip",
      segs,
    });
    assert.equal(silence.raw.kind, "silence");
    assert.equal(silence.skipped, true);
    assert.equal(silence.rejects.length, 0);

    const fail = ingestAsrPart({
      partIndex: 3,
      chunkStart: 180,
      chunkEnd: 200,
      requestedLanguage: "ja",
      result: "fail",
      segs,
    });
    assert.equal(fail.raw.kind, "decode_fail");
    assert.equal(fail.failed, true);
    assert.equal(segs.length, 1);
  });

  it("ngôn ngữ: ưu tiên Whisper báo, không thì ngôn ngữ đã chọn, không thì tự nhận dạng", () => {
    assert.equal(languageBucket("ja", "en"), "en");
    assert.equal(languageBucket("JA", ""), "ja");
    assert.equal(languageBucket("", "  "), "(tự nhận dạng)");
  });
});

describe("summarizeDiagnostics", () => {
  it("đếm theo lý do và theo ngôn ngữ, không tính câu đã giữ là câu bị lọc", () => {
    const rejects: RejectEntry[] = [
      { reason: "non_speech", partIndex: 1, start: 62, end: 62.4, text: "Ah", language: "japanese", no_speech_prob: 0.2 },
      { reason: "overlap", partIndex: 1, start: 58.2, end: 59, text: "lặp", language: "japanese" },
    ];
    const summary = summarizeDiagnostics(rejects, [
      {
        partIndex: 0,
        start: 0,
        end: 60,
        requestedLanguage: "ja",
        detectedLanguage: "ja",
        language: "ja",
        kind: "whisper_empty",
        segments: [],
      },
      {
        partIndex: 1,
        start: 58,
        end: 118,
        requestedLanguage: "",
        detectedLanguage: "Japanese",
        language: "japanese",
        kind: "whisper",
        segments: [
          { text: "おはよう", start: 2, end: 3 },
          { text: "Ah", start: 4, end: 4.4 },
        ],
      },
      {
        partIndex: 2,
        start: 120,
        end: 180,
        requestedLanguage: "ja",
        detectedLanguage: "",
        language: "ja",
        kind: "silence",
        segments: [],
      },
    ]);
    assert.equal(summary.whisperEmptyParts, 1);
    assert.equal(summary.whisperParts, 1);
    assert.equal(summary.silenceParts, 1);
    assert.equal(summary.decodeFailParts, 0);
    assert.equal(summary.appFiltered, 2);
    assert.deepEqual(
      summary.byReason.map((row) => [row.reason, row.count]),
      [
        ["non_speech", 1],
        ["overlap", 1],
      ],
    );
    const ja = summary.byLanguage.find((row) => row.language === "ja");
    const jp = summary.byLanguage.find((row) => row.language === "japanese");
    assert.equal(ja?.whisperEmptyParts, 1);
    assert.equal(ja?.silenceParts, 1);
    assert.equal(ja?.appFiltered, 0);
    assert.equal(jp?.whisperSegments, 2);
    assert.equal(jp?.appFiltered, 2);

    const doc = buildDiagnosticsExport({ rejects, raw: [], kept: 1 });
    assert.equal(doc.version, 1);
    assert.equal(doc.kept, 1);
    assert.equal(doc.rejects.length, 2);
    assert.equal(doc.summary.appFiltered, 2);
  });

  it("cùng câu đưa vào ingest hai lần không đổi câu giữ khi trùng", () => {
    const segs: Seg[] = [cue(1, "Tôi đi đây", 2)];
    const again = ingestAsrPart({
      partIndex: 0,
      chunkStart: 0,
      chunkEnd: 30,
      requestedLanguage: "vi",
      result: { segments: [{ text: "Tôi đi đây", start: 1.1, end: 2 }] },
      segs,
    });
    assert.equal(again.rejects[0].reason, "duplicate");
    assert.equal(segs.length, 1);
  });
});

describe("nghe và giữ câu bị loại", () => {
  it("cắt đúng lát tiếng và không thêm câu trùng", () => {
    const pcm = new Float32Array(16000);
    pcm[8000] = 0.2;
    const slice = slicePcm(pcm, 0.4, 0.6, 16000);
    assert.equal(slice?.length, 3200);
    assert.equal(slicePcm(pcm, 2, 3, 16000), null);
    const segs: Seg[] = [];
    const row: RejectEntry = { reason: "short_uncertain", partIndex: 0, start: 1, end: 1.4, text: "Ừ", language: "zh" };
    assert.equal(keepRejectedCue(segs, row), true);
    assert.equal(segs.length, 1);
    assert.equal(keepRejectedCue(segs, row), false);
    assert.equal(keepRejectedCue(segs, { ...row, start: 4, dismissed: true }), false);
  });
});
