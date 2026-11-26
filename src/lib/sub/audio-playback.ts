import { fitBoost } from "./narration-sync.ts";
import type { NarrationSettings } from "./types.ts";

const pending = new WeakMap<HTMLAudioElement, () => void>();

/** Cancel settles the old waiter without advancing the old narration queue. */
export function cancelAudioPlayback(audio: HTMLAudioElement) {
  pending.get(audio)?.();
}

export function playAudio(audio: HTMLAudioElement, url: string, settings: NarrationSettings, playbackRate: number, done: () => void, slot?: number): Promise<void> {
  cancelAudioPlayback(audio);
  audio.src = url;
  audio.volume = Math.max(0, Math.min(1, settings.volume));
  const rate = settings.rate * (settings.followPlayback ? playbackRate : 1);
  const base = Math.max(0.5, Math.min(2, rate));
  audio.playbackRate = base;
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, ended = false) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", metadata);
      audio.removeEventListener("ended", end);
      audio.removeEventListener("error", fail);
      if (pending.get(audio) === cancel) pending.delete(audio);
      if (ended) done();
      if (error) reject(error); else resolve();
    };
    const cancel = () => finish();
    const metadata = () => {
      if (slot && Number.isFinite(audio.duration)) audio.playbackRate = Math.max(0.5, Math.min(2, base * fitBoost(audio.duration / base, slot)));
    };
    const end = () => finish(undefined, true);
    const fail = () => finish(new Error("Không phát được âm thanh."));
    pending.set(audio, cancel);
    audio.addEventListener("loadedmetadata", metadata);
    audio.addEventListener("ended", end);
    audio.addEventListener("error", fail);
    try { audio.play().catch((error: Error) => finish(error)); } catch (error) { finish(error as Error); }
  });
}
