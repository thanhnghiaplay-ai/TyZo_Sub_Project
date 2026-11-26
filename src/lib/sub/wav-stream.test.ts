import assert from "node:assert/strict";
import { test } from "node:test";
import { WavBuilder, floatToPcm16, packWavFromReader, wavHeader } from "./wav-stream.ts";

test("floatToPcm16 kẹp giá trị và đúng thứ tự byte", () => {
  const pcm = floatToPcm16(new Float32Array([0, 1, -1, 2, -2]));
  const view = new DataView(pcm.buffer);
  assert.equal(view.getInt16(0, true), 0);
  assert.equal(view.getInt16(2, true), 32767);
  assert.equal(view.getInt16(4, true), -32768);
  assert.equal(view.getInt16(6, true), 32767);
  assert.equal(view.getInt16(8, true), -32768);
});

test("wavHeader: RIFF/WAVE 16 kHz đơn kênh 16-bit, độ dài đúng", () => {
  const h = wavHeader(16000);
  const view = new DataView(h.buffer);
  assert.equal(String.fromCharCode(...h.slice(0, 4)), "RIFF");
  assert.equal(String.fromCharCode(...h.slice(8, 12)), "WAVE");
  assert.equal(view.getUint32(4, true), 36 + 32000);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), 32000);
});

test("WavBuilder ghép nhiều đoạn thành một tệp 44 + 2n byte", async () => {
  const b = new WavBuilder();
  b.push(new Float32Array(1600));
  b.push(new Float32Array(0));
  b.push(new Float32Array(800));
  assert.equal(b.seconds, 0.15);
  const blob = b.finish();
  assert.equal(blob.type, "audio/wav");
  assert.equal(blob.size, 44 + 2400 * 2);
});

test("packWavFromReader đọc từng đoạn 300 giây và báo tiến độ", async () => {
  const calls: Array<[number, number]> = [];
  const progress: number[] = [];
  const blob = await packWavFromReader(
    async (a, b) => {
      calls.push([a, b]);
      return new Float32Array(Math.round((b - a) * 16000));
    },
    700,
    { spanSeconds: 300, onProgress: (done) => progress.push(done) },
  );
  assert.deepEqual(calls, [[0, 300], [300, 600], [600, 700]]);
  assert.deepEqual(progress, [300, 600, 700]);
  assert.equal(blob.size, 44 + 700 * 16000 * 2);
});

test("packWavFromReader báo đoạn không giải mã được, hủy được, chặn thời lượng 0", async () => {
  await assert.rejects(() => packWavFromReader(async () => null, 600, { spanSeconds: 300 }), /phút 0/);
  await assert.rejects(
    () => packWavFromReader(async (a) => (a === 0 ? new Float32Array(16000) : null), 600, { spanSeconds: 300 }),
    /phút 5/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => packWavFromReader(async () => new Float32Array(10), 10, { signal: controller.signal }), { name: "AbortError" });
  await assert.rejects(() => packWavFromReader(async () => new Float32Array(10), 0));
});

test("R6-007: thời lượng hoặc độ dài đoạn không hữu hạn thì báo lỗi, không lặp mãi", async () => {
  const { packWavFromReader } = await import("./wav-stream.ts");
  const read = async () => new Float32Array(10);
  await assert.rejects(packWavFromReader(read, Infinity), /thời lượng/);
  await assert.rejects(packWavFromReader(read, 10, { spanSeconds: 0 }), /đoạn/);
  await assert.rejects(packWavFromReader(read, 10, { spanSeconds: Number.NaN }), /đoạn/);
});
