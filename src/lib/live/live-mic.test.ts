import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LiveFramer } from "./live-frames.ts";
import { CaptureError, startCapture, type CaptureEnv, type StreamLike } from "./live-mic.ts";
import { micErrorMessage } from "./live-mic-errors.ts";

const tone = (rate: number, seconds: number) => Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) => 0.4 * Math.sin((2 * Math.PI * 300 * i) / rate));

describe("gom khung 100 ms", () => {
  it("48 kHz hai kênh ra khung 3200 byte, đủ số khung cho 1 giây", () => {
    const framer = new LiveFramer(48000);
    const source = tone(48000, 1);
    const frames: Uint8Array[] = [];
    for (let offset = 0; offset < source.length; offset += 2048) {
      const part = source.subarray(offset, offset + 2048);
      frames.push(...framer.push([part, part]));
    }
    assert.ok(frames.length >= 9 && frames.length <= 10, `ra ${frames.length} khung`);
    for (const frame of frames) assert.equal(frame.byteLength, 3200);
  });
  it("phần lẻ khi dừng được bù thành một khung đủ, rồi hết", () => {
    const framer = new LiveFramer(16000);
    assert.equal(framer.push([tone(16000, 0.05)]).length, 0);
    const rest = framer.flush();
    assert.equal(rest?.byteLength, 3200);
    assert.equal(framer.flush(), null);
  });
  it("chia đoạn thế nào cũng ra cùng dữ liệu", () => {
    const source = tone(44100, 0.7);
    const whole = new LiveFramer(44100).push([source]);
    const split = new LiveFramer(44100);
    const pieces: Uint8Array[] = [];
    for (let offset = 0; offset < source.length; offset += 777) pieces.push(...split.push([source.subarray(offset, offset + 777)]));
    assert.equal(pieces.length, whole.length);
    for (let i = 0; i < whole.length; i += 1) assert.deepEqual(Array.from(pieces[i]), Array.from(whole[i]));
  });
  it("mức âm lượng phản ánh đoạn vừa đẩy", () => {
    const framer = new LiveFramer(16000);
    framer.push([new Float32Array(1600)]);
    assert.equal(framer.level, 0);
    framer.push([tone(16000, 0.1)]);
    assert.ok(framer.level > 0.2);
  });
});

describe("câu báo lỗi micro", () => {
  it("từng loại lỗi có câu riêng, lạ thì có câu chung", () => {
    const names = ["NotAllowedError", "NotFoundError", "NotReadableError", "TypeError", "KhacLa"];
    const texts = names.map((name) => micErrorMessage({ name }));
    assert.equal(new Set(texts).size, 5);
    assert.match(texts[0], /cho phép micro/);
    assert.match(micErrorMessage(null), /Chưa bật được micro/);
    assert.equal(micErrorMessage({ name: "SecurityError" }), texts[0]);
  });
});

function fakeEnv() {
  const log: string[] = [];
  let push: (channels: Float32Array[]) => void = () => {};
  const listeners: Array<() => void> = [];
  const stream: StreamLike = {
    getTracks: () => [{ stop: () => log.push("nhả micro"), addEventListener: (_type: string, listener: () => void) => listeners.push(listener) } as never],
  };
  const env: CaptureEnv = {
    getStream: async () => stream,
    openGraph: async (_stream, onChunk) => {
      push = onChunk;
      return { sampleRate: 16000, close: () => void log.push("đóng đường") };
    },
  };
  return { env, log, feed: (channels: Float32Array[]) => push(channels), end: () => listeners.forEach((l) => l()) };
}

describe("thu âm", () => {
  it("nhận khung, báo mức, dừng thì gửi nốt phần lẻ rồi nhả micro và đóng đường", async () => {
    const fake = fakeEnv();
    const frames: number[] = [];
    const levels: number[] = [];
    const handle = await startCapture(fake.env, { onFrame: (f) => frames.push(f.byteLength), onLevel: (l) => levels.push(l) });
    fake.feed([tone(16000, 0.25)]);
    assert.deepEqual(frames, [3200, 3200]);
    assert.equal(levels.length, 1);
    await handle.stop();
    assert.deepEqual(frames, [3200, 3200, 3200]);
    assert.deepEqual(fake.log, ["nhả micro", "đóng đường"]);
    fake.feed([tone(16000, 0.2)]);
    assert.equal(frames.length, 3, "sau khi dừng không nhận thêm");
    await handle.stop();
    assert.equal(fake.log.length, 2, "dừng hai lần không làm hai lần");
  });
  it("bị từ chối quyền thì báo câu tiếng Việt, không có gì để nhả", async () => {
    const env: CaptureEnv = { getStream: async () => Promise.reject(Object.assign(new Error("x"), { name: "NotAllowedError" })), openGraph: async () => assert.fail("không được gọi") };
    await assert.rejects(startCapture(env, { onFrame() {} }), (error: unknown) => error instanceof CaptureError && /cho phép micro/.test(error.message));
  });
  it("dựng đường lấy mẫu hỏng thì vẫn nhả micro", async () => {
    const fake = fakeEnv();
    const env: CaptureEnv = { getStream: fake.env.getStream, openGraph: async () => Promise.reject(new Error("hỏng")) };
    await assert.rejects(startCapture(env, { onFrame() {} }), CaptureError);
    assert.deepEqual(fake.log, ["nhả micro"]);
  });
  it("rút micro giữa chừng thì báo onEnded, người dùng tự dừng thì không báo", async () => {
    const fake = fakeEnv();
    let ended = 0;
    await startCapture(fake.env, { onFrame() {}, onEnded: () => (ended += 1) });
    fake.end();
    assert.equal(ended, 1);
    const second = fakeEnv();
    let endedAfterStop = 0;
    const handle = await startCapture(second.env, { onFrame() {}, onEnded: () => (endedAfterStop += 1) });
    await handle.stop();
    second.end();
    assert.equal(endedAfterStop, 0);
  });
});
