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
