import { fmt, rms, SILENCE_RMS, SR } from "./text.ts";

export const GAP_MIN_SECONDS = 2;
export const GAP_BUDGET_SECONDS = 120;
export const GAP_BLOCK_SECONDS = 60;
export const GAP_HOP_SECONDS = 58;

export type SpeechSpan = { start: number; end: number };

export type GapPlan = {
  budgetSeconds: number;
  selected: SpeechSpan[];
  deferred: SpeechSpan[];
  audioSeconds: number;
  billedSeconds: number;
  cost: number;
};

type Cue = { start: number; end: number };

function clampCues(duration: number, segs: Cue[]): Cue[] {
  return segs
    .filter((seg) => Number.isFinite(seg.start) && Number.isFinite(seg.end) && seg.end > seg.start)
    .map((seg) => ({ start: Math.max(0, seg.start), end: Math.min(duration, seg.end) }))
    .filter((seg) => seg.end > seg.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

function mergedCues(cues: Cue[]): Cue[] {
  const merged: Cue[] = [];
  for (const cue of cues) {
    const last = merged[merged.length - 1];
    if (!last || cue.start > last.end) merged.push({ ...cue });
    else last.end = Math.max(last.end, cue.end);
  }
  return merged;
}

function holesBetween(duration: number, segs: Cue[], minSeconds: number): Cue[] {
  const holes: Cue[] = [];
  let cursor = 0;
  for (const cue of mergedCues(clampCues(duration, segs))) {
    if (cue.start - cursor >= minSeconds) holes.push({ start: cursor, end: cue.start });
    cursor = Math.max(cursor, cue.end);
  }
  if (duration - cursor >= minSeconds) holes.push({ start: cursor, end: duration });
  return holes;
}

/** Khoảng có tiếng liên tục, chưa có câu, dài ít nhất `minSeconds`. Không gửi mạng. */
export function collectSpeechSpans(input: {
  duration: number;
  segs: Cue[];
  samples: Float32Array;
  sampleRate?: number;
  minSeconds?: number;
}): SpeechSpan[] {
  const duration = input.duration;
  if (!Number.isFinite(duration) || duration <= 0 || !input.samples.length) return [];
  const sampleRate = input.sampleRate ?? SR;
  const minSeconds = input.minSeconds ?? GAP_MIN_SECONDS;
  const found: SpeechSpan[] = [];
  for (const hole of holesBetween(duration, input.segs, minSeconds)) {
    let runStart = -1;
    let runEnd = -1;
    const flush = () => {
      if (runStart >= 0 && runEnd - runStart >= minSeconds - 1e-3) found.push({ start: runStart, end: runEnd });
      runStart = -1;
      runEnd = -1;
    };
    for (let t = hole.start; t < hole.end - 1e-6; ) {
      const wEnd = Math.min(hole.end, t + 1);
      if (wEnd - t < 0.2) break;
      const a = Math.max(0, Math.floor(t * sampleRate));
      const b = Math.min(input.samples.length, Math.floor(wEnd * sampleRate));
      const loud = b > a && rms(input.samples.subarray(a, b)) >= SILENCE_RMS;
      if (loud) {
        if (runStart < 0) runStart = t;
        runEnd = wEnd;
      } else flush();
      t = wEnd;
    }
    flush();
  }
  return found;
}

export function mergeSpans(spans: SpeechSpan[]): SpeechSpan[] {
  const ordered = spans
    .filter((span) => Number.isFinite(span.start) && Number.isFinite(span.end) && span.end > span.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: SpeechSpan[] = [];
  for (const span of ordered) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end + 0.05) last.end = Math.max(last.end, span.end);
    else merged.push({ start: span.start, end: span.end });
  }
  return merged;
}

/** Chọn khoảng vừa ngân sách. Không cắt một khoảng cho vừa. */
export function budgetSpeechGaps(spans: SpeechSpan[], pricePerSecond: number, budgetSeconds = GAP_BUDGET_SECONDS): GapPlan {
  const selected: SpeechSpan[] = [];
  const deferred: SpeechSpan[] = [];
  let audioSeconds = 0;
  for (const span of mergeSpans(spans)) {
    const seconds = span.end - span.start;
    if (audioSeconds + seconds > budgetSeconds + 1e-6) deferred.push(span);
    else {
      selected.push(span);
      audioSeconds += seconds;
    }
  }
  const billedSeconds = selected.reduce((total, span) => total + Math.max(10, span.end - span.start), 0);
  return {
    budgetSeconds,
    selected,
    deferred,
    audioSeconds,
    billedSeconds,
    cost: billedSeconds * pricePerSecond,
  };
}

export function planSpeechGaps(input: {
  duration: number;
  segs: Cue[];
  samples: Float32Array;
  sampleRate?: number;
  budgetSeconds?: number;
  pricePerSecond: number;
  minSeconds?: number;
}): GapPlan {
  return budgetSpeechGaps(
    collectSpeechSpans(input),
    input.pricePerSecond,
    input.budgetSeconds ?? GAP_BUDGET_SECONDS,
  );
}

export async function spansFromBlocks(
  duration: number,
  segs: Cue[],
  read: (start: number, end: number) => Promise<Float32Array | null>,
  signal?: AbortSignal,
): Promise<SpeechSpan[]> {
  const found: SpeechSpan[] = [];
  for (let t = 0; t < duration; t += GAP_HOP_SECONDS) {
    if (signal?.aborted) {
      const error = new Error("Đã hủy.");
      error.name = "AbortError";
      throw error;
    }
    const end = Math.min(duration, t + GAP_BLOCK_SECONDS);
    const samples = await read(t, end);
    if (samples && samples.length) {
      const localDur = samples.length / SR;
      const localSegs = segs
        .map((seg) => ({ start: seg.start - t, end: seg.end - t }))
        .filter((seg) => seg.end > 0 && seg.start < localDur);
      for (const span of collectSpeechSpans({ duration: localDur, segs: localSegs, samples })) {
        found.push({ start: span.start + t, end: span.end + t });
      }
    }
    if (end >= duration) break;
  }
  return mergeSpans(found);
}

export function formatGapConfirm(plan: GapPlan): string {
  const list = plan.selected
    .slice(0, 6)
    .map((span) => `${fmt(span.start)}–${fmt(span.end)}`)
    .join(", ");
  const extra = plan.selected.length > 6 ? ` và ${plan.selected.length - 6} khoảng nữa` : "";
  const deferred = plan.deferred.length
    ? ` ${plan.deferred.length} khoảng không vừa ngân sách ${plan.budgetSeconds} giây nên không gửi.`
    : "";
  return `Sẽ gửi ${plan.selected.length} khoảng (${plan.audioSeconds.toFixed(1)} giây). Không gửi cả phim.${deferred} ${list}${extra}. Gửi không?`;
}
