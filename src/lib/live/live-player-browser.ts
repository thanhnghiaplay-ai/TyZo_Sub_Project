import { LIVE_PLAY_RATE } from "./live-audio.ts";
import { PlaybackQueue } from "./live-playback.ts";

export type LivePlayer = { play(samples: Float32Array): void; stop(): void };

/**
 * Phát tiếng dịch (PCM 24 kHz) qua loa. Phải tạo trong lúc xử lý cú bấm của khách
 * (nút Bắt đầu), nếu không trình duyệt, nhất là Safari, sẽ không cho phát.
 */
export function createBrowserPlayer(): LivePlayer {
  const w = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return { play() {}, stop() {} };
  let context: AudioContext;
  try {
    context = new Ctor({ sampleRate: LIVE_PLAY_RATE });
  } catch {
    context = new Ctor();
  }
  void context.resume().catch(() => undefined);
  const queue = new PlaybackQueue(LIVE_PLAY_RATE);
  const sources = new Set<AudioBufferSourceNode>();
  let stopped = false;
  return {
    play(samples) {
      if (stopped || samples.length === 0) return;
      const buffer = context.createBuffer(1, samples.length, LIVE_PLAY_RATE);
      buffer.copyToChannel(new Float32Array(samples), 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      const { at } = queue.schedule(context.currentTime, samples.length);
      sources.add(source);
      source.onended = () => sources.delete(source);
      source.start(at);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      queue.reset();
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          /* đã dừng */
        }
      }
      sources.clear();
      void context.close().catch(() => undefined);
    },
  };
}
