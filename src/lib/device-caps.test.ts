import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectCaps } from "./device-caps.ts";

const mm = (on: string[]) => (query: string) => ({ matches: on.includes(query) });
const FINE = "(hover: hover) and (pointer: fine)";

describe("device-caps", () => {
  it("máy tính Chrome: có chuột, thu được âm thanh tab, không khóa hướng", () => {
    const caps = detectCaps({
      matchMedia: mm([FINE]),
      navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130", maxTouchPoints: 0, mediaDevices: { getUserMedia: () => 0, getDisplayMedia: () => 0 }, wakeLock: {}, clipboard: { readText: () => 0 } },
      isSecureContext: true,
    });
    assert.deepEqual([caps.finePointer, caps.touchOnly, caps.mic, caps.tabAudio, caps.lockOrientation, caps.wakeLock, caps.readClipboard], [true, false, true, true, false, true, true]);
  });
  it("iPhone Safari: chỉ cảm ứng, có micro, không thu tab, không khóa hướng", () => {
    const caps = detectCaps({
      matchMedia: mm(["(pointer: coarse)"]),
      navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari", maxTouchPoints: 5, mediaDevices: { getUserMedia: () => 0, getDisplayMedia: () => 0 } },
      screen: { orientation: { lock: () => 0 } },
      isSecureContext: true,
    });
    assert.deepEqual([caps.finePointer, caps.touchOnly, caps.mic, caps.tabAudio, caps.lockOrientation], [false, true, true, false, false]);
  });
  it("Android Chrome: khóa hướng được, không thu tab", () => {
    const caps = detectCaps({
      matchMedia: mm(["(pointer: coarse)"]),
      navigator: { userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile", maxTouchPoints: 5, mediaDevices: { getUserMedia: () => 0, getDisplayMedia: () => 0 } },
      screen: { orientation: { lock: () => 0 } },
      isSecureContext: true,
    });
    assert.deepEqual([caps.touchOnly, caps.lockOrientation, caps.tabAudio], [true, true, false]);
  });
  it("iPad giả làm Mac vẫn là máy cảm ứng", () => {
    const caps = detectCaps({ matchMedia: mm(["(pointer: coarse)"]), navigator: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari", maxTouchPoints: 5 }, isSecureContext: true });
    assert.equal(caps.touchOnly, true);
    assert.equal(caps.tabAudio, false);
  });
  it("trang không HTTPS: không micro, không thu tab, không khóa sáng", () => {
    const caps = detectCaps({ matchMedia: mm([FINE]), navigator: { userAgent: "Chrome", mediaDevices: { getUserMedia: () => 0, getDisplayMedia: () => 0 }, wakeLock: {} }, isSecureContext: false });
    assert.deepEqual([caps.mic, caps.tabAudio, caps.wakeLock], [false, false, false]);
  });
});
