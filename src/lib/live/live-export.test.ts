import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasLiveCues, liveExportFile, liveExportName, liveExportText } from "./live-export.ts";
import { LiveTranscript } from "./live-transcript.ts";

function transcript() {
  const t = new LiveTranscript();
  t.apply({ kind: "source-delta", id: "a", delta: "Hello" }, 1500);
  t.apply({ kind: "pair", translationId: "ta", sourceId: "a" }, 1600);
  t.apply({ kind: "translation", id: "ta", text: "Xin chào", stash: "", final: true }, 3200);
  t.apply({ kind: "source", id: "b", text: "Bye", stash: "", final: true }, 4000);
  t.apply({ kind: "translation", id: "tb", text: "Tạm biệt", stash: "", final: true }, 5000);
  t.apply({ kind: "pair", translationId: "tb", sourceId: "b" }, 5100);
  return t;
}

describe("xuất SRT, VTT, TXT từ dịch trực tiếp", () => {
  const cues = transcript().cues();
  it("SRT dùng dấu phẩy, giờ tính từ lúc bắt đầu phiên", () => {
    const srt = liveExportText(cues, "srt");
    assert.match(srt, /^1\n00:00:01,500 --> /);
    assert.match(srt, /Xin chào/);
    assert.match(srt, /Tạm biệt/);
  });
  it("VTT có dòng WEBVTT và dấu chấm", () => {
    const vtt = liveExportText(cues, "vtt");
    assert.ok(vtt.startsWith("WEBVTT\n\n"));
    assert.match(vtt, /00:00:01\.500 -->/);
  });
  it("TXT mỗi câu một dòng, không giờ", () => {
    assert.equal(liveExportText(cues, "txt"), "Xin chào\nTạm biệt\n");
  });
  it("câu chưa có bản dịch giữ nhãn và chữ gốc", () => {
    const t = new LiveTranscript();
    t.apply({ kind: "source", id: "x", text: "Only source", stash: "", final: false }, 1000);
    assert.equal(liveExportText(t.cues(), "txt"), "[chưa dịch] Only source\n");
  });
  it("chưa có gì thì không tạo tệp", () => {
    assert.equal(hasLiveCues([]), false);
    assert.equal(liveExportFile([], "srt"), null);
    const blank = new LiveTranscript();
    blank.apply({ kind: "source", id: "x", text: "   ", stash: "", final: false }, 0);
    assert.equal(liveExportFile(blank.cues(), "srt"), null);
  });
  it("tên tệp có ngày giờ và đúng đuôi, kiểu MIME theo định dạng", () => {
    const at = new Date(2026, 10, 14, 21, 5);
    assert.equal(liveExportName("srt", at), "dich-truc-tiep-20261114-2105.srt");
    const file = liveExportFile(cues, "vtt", at)!;
    assert.equal(file.name, "dich-truc-tiep-20261114-2105.vtt");
    assert.match(file.mime, /text\/vtt/);
  });
});
