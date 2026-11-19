import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aliErrorText,
  directFileUrlProblem,
  filetransOrigin,
  languageHint,
  resultUrlProblem,
  sentencesFromTranscript,
} from "./ali-filetrans.ts";

describe("link file Alibaba", () => {
  it("nhận link file, từ chối trang xem, luồng và địa chỉ nội bộ", () => {
    assert.equal(directFileUrlProblem("https://cdn.example.com/phim.mp4"), null);
    assert.match(directFileUrlProblem("https://www.youtube.com/watch?v=abc") || "", /trang xem/);
    assert.match(directFileUrlProblem("https://hoathinh3d.ee/xem-phim-tien-nghich") || "", /trang xem/);
    assert.match(directFileUrlProblem("https://cdn.example.com/live.m3u8") || "", /luồng/);
    assert.match(directFileUrlProblem("http://127.0.0.1/a.mp4") || "", /công khai/);
    assert.match(directFileUrlProblem("http://192.168.1.8/a.mp4") || "", /công khai/);
    assert.match(directFileUrlProblem("file:///tmp/a.mp4") || "", /http/);
  });

  it("chỉ gợi ý bốn ngôn ngữ nguồn", () => {
    assert.deepEqual(languageHint("zh"), ["zh"]);
    assert.equal(languageHint("vi"), undefined);
  });

  it("đọc câu và đổi mili-giây sang giây", () => {
    const parsed = sentencesFromTranscript({
      properties: { original_duration_in_milliseconds: 4000 },
      transcripts: [{ sentences: [{ begin_time: 760, end_time: 3240, text: " Xin chào. " }, { begin_time: 10, end_time: 20, text: "  " }] }],
    });
    assert.equal(parsed.sentences.length, 1);
    assert.equal(parsed.sentences[0].text, "Xin chào.");
    assert.equal(parsed.sentences[0].start, 0.76);
    assert.equal(parsed.sentences[0].end, 3.24);
    assert.equal(parsed.seconds, 4);
  });

  it("chỉ tải kết quả từ nhà cung cấp", () => {
    assert.equal(resultUrlProblem("https://dashscope-result.oss-ap-southeast-1.aliyuncs.com/a.json"), null);
    assert.match(resultUrlProblem("https://evil.example/a.json") || "", /ngoài/);
    assert.match(resultUrlProblem("http://bucket.aliyuncs.com/a.json") || "", /không mở/);
  });
});

describe("Workspace Alibaba cho nhận dạng file", () => {
  it("dùng Workspace đã đặt, sai dạng hoặc trống thì về Workspace mặc định", () => {
    assert.equal(filetransOrigin("WS-Abc123"), "https://ws-abc123.ap-southeast-1.maas.aliyuncs.com");
    for (const bad of ["", "a", "ws.evil.com/x", undefined, null]) {
      assert.equal(filetransOrigin(bad), "https://ws-u3mqeygepiyqd77d.ap-southeast-1.maas.aliyuncs.com");
    }
  });
  it("đổi lỗi Workspace endpoint access denied thành lời chỉ cách sửa, lỗi khác giữ nguyên", () => {
    const text = aliErrorText("Workspace endpoint access denied", "ws-abc123");
    assert.match(text, /ws-abc123/);
    assert.match(text, /Admin/);
    assert.equal(aliErrorText("InvalidParameter", "ws-abc123"), "InvalidParameter");
  });

  it("đổi lỗi Model access denied thành lời chỉ cách bật quyền model, nêu tên model và Workspace", () => {
    const text = aliErrorText("Model access denied", "ws-abc123");
    assert.match(text, /qwen-audio-3\.0-asr-flash-filetrans/);
    assert.match(text, /ws-abc123/);
    assert.doesNotMatch(text, /Model access denied/);
  });
});

describe("tách câu Alibaba gộp quá dài", () => {
  it("tách theo dấu câu và mốc từng từ khi có words", () => {
    const w = (text: string, b: number, e: number, punctuation = "") => ({ text, begin_time: b, end_time: e, punctuation });
    const parsed = sentencesFromTranscript({
      transcripts: [{ sentences: [{ begin_time: 0, end_time: 6000, text: "如果一件事说了很多遍，对方还是没有做到。怎么办？", words: [
        w("如果一件事说了很多遍", 0, 2000, "，"), w("对方还是没有做到", 2200, 4000, "。"), w("怎么办", 4500, 5800, "？"),
      ] }] }],
    });
    assert.deepEqual(parsed.sentences.map((x) => x.text), ["如果一件事说了很多遍", "对方还是没有做到。", "怎么办？"]);
    assert.equal(parsed.sentences[1].start, 2.2);
    assert.equal(parsed.sentences[2].end, 5.8);
  });

  it("không có words thì tách theo dấu câu và chia thời gian theo độ dài chữ", () => {
    const parsed = sentencesFromTranscript({
      transcripts: [{ sentences: [{ begin_time: 0, end_time: 8000, text: "你会不开心，他还忍心看你伤心难过？" }] }],
    });
    assert.equal(parsed.sentences.length, 2);
    assert.equal(parsed.sentences[0].text, "你会不开心");
    assert.ok(parsed.sentences[0].end <= parsed.sentences[1].start + 1e-9);
    assert.ok(Math.abs(parsed.sentences[1].end - 8) < 1e-6);
  });

  it("ngắt khi hai từ cách nhau từ nửa giây dù không có dấu câu", () => {
    const w = (text: string, b: number, e: number) => ({ text, begin_time: b, end_time: e, punctuation: "" });
    const parsed = sentencesFromTranscript({
      transcripts: [{ sentences: [{ begin_time: 0, end_time: 5000, text: "谁让你有了失望谁就也会让你", words: [w("谁让你有了失望", 0, 1800), w("谁就也会让你", 2600, 4000)] }] }],
    });
    assert.equal(parsed.sentences.length, 2);
  });

  it("câu ngắn hoặc không có chỗ ngắt giữ nguyên, mảnh chỉ 1 chữ gộp vào mảnh kề", () => {
    assert.equal(sentencesFromTranscript({ transcripts: [{ sentences: [{ begin_time: 0, end_time: 1000, text: "怎么办" }] }] }).sentences.length, 1);
    const merged = sentencesFromTranscript({ transcripts: [{ sentences: [{ begin_time: 0, end_time: 3000, text: "好，我们走吧。" }] }] });
    assert.equal(merged.sentences.length, 1);
  });
});
