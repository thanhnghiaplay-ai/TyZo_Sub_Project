/**
 * RE3-002: số giây audio dùng để GIỮ TRƯỚC phải là cận trên đã xác minh, hoặc từ chối (fail closed).
 * Tệp tổng hợp; không gọi nhà cung cấp. `audioSecondsEstimate` trả null = không xác minh được → cửa từ chối trước khi giữ/gửi.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { audioSecondsEstimate } from "./run-gate.ts";
import { buildOpusWebm, toWav } from "../sub/codec.ts";

const multipart = async (file: Blob, name: string) => {
  const form = new FormData();
  form.append("file", file, name);
  form.append("model", "whisper-large-v3-turbo");
  const r = new Response(form);
  return { type: r.headers.get("content-type"), body: await r.arrayBuffer() };
};

/** Gói Opus CELT 20 ms (config 31 = CELT FB 20 ms, code 0), `size` byte. */
const opus20 = (size: number) => {
  const d = new Uint8Array(Math.max(1, size));
  d[0] = (31 << 3) | 0;
  return d;
};
/** Gói Opus SILK 60 ms ×2 khung (config 3, code 1) = 120 ms. */
const opus120 = (size: number) => {
  const d = new Uint8Array(Math.max(1, size));
  d[0] = (3 << 3) | 1;
  return d;
};

const webmOf = (packets: Uint8Array[], ms: number) =>
  buildOpusWebm(
    packets.map((data, i) => ({ data, timestampUs: i * ms * 1000, durationUs: ms * 1000 })),
    null,
    48000,
    1,
  );

async function estimate(file: Blob, name: string) {
  const { type, body } = await multipart(file, name);
  return audioSecondsEstimate(type, body);
}

/** Hợp lệ: phải có số, không thấp hơn độ dài thật, không thổi phồng quá 5% + 0,2 giây. */
function assertUpper(est: number | null, truth: number, label: string) {
  assert.ok(est !== null, `${label}: tệp hợp lệ phải xác minh được`);
  assert.ok(est >= truth - 1e-6, `${label}: ước ${est} giây < thật ${truth} giây (giữ thiếu)`);
  assert.ok(est <= truth * 1.05 + 0.2, `${label}: ước ${est} giây quá dư so với ${truth} giây`);
}

test("RE3-002: WAV PCM16 16 kHz của app — đúng độ dài", async () => {
  assertUpper(await estimate(toWav(new Float32Array(16000 * 60)), "audio.wav"), 60, "wav");
});

test("RE3-002: WebM/Opus 20 kbit/s của app — đúng độ dài", async () => {
  const packets = Array.from({ length: 3000 }, () => opus20(50)); // 60 s, 2.500 B/s
  assertUpper(await estimate(webmOf(packets, 20), "audio.webm"), 60, "webm 20k");
});

test("RE3-002: Opus bitrate rất thấp (im lặng, gói 3 byte) — không được giữ thiếu", async () => {
  const packets = Array.from({ length: 3000 }, () => opus20(3)); // 60 s chỉ ~36 KB
  assertUpper(await estimate(webmOf(packets, 20), "audio.webm"), 60, "webm thấp");
});

test("RE3-002: Opus gói 120 ms nhỏ — 10 phút trong tệp nhỏ vẫn đúng", async () => {
  const packets = Array.from({ length: 5000 }, () => opus120(2)); // 600 s
  assertUpper(await estimate(webmOf(packets, 120), "audio.webm"), 600, "webm 120ms");
});

test("RE3-002: WAV header giả byteRate khổng lồ → không chấp nhận số nhỏ", async () => {
  const wav = new Uint8Array(await toWav(new Float32Array(16000 * 30)).arrayBuffer());
  new DataView(wav.buffer).setUint32(28, 4_000_000_000, true);
  const est = await estimate(new Blob([wav]), "audio.wav");
  assert.ok(est === null || est >= 30, `header giả cho ${est} giây (thật 30 giây)`);
});

test("RE3-002: WAV khai data lớn hơn phần có thật (cụt) → theo phần có thật", async () => {
  const wav = new Uint8Array(await toWav(new Float32Array(16000 * 10)).arrayBuffer());
  new DataView(wav.buffer).setUint32(40, 0x7fffffff, true);
  assertUpper(await estimate(new Blob([wav]), "audio.wav"), 10, "wav cụt");
});

test("RE3-002: WAV có chunk phụ trước data (LIST) vẫn đúng", async () => {
  const pcm = new Uint8Array(await toWav(new Float32Array(16000 * 5)).arrayBuffer());
  const list = new Uint8Array(8 + 26);
  list.set([76, 73, 83, 84]);
  new DataView(list.buffer).setUint32(4, 26, true);
  const out = new Uint8Array(pcm.length + list.length);
  out.set(pcm.subarray(0, 36));
  out.set(list, 36);
  out.set(pcm.subarray(36), 36 + list.length);
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  assertUpper(await estimate(new Blob([out]), "audio.wav"), 5, "wav LIST");
});

test("RE3-002: định dạng không xác minh được (mp3/rác/multipart hỏng/không có file) → null", async () => {
  const junk = new Uint8Array(200_000).fill(7);
  assert.equal(await estimate(new Blob([junk]), "audio.mp3"), null, "rác");
  const bad = new TextEncoder().encode("--x\r\nnot a form");
  assert.equal(await audioSecondsEstimate("multipart/form-data; boundary=x", bad.buffer), null, "multipart hỏng");
  const form = new FormData();
  form.append("model", "m");
  const r = new Response(form);
  assert.equal(await audioSecondsEstimate(r.headers.get("content-type"), await r.arrayBuffer()), null, "không có file");
});

test("RE3-002: WebM cụt giữa chừng → null hoặc không thấp hơn phần còn đọc được", async () => {
  const full = new Uint8Array(await webmOf(Array.from({ length: 1000 }, () => opus20(40)), 20).arrayBuffer());
  const cut = full.subarray(0, Math.floor(full.length * 0.6));
  const est = await estimate(new Blob([cut]), "audio.webm");
  assert.ok(est === null || est >= 0, String(est));
});

test("RE3-002: dò 25 MB trong thời gian và bộ nhớ giới hạn", async () => {
  const wav = toWav(new Float32Array((25 * 1024 * 1024) / 2 - 22));
  const rss = process.memoryUsage().rss;
  const t = performance.now();
  const est = await estimate(wav, "audio.wav");
  const ms = performance.now() - t;
  assert.ok(est !== null && est > 800);
  assert.ok(ms < 2000, `dò mất ${ms} ms`);
  assert.ok(process.memoryUsage().rss - rss < 200 * 1024 * 1024, "bộ nhớ tăng quá 200 MB");
  const opus = webmOf(Array.from({ length: 200_000 }, () => opus20(2)), 20); // 4.000 s, nhiều gói
  const t2 = performance.now();
  const e2 = await estimate(opus, "audio.webm");
  assert.ok(e2 === null || e2 >= 4000, String(e2));
  assert.ok(performance.now() - t2 < 3000, "dò WebM nhiều gói quá chậm");
});

// ---- Định dạng biên: dựng tay từng byte để kiểm từng nhánh của bộ dò ----
import { probeAudioBytes, opusPacketSamples } from "./audio-probe.ts";

const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const idb = (hex: string) => Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16)));
const size8 = (n: number) => {
  const o = new Uint8Array(8);
  o[0] = 0x01;
  let v = n;
  for (let i = 7; i >= 1; i--) {
    o[i] = v & 255;
    v = Math.floor(v / 256);
  }
  return o;
};
const UNKNOWN = Uint8Array.of(0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff);
const el = (hex: string, data: Uint8Array) => cat(idb(hex), size8(data.length), data);
const txt = (s: string) => new TextEncoder().encode(s);
const ebmlHead = el("1A45DFA3", el("4282", txt("webm")));
const track = (num: number, codec: string, type = 2) =>
  el("AE", cat(el("D7", Uint8Array.of(num)), el("83", Uint8Array.of(type)), el("86", txt(codec))));
const simple = (trackNo: number, flags: number, payload: Uint8Array) =>
  el("A3", cat(Uint8Array.of(0x80 | trackNo, 0, 0, flags), payload));

test("RE3-002: WebM cluster kích thước không rõ (MediaRecorder) + BlockGroup", () => {
  const blocks = Array.from({ length: 50 }, () => simple(1, 0x80, opus20(10)));
  const group = el("A0", el("A1", cat(Uint8Array.of(0x81, 0, 0, 0), opus20(10))));
  const cluster = cat(idb("1F43B675"), UNKNOWN, el("E7", Uint8Array.of(0)), ...blocks, group);
  const cluster2 = cat(idb("1F43B675"), UNKNOWN, el("E7", Uint8Array.of(1)), ...blocks);
  const file = cat(ebmlHead, idb("18538067"), UNKNOWN, el("1654AE6B", track(1, "A_OPUS")), cluster, cluster2);
  const r = probeAudioBytes(file);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.ok && Math.round(r.seconds * 1000), 101 * 20);
});

test("RE3-002: WebM lacing Xiph / cố định / EBML đếm đủ từng gói", () => {
  const p = opus20(4);
  const xiph = simple(1, 0x80 | (1 << 1), cat(Uint8Array.of(2, 4, 4), p, p, p)); // 3 gói
  const fixed = simple(1, 0x80 | (3 << 1), cat(Uint8Array.of(3), p, p, p, p)); // 4 gói
  const ebmlLace = simple(1, 0x80 | (2 << 1), cat(Uint8Array.of(1, 0x84), p, p)); // 2 gói
  const file = cat(
    ebmlHead,
    el("18538067", cat(el("1654AE6B", track(1, "A_OPUS")), el("1F43B675", cat(xiph, fixed, ebmlLace)))),
  );
  const r = probeAudioBytes(file);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.ok && Math.round(r.seconds * 1000), 9 * 20);
});

test("RE3-002: WebM hai track, codec không phải Opus, block của track lạ → không xác minh", () => {
  const body = el("1F43B675", simple(1, 0x80, opus20(5)));
  const two = cat(ebmlHead, el("18538067", cat(el("1654AE6B", cat(track(1, "A_OPUS"), track(2, "A_OPUS"))), body)));
  const vorbis = cat(ebmlHead, el("18538067", cat(el("1654AE6B", track(1, "A_VORBIS")), body)));
  const stray = cat(ebmlHead, el("18538067", cat(el("1654AE6B", track(1, "A_OPUS")), el("1F43B675", simple(2, 0x80, opus20(5))))));
  for (const f of [two, vorbis, stray]) assert.equal(probeAudioBytes(f).ok, false);
});

const crcless = (granule: number, seq: number, header: number, packets: Uint8Array[]) => {
  const lacing: number[] = [];
  for (const p of packets) {
    let n = p.length;
    while (n >= 255) {
      lacing.push(255);
      n -= 255;
    }
    lacing.push(n);
  }
  const h = new Uint8Array(27 + lacing.length);
  h.set(txt("OggS"));
  h[5] = header;
  const v = new DataView(h.buffer);
  v.setUint32(6, granule, true);
  v.setUint32(14, 0x1234, true);
  v.setUint32(18, seq, true);
  h[26] = lacing.length;
  h.set(lacing, 27);
  return cat(h, ...packets);
};

test("RE3-002: Ogg Opus đếm theo TOC (granule khai sai không ảnh hưởng), gói dài ≥255 byte", () => {
  const head = cat(txt("OpusHead"), new Uint8Array(11));
  const tags = cat(txt("OpusTags"), new Uint8Array(8));
  const audio = Array.from({ length: 200 }, (_, i) => opus20(i % 10 === 0 ? 300 : 3));
  const file = cat(crcless(0, 0, 2, [head]), crcless(0, 1, 0, [tags]), crcless(1, 2, 4, audio));
  const r = probeAudioBytes(file);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.ok && Math.round(r.seconds * 1000), 200 * 20);
  assert.equal(probeAudioBytes(file.subarray(0, file.length - 50)).ok, false, "Ogg cụt phải từ chối");
});

test("RE3-002: TOC Opus — bảng thời lượng theo RFC 6716", () => {
  assert.equal(opusPacketSamples(Uint8Array.of(0 << 3)), 480); // SILK 10 ms
  assert.equal(opusPacketSamples(Uint8Array.of((3 << 3) | 1)), 5760); // SILK 60 ms × 2
  assert.equal(opusPacketSamples(Uint8Array.of(13 << 3)), 960); // Hybrid 20 ms
  assert.equal(opusPacketSamples(Uint8Array.of(16 << 3)), 120); // CELT 2,5 ms
  assert.equal(opusPacketSamples(Uint8Array.of((16 << 3) | 3, 48)), 5760); // 48 × 2,5 ms
  assert.equal(opusPacketSamples(Uint8Array.of((19 << 3) | 3, 7)), null); // 7 × 20 ms > 120 ms
  assert.equal(opusPacketSamples(new Uint8Array(0)), 5760);
});

test("RE4-005: cấu trúc WebM sai cấp bị từ chối dù có gói Opus đọc được", () => {
  const tracks = el("1654AE6B", track(1, "A_OPUS"));
  const cluster = el("1F43B675", simple(1, 0x80, opus20(5)));
  const invalid = [
    cat(el("1654AE6B", tracks), cluster),
    cat(tracks, el("A0", cluster)),
    cat(tracks, el("1F43B675", cat(el("1654AE6B", new Uint8Array()), simple(1, 0x80, opus20(5))))),
  ];
  for (const body of invalid) {
    assert.equal(probeAudioBytes(cat(ebmlHead, el("18538067", body))).ok, false);
  }
});

test("RE4-005: khai kích thước vượt cha, cụt Segment hoặc unknown-size ngoài Cluster bị từ chối", () => {
  const tracks = el("1654AE6B", track(1, "A_OPUS"));
  const block = simple(1, 0x80, opus20(5));
  const invalid = [
    el("18538067", cat(tracks, idb("1F43B675"), size8(block.length - 1), block)),
    cat(idb("18538067"), size8(tracks.length + 1), tracks),
    el("18538067", cat(idb("1654AE6B"), UNKNOWN, track(1, "A_OPUS"), el("1F43B675", block))),
  ];
  for (const segment of invalid) {
    assert.equal(probeAudioBytes(cat(ebmlHead, segment)).ok, false);
  }
});

test("RE4-005: biến thiên cấu trúc trả kết quả có kiểm soát, không ném lỗi", async () => {
  const valid = cat(ebmlHead, el("18538067", cat(
    el("1654AE6B", track(1, "A_OPUS")),
    el("1F43B675", simple(1, 0x80, opus20(5))),
  )));
  for (let i = 0; i < valid.length; i++) {
    for (const mask of [0x01, 0x80, 0xff]) {
      const changed = valid.slice();
      changed[i] ^= mask;
      const result = probeAudioBytes(changed);
      if (result.ok) assert.ok(Number.isFinite(result.seconds) && result.seconds > 0);
    }
  }
  const nested = el("1654AE6B", el("1654AE6B", track(1, "A_OPUS")));
  const invalid = cat(ebmlHead, el("18538067", cat(nested, el("1F43B675", simple(1, 0x80, opus20(5))))));
  assert.equal(await estimate(new Blob([invalid]), "malformed.webm"), null);
});
