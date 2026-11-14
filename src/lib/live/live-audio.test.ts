import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Resampler, floatToPcm16, levelOf, mixToMono, pcm16BytesToFloat, pcm16ToBytes } from "./live-audio.ts";
import { parseBridgeMessage } from "./live-inbox.ts";

const sine = (rate: number, seconds: number, hz = 440) => Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / rate));

describe("đổi định dạng âm thanh", () => {
  it("float sang PCM 16 bit có kẹp hai đầu và bỏ giá trị hỏng", () => {
    const pcm = floatToPcm16(Float32Array.from([0, 1, -1, 2, -2, NaN, 0.5]));
    assert.deepEqual(Array.from(pcm), [0, 32767, -32768, 32767, -32768, 0, 16384]);
  });
  it("đi một vòng PCM → byte → float gần như không đổi", () => {
    const source = sine(16000, 0.1);
    const back = pcm16BytesToFloat(pcm16ToBytes(floatToPcm16(source)));
    assert.equal(back.length, source.length);
    for (let i = 0; i < source.length; i += 1) assert.ok(Math.abs(back[i] - source[i]) < 1e-3);
  });
  it("byte được ghi little-endian", () => {
    assert.deepEqual(Array.from(pcm16ToBytes(Int16Array.from([1, -2]))), [1, 0, 254, 255]);
  });
  it("byte lẻ ở cuối bị bỏ, đọc được cả khi có offset", () => {
    const buffer = new Uint8Array([9, 9, 1, 0, 2, 0, 7]);
    assert.equal(pcm16BytesToFloat(buffer.subarray(2)).length, 2);
  });
  it("trộn kênh lấy trung bình", () => {
    assert.deepEqual(Array.from(mixToMono([Float32Array.from([1, 0]), Float32Array.from([0, 1])])), [0.5, 0.5]);
    assert.equal(mixToMono([]).length, 0);
  });
  it("mức âm lượng", () => {
    assert.equal(levelOf(new Float32Array(0)), 0);
    assert.ok(Math.abs(levelOf(Float32Array.from([0.5, -0.5])) - 0.5) < 1e-9);
  });
});

describe("đổi tần số lấy mẫu", () => {
  it("48 kHz xuống 16 kHz ra đúng số mẫu, chia đoạn thế nào cũng được kết quả như nhau", () => {
    const source = sine(48000, 1);
    const whole = new Resampler(48000, 16000).push(source);
    assert.ok(Math.abs(whole.length - 16000) <= 1);
    const parts = new Resampler(48000, 16000);
    const pieces: Float32Array[] = [];
    for (let offset = 0; offset < source.length; offset += 1000) pieces.push(parts.push(source.subarray(offset, offset + 1000)));
    const joined = Float32Array.from(pieces.flatMap((piece) => Array.from(piece)));
    assert.equal(joined.length, whole.length);
    for (let i = 0; i < whole.length; i += 1) assert.ok(Math.abs(joined[i] - whole[i]) < 1e-5, `mẫu ${i}`);
  });
  it("44,1 kHz xuống 16 kHz giữ đúng hình sóng", () => {
    const out = new Resampler(44100, 16000).push(sine(44100, 0.5));
    const want = sine(16000, 0.5);
    let worst = 0;
    for (let i = 5; i < out.length - 5; i += 1) worst = Math.max(worst, Math.abs(out[i] - want[i]));
    assert.ok(worst < 0.05, `lệch tối đa ${worst}`);
  });
  it("cùng tần số thì giữ nguyên, đoạn rỗng thì ra rỗng, tần số sai thì báo lỗi", () => {
    const same = Float32Array.from([0.1, 0.2]);
    assert.deepEqual(Array.from(new Resampler(16000, 16000).push(same)), Array.from(same));
    assert.equal(new Resampler(48000, 16000).push(new Float32Array(0)).length, 0);
    assert.throws(() => new Resampler(0, 16000), /Tần số/);
  });
  it("lên tần số (24 kHz sang 48 kHz) ra gấp đôi số mẫu", () => {
    const out = new Resampler(24000, 48000).push(sine(24000, 0.5));
    assert.ok(Math.abs(out.length - 24000) <= 2);
  });
});

describe("đọc tin từ cầu nối", () => {
  it("nhận các loại tin đúng và chuẩn hóa số liệu", () => {
    assert.deepEqual(parseBridgeMessage('{"type":"ready","audio":true}'), { type: "ready", audio: true });
    assert.deepEqual(parseBridgeMessage('{"type":"balance","heldLeft":-5,"denied":true}'), { type: "balance", heldLeft: 0, denied: true });
    assert.deepEqual(parseBridgeMessage('{"type":"closing","reason":"het-tien"}'), { type: "closing", reason: "het-tien" });
    assert.deepEqual(parseBridgeMessage({ type: "reconnecting", attempt: 2 }), { type: "reconnecting", attempt: 2 });
    assert.deepEqual(parseBridgeMessage('{"type":"low"}'), { type: "low" });
    assert.deepEqual(parseBridgeMessage('{"type":"event","event":{"kind":"source","id":"a","text":"x","stash":"","final":true}}'), {
      type: "event",
      event: { kind: "source", id: "a", text: "x", stash: "", final: true },
    });
  });
  it("tin hỏng, lạ hoặc thiếu dữ liệu thì bỏ qua, không ném lỗi", () => {
    for (const bad of ["không phải json", "null", "[]", '{"type":"la"}', '{"type":"event"}', '{"type":"event","event":{}}', 5, null, undefined]) {
      assert.equal(parseBridgeMessage(bad), null);
    }
    assert.deepEqual(parseBridgeMessage('{"type":"error"}'), { type: "error", message: "Có lỗi khi dịch trực tiếp." });
  });
});
