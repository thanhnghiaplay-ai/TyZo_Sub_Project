import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeDecodeFailure, ffmpegCommand, sniffMedia } from "./media-sniff.ts";

const bytes = (...values: Array<number | string>) => {
  const out: number[] = [];
  for (const value of values) {
    if (typeof value === "number") out.push(value);
    else for (const ch of value) out.push(ch.charCodeAt(0));
  }
  return new Uint8Array(out);
};
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};
const pad = (n: number) => new Uint8Array(n);

describe("sniffMedia: gói file", () => {
  it("nhận MP4 theo ftyp", () => {
    assert.equal(sniffMedia(cat(bytes(0, 0, 0, 0x18, "ftypisom"), pad(16))).container, "mp4");
  });
  it("phân biệt MKV và WebM theo DocType", () => {
    assert.equal(sniffMedia(cat(bytes(0x1a, 0x45, 0xdf, 0xa3), pad(4), bytes("matroska"), pad(8))).container, "matroska");
    assert.equal(sniffMedia(cat(bytes(0x1a, 0x45, 0xdf, 0xa3), pad(4), bytes("webm"), pad(8))).container, "webm");
  });
  it("nhận AVI, WAV, OGG, FLAC, FLV, ASF, MPEG-TS", () => {
    assert.equal(sniffMedia(cat(bytes("RIFF"), pad(4), bytes("AVI LIST"))).container, "avi");
    assert.equal(sniffMedia(cat(bytes("RIFF"), pad(4), bytes("WAVEfmt "))).container, "wav");
    assert.equal(sniffMedia(bytes("OggS", 0, 2, 0, 0)).container, "ogg");
    assert.equal(sniffMedia(bytes("fLaC", 0, 0, 0, 0x22)).container, "flac");
    assert.equal(sniffMedia(bytes("FLV", 1, 5, 0, 0, 0, 9)).container, "flv");
    assert.equal(sniffMedia(cat(bytes(0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11), pad(16))).container, "asf");
    const ts = new Uint8Array(400);
    ts[0] = ts[188] = ts[376] = 0x47;
    assert.equal(sniffMedia(ts).container, "ts");
  });
  it("tách MP3 khỏi AAC ADTS", () => {
    assert.equal(sniffMedia(bytes(0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0)).container, "mp3");
    assert.equal(sniffMedia(bytes("ID3", 3, 0, 0, 0, 0, 0, 0)).container, "mp3");
    assert.equal(sniffMedia(bytes(0xff, 0xf1, 0x50, 0x80, 0, 0, 0, 0)).container, "aac");
  });
  it("không nhận ra thì trả unknown", () => {
    assert.equal(sniffMedia(bytes("hello world, not media")).container, "unknown");
    assert.equal(sniffMedia(new Uint8Array(0)).container, "unknown");
  });
});

describe("sniffMedia: loại âm thanh", () => {
  it("MKV: đọc mã codec trong bảng track", () => {
    const mkv = (id: string) => cat(bytes(0x1a, 0x45, 0xdf, 0xa3), pad(4), bytes("matroska"), pad(200), bytes(id), pad(50));
    assert.deepEqual(sniffMedia(mkv("A_AC3")).codecs, ["ac3"]);
    assert.deepEqual(sniffMedia(mkv("A_EAC3")).codecs, ["eac3"]);
    assert.deepEqual(sniffMedia(mkv("A_DTS")).codecs, ["dts"]);
    assert.deepEqual(sniffMedia(mkv("A_TRUEHD")).codecs, ["truehd"]);
    assert.deepEqual(sniffMedia(mkv("A_AAC")).codecs, ["aac"]);
  });
  it("MKV nhiều track: giữ đủ các loại", () => {
    const head = cat(bytes(0x1a, 0x45, 0xdf, 0xa3), pad(4), bytes("matroska"), pad(40), bytes("A_DTS"), pad(30), bytes("A_AAC"), pad(10));
    assert.deepEqual(sniffMedia(head).codecs.sort(), ["aac", "dts"]);
  });
  it("MP4: đọc fourcc trong stsd", () => {
    const mp4 = (code: string) => cat(bytes(0, 0, 0, 0x18, "ftypisom"), pad(40), bytes(code), pad(20));
    assert.deepEqual(sniffMedia(mp4("ac-3")).codecs, ["ac3"]);
    assert.deepEqual(sniffMedia(mp4("ec-3")).codecs, ["eac3"]);
    assert.deepEqual(sniffMedia(mp4("dtsc")).codecs, ["dts"]);
    assert.deepEqual(sniffMedia(mp4("Opus")).codecs, ["opus"]);
  });
  it("MP4 có bảng mô tả ở cuối file: bắt mã từ câu lý do của bộ đọc", () => {
    const head = cat(bytes(0, 0, 0, 0x18, "ftypisom"), pad(40));
    assert.deepEqual(sniffMedia(head, "âm thanh không phải AAC-LC (ac-3)").codecs, ["ac3"]);
  });
  it("AC3 thô: phân biệt AC3 và E-AC3 theo bsid", () => {
    assert.deepEqual(sniffMedia(bytes(0x0b, 0x77, 0, 0, 0, 0x40 /* bsid 8 */, 0, 0)).codecs, ["ac3"]);
    assert.deepEqual(sniffMedia(bytes(0x0b, 0x77, 0, 0, 0, 0x80 /* bsid 16 */, 0, 0)).codecs, ["eac3"]);
  });
});

describe("describeDecodeFailure", () => {
  const mkvAc3 = cat(bytes(0x1a, 0x45, 0xdf, 0xa3), pad(4), bytes("matroska"), pad(40), bytes("A_AC3"), pad(10));

  it("MKV có AC3: nói rõ trình duyệt không giải mã được, kèm lệnh với đúng tên file", () => {
    const text = describeDecodeFailure({ fileName: "Phim Hay 2024.mkv", head: mkvAc3 });
    assert.match(text, /file MKV/);
    assert.match(text, /AC3 \(Dolby Digital\)/);
    assert.match(text, /Trình duyệt không giải mã được loại âm thanh này/);
    assert.match(text, /ffmpeg -i "Phim Hay 2024\.mkv" -vn -ac 1 -ar 16000 -c:a aac -b:a 48k -movflags \+faststart am-thanh\.m4a/);
    assert.match(text, /Âm thanh riêng/);
  });
  it("loại thường đọc được thì nghi file hỏng, không đổ lỗi cho codec", () => {
    const head = cat(bytes(0, 0, 0, 0x18, "ftypisom"), pad(30), bytes("mp4a"), pad(10));
    const text = describeDecodeFailure({ fileName: "a.mp4", head });
    assert.match(text, /hỏng hoặc tải chưa đủ/);
    assert.doesNotMatch(text, /không giải mã được loại âm thanh này/);
  });
  it("AVI/TS/FLV: nói trình duyệt thường không đọc được gói này", () => {
    const text = describeDecodeFailure({ fileName: "c.avi", head: cat(bytes("RIFF"), pad(4), bytes("AVI LIST")) });
    assert.match(text, /file AVI/);
    assert.match(text, /thường không đọc được định dạng này/);
  });
  it("không nhận ra gì thì vẫn có lệnh và không bịa tên codec", () => {
    const text = describeDecodeFailure({ head: bytes("not media at all") });
    assert.doesNotMatch(text, /Phát hiện/);
    assert.match(text, /Chưa xác định được loại âm thanh/);
    assert.match(text, /ffmpeg -i "phim\.mkv"/);
  });
  it("tên file có dấu nháy hoặc xuống dòng không phá lệnh", () => {
    assert.equal(ffmpegCommand('a"b\nc.mkv'), 'ffmpeg -i "abc.mkv" -vn -ac 1 -ar 16000 -c:a aac -b:a 48k -movflags +faststart am-thanh.m4a');
  });
});
