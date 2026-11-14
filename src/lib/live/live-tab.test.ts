import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CaptureError, startCapture } from "./live-mic.ts";
import { audioOnly, canCaptureTab, tabErrorMessage, type DisplayStreamLike } from "./live-tab.ts";

const desktop = { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130", maxTouchPoints: 0, mediaDevices: { getDisplayMedia() {} } };

describe("máy có thu được tab không", () => {
  it("máy tính có hàm chia sẻ màn hình thì được", () => {
    assert.equal(canCaptureTab(desktop), true);
    assert.equal(canCaptureTab({ ...desktop, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari", maxTouchPoints: 0 }), true);
  });
  it("điện thoại, iPad (kể cả iPad giả làm Mac) và máy thiếu hàm thì không", () => {
    assert.equal(canCaptureTab({ ...desktop, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18) Safari" }), false);
    assert.equal(canCaptureTab({ ...desktop, userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome Mobile" }), false);
    assert.equal(canCaptureTab({ ...desktop, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari", maxTouchPoints: 5 }), false);
    assert.equal(canCaptureTab({ userAgent: desktop.userAgent, mediaDevices: {} }), false);
    assert.equal(canCaptureTab({ userAgent: desktop.userAgent }), false);
    assert.equal(canCaptureTab(undefined), false);
  });
});

function fakeDisplay(audio: number) {
  const log: string[] = [];
  const track = (name: string) => ({ stop: () => log.push(`dừng ${name}`) });
  const audios = Array.from({ length: audio }, (_, i) => track(`tiếng${i}`));
  const videos = [track("hình")];
  const stream: DisplayStreamLike = { getAudioTracks: () => audios, getVideoTracks: () => videos, getTracks: () => [...audios, ...videos] };
  return { stream, log, audios };
}

describe("chỉ giữ âm thanh của luồng chia sẻ", () => {
  it("có tiếng thì tắt hình, giữ tiếng", () => {
    const { stream, log, audios } = fakeDisplay(1);
    const made = audioOnly(stream, (tracks) => tracks);
    assert.deepEqual(log, ["dừng hình"]);
    assert.equal(made, audios);
  });
  it("không có tiếng thì dừng hết và báo lỗi riêng", () => {
    const { stream, log } = fakeDisplay(0);
    assert.throws(() => audioOnly(stream, (tracks) => tracks), { name: "NoTabAudio" });
    assert.deepEqual(log, ["dừng hình"]);
  });
  it("câu báo khi quên bật chia sẻ âm thanh nói rõ cách làm", () => {
    assert.match(tabErrorMessage({ name: "NoTabAudio" }), /bật mục chia sẻ âm thanh/);
  });
});

describe("câu báo lỗi chia sẻ tab", () => {
  it("mỗi loại lỗi một câu, lạ thì câu chung", () => {
    const texts = ["NoTabAudio", "NotAllowedError", "NotSupportedError", "NotReadableError", "La"].map((name) => tabErrorMessage({ name }));
    assert.equal(new Set(texts).size, 5);
    assert.equal(tabErrorMessage({ name: "SecurityError" }), texts[1]);
    assert.equal(tabErrorMessage({ name: "NotFoundError" }), texts[2]);
  });
  it("startCapture dùng đúng câu của tab khi lỗi", async () => {
    const env = { getStream: async () => Promise.reject(Object.assign(new Error("x"), { name: "NoTabAudio" })), openGraph: async () => assert.fail("không được gọi") };
    await assert.rejects(startCapture(env as never, { onFrame() {} }, tabErrorMessage), (error: unknown) => error instanceof CaptureError && /chia sẻ âm thanh/.test(error.message));
  });
});
