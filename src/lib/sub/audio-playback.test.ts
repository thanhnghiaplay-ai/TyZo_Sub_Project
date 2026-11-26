import assert from "node:assert/strict";
import { test } from "node:test";
import { cancelAudioPlayback, playAudio } from "./audio-playback.ts";
import type { NarrationSettings } from "./types.ts";

class Media extends EventTarget {
  src = ""; volume = 1; playbackRate = 1; duration = 10;
  async play() {}
}
const settings = { volume: 1, rate: 1, followPlayback: false } as NarrationSettings;
test("R7-006: cancel and replacement settle waiters without advancing old queues", async () => {
  const media = new Media() as unknown as HTMLAudioElement;
  let completed = 0;
  const first = playAudio(media, "fixture:a", settings, 1, () => completed++);
  const second = playAudio(media, "fixture:b", settings, 1, () => completed++);
  await first;
  cancelAudioPlayback(media);
  await second;
  media.dispatchEvent(new Event("ended"));
  assert.equal(completed, 0);
});
test("R7-006: ended resolves once; media error rejects; next playback works", async () => {
  const media = new Media() as unknown as HTMLAudioElement;
  let completed = 0;
  const playing = playAudio(media, "fixture:a", settings, 1, () => completed++);
  media.dispatchEvent(new Event("ended")); media.dispatchEvent(new Event("ended"));
  await playing; assert.equal(completed, 1);
  const failed = playAudio(media, "fixture:b", settings, 1, () => completed++);
  media.dispatchEvent(new Event("error"));
  await assert.rejects(failed, /Không phát/);
  assert.equal(completed, 1);
});
