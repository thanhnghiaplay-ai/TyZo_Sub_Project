import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cuesText, errorRate, parseSrt, scoreAsr } from "./asr-score.ts";

const dir = new URL("../../../eval/asr/tieu-hoa-thuong/", import.meta.url);
const load = (name: string) => parseSrt(readFileSync(new URL(name, dir), "utf8"));
const ref = cuesText(load("ref-noprompt-11.srt"));
const DURATION = 34.02;

describe("chấm điểm nhận dạng (số đo thật clip «Tiểu hòa thượng»)", () => {
  it("11 câu đủ lời của large-v3 không prompt: đạt", () => {
    const v = scoreAsr({ cues: load("ref-noprompt-11.srt"), lang: "zh", durationSec: DURATION, reference: ref });
    assert.equal(v.status, "pass", JSON.stringify(v));
    assert.equal(v.metrics.cues, 11);
    assert.equal(v.metrics.errorRate, 0);
  });

  it("11 câu của turbo: đạt, sai khác nhỏ so với đáp án", () => {
    const v = scoreAsr({ cues: load("turbo-11.srt"), lang: "zh", durationSec: DURATION, reference: ref });
    assert.equal(v.status, "pass", JSON.stringify(v));
    assert.ok((v.metrics.errorRate ?? 1) < 0.1);
  });

  it("2 câu (prompt cũ làm large-v3 bỏ lời): hỏng vì thưa, dù mốc giờ phủ gần hết clip", () => {
    const cues = [
      { start: 0, end: 29.98, text: "词曲 李宗盛" },
      { start: 30, end: 32.64, text: "谁就也会让你失望后天" },
    ];
    const v = scoreAsr({ cues, lang: "zh", durationSec: DURATION, reference: ref });
    assert.equal(v.status, "fail");
    assert.ok(v.metrics.coverage > 0.9, "mốc giờ phủ cả clip nên chỉ đo thời gian sẽ không thấy lỗi");
    assert.ok(v.metrics.sparseCues >= 1);
    assert.ok(v.fails.some((line) => line.includes("thưa")));
  });

  it("chunk15 một mình (ảo giác «请不吝点赞» + mất lời): hỏng", () => {
    const v = scoreAsr({ cues: load("chunk15-6.srt"), lang: "zh", durationSec: DURATION, reference: ref });
    assert.equal(v.status, "fail");
    assert.ok(v.metrics.hallucinations.length >= 1);
  });

  it("noprompt + chunk15 (13 câu): không hỏng nhưng bị cảnh báo lặp/vụn, nhiều câu hơn không có nghĩa đúng hơn", () => {
    const v = scoreAsr({ cues: load("noprompt-chunk15-13.srt"), lang: "zh", durationSec: DURATION, reference: ref });
    assert.notEqual(v.status, "pass", JSON.stringify(v));
    assert.ok(v.metrics.duplicatePairs >= 1 || v.metrics.tinyCueRatio > 0.2);
  });

  it("câu cuối ra tiếng Anh: bị bắt là lệch ngôn ngữ", () => {
    const cues = load("turbo-11.srt").slice(0, 9);
    cues.push({ start: 28, end: 29.4, text: "Whoever disappoints you" }, { start: 29.9, end: 32.6, text: "will disappoint you again tomorrow" });
    const v = scoreAsr({ cues, lang: "zh", durationSec: DURATION });
    assert.ok(v.metrics.offScriptCues >= 2);
  });

  it("không có đáp án vẫn chấm được bằng dấu hiệu bỏ lời, errorRate là null", () => {
    const v = scoreAsr({ cues: load("turbo-11.srt"), lang: "zh", durationSec: DURATION });
    assert.equal(v.metrics.errorRate, null);
    assert.equal(v.status, "pass");
  });
});

describe("parseSrt và errorRate", () => {
  it("đọc SRT có BOM, CRLF và mốc dấu chấm", () => {
    const cues = parseSrt("\uFEFF1\r\n00:00:01.500 --> 00:00:02,250\r\nXin chào\r\n\r\n2\r\n00:01:00,000 --> 00:01:01,000\r\nHai dòng\r\nmột câu\r\n");
    assert.equal(cues.length, 2);
    assert.equal(cues[0].start, 1.5);
    assert.equal(cues[0].end, 2.25);
    assert.equal(cues[1].start, 60);
    assert.equal(cues[1].text, "Hai dòng một câu");
    assert.deepEqual(parseSrt(""), []);
  });

  it("CER bỏ dấu câu, WER tính theo từ, đáp án rỗng thì 0", () => {
    assert.equal(errorRate("你好，世界。", "你好世界", "zh"), 0);
    assert.equal(errorRate("你好世界", "你好", "zh"), 0.5);
    assert.equal(errorRate("the quick brown fox", "the quick fox", "en"), 0.25);
    assert.equal(errorRate("", "bất kỳ", "zh"), 0);
  });

  it("không có câu nào: hỏng", () => {
    assert.equal(scoreAsr({ cues: [], lang: "ja", durationSec: 10 }).status, "fail");
  });
});
