import { isSilentChunk, SR } from "./text.ts";

export const VAD_WINDOW = 512;
export const VAD_WINDOW_SECONDS = VAD_WINDOW / SR;
export const VAD_THRESHOLD = 0.5;
export const VAD_NEG_THRESHOLD = 0.35;
export const VAD_MIN_SPEECH = 0.1;
export const VAD_MIN_SILENCE = 0.2;
export const VAD_PAD = 0.25;

export type SpeechSpan = { start: number; end: number };

/** Đổi xác suất từng cửa sổ thành các đoạn có lời. Một khung nhiễu không thành câu. */
export function speechSpansFromProbs(probs: number[], windowSeconds = VAD_WINDOW_SECONDS): SpeechSpan[] {
  const minSpeech = Math.max(1, Math.round(VAD_MIN_SPEECH / windowSeconds));
  const minSilence = Math.max(1, Math.round(VAD_MIN_SILENCE / windowSeconds));
  const spans: SpeechSpan[] = [];
  let triggered = false;
  let start = 0;
  let silenceRun = 0;
  const close = (endWindow: number) => {
    if (endWindow - start >= minSpeech) {
      spans.push({ start: start * windowSeconds, end: endWindow * windowSeconds });
    }
    triggered = false;
    silenceRun = 0;
  };
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (p >= VAD_THRESHOLD) {
      if (!triggered) {
        triggered = true;
        start = i;
      }
      silenceRun = 0;
    } else if (triggered && p < VAD_NEG_THRESHOLD) {
      silenceRun++;
      if (silenceRun >= minSilence) close(i - silenceRun + 1);
    } else if (triggered) {
      silenceRun = 0;
    }
  }
  if (triggered) close(probs.length - silenceRun);
  return spans;
}

/**
 * Cắt đầu và cuối không có lời. Một lần gửi, không tách thành nhiều request.
 * Không có lời thì trả null để khỏi gửi.
 */
export function trimToSpeech(duration: number, spans: SpeechSpan[], pad = VAD_PAD): { start: number; end: number } | null {
  if (!spans.length || !(duration > 0)) return null;
  const start = Math.max(0, spans[0].start - pad);
  const end = Math.min(duration, spans[spans.length - 1].end + pad);
  if (end - start < VAD_MIN_SPEECH) return null;
  if (start < 0.05 && duration - end < 0.05) return { start: 0, end: duration };
  return { start, end };
}

export function sliceByTime(samples: Float32Array, start: number, end: number, sampleRate = SR): Float32Array {
  const from = Math.max(0, Math.floor(start * sampleRate));
  const to = Math.min(samples.length, Math.ceil(end * sampleRate));
  if (to - from < 1) return samples.slice(0, 0);
  return samples.slice(from, to);
}

export type GatedChunk = { samples: Float32Array; offset: number; fallback: boolean };

/** Bật VAD thì chỉ giữ đoạn có lời. Tắt hoặc lỗi tải thì dùng RMS như cũ. */
export async function gateChunk(samples: Float32Array, useVad: boolean): Promise<GatedChunk | null> {
  if (!useVad) return isSilentChunk(samples) ? null : { samples, offset: 0, fallback: false };
  try {
    const { speechProbabilities } = await import("./vad-runtime.ts");
    const probs = await speechProbabilities(samples);
    const trim = trimToSpeech(samples.length / SR, speechSpansFromProbs(probs));
    if (!trim) return null;
    if (trim.start <= 0 && trim.end >= samples.length / SR - 0.001) return { samples, offset: 0, fallback: false };
    const sliced = sliceByTime(samples, trim.start, trim.end);
    if (!sliced.length) return null;
    return { samples: sliced, offset: trim.start, fallback: false };
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") throw error;
    return isSilentChunk(samples) ? null : { samples, offset: 0, fallback: true };
  }
}
