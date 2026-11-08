import { CHUNK_SECONDS, MIN_CHUNK_SECONDS, OVERLAP_SECONDS, SILENCE_RMS, SR } from "./text.ts";

export const CHUNK_GAP_SECONDS = 1.5;
export const CHUNK_PAD_SECONDS = 0.3;

export type TimeSpan = { start: number; end: number };

/** Ngưỡng im lặng. File nói nhỏ hơn mốc cố định thì lấy 20% đỉnh, khỏi coi cả tệp là im. */
export function energyThreshold(levels: number[], floor = SILENCE_RMS): number {
  let peak = 0;
  for (const level of levels) if (level > peak) peak = level;
  if (!(peak > 0) || peak >= floor) return floor;
  return peak * 0.2;
}

/** Cửa sổ có năng lượng thành các đoạn. Cửa sổ im không vào đoạn. */
export function spansFromEnergy(levels: number[], windowSeconds = 1, threshold = SILENCE_RMS): TimeSpan[] {
  const spans: TimeSpan[] = [];
  let start = -1;
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] >= threshold) {
      if (start < 0) start = i * windowSeconds;
    } else if (start >= 0) {
      spans.push({ start, end: i * windowSeconds });
      start = -1;
    }
  }
  if (start >= 0) spans.push({ start, end: levels.length * windowSeconds });
  return spans;
}

/**
 * Gộp đoạn cách nhau dưới 1,5 giây. Đoạn dài hơn 60 giây cắt với 2 giây chồng.
 * Khoảng ngừng dài thì không chồng, để khỏi nuốt câu ở đầu đoạn sau.
 */
export function chunksFromSpans(spans: TimeSpan[], duration: number): Array<[number, number]> {
  if (!(duration > 0)) return [];
  if (!spans.length) return [[0, duration]];
  const merged: TimeSpan[] = [];
  for (const span of spans) {
    const start = Math.max(0, Math.min(duration, span.start));
    const end = Math.max(start, Math.min(duration, span.end));
    if (end - start <= 0) continue;
    const last = merged[merged.length - 1];
    if (last && start - last.end < CHUNK_GAP_SECONDS) last.end = Math.max(last.end, end);
    else merged.push({ start, end });
  }
  if (!merged.length) return [[0, duration]];
  const chunks: Array<[number, number]> = [];
  for (const island of merged) {
    let at = island.start;
    while (at < island.end - 0.05) {
      let end = Math.min(island.end, at + CHUNK_SECONDS);
      if (island.end - end < MIN_CHUNK_SECONDS && island.end - at <= CHUNK_SECONDS + MIN_CHUNK_SECONDS) end = island.end;
      const hardCut = at > island.start + 0.05;
      const chunkStart = hardCut ? Math.max(0, at - OVERLAP_SECONDS) : Math.max(0, at - CHUNK_PAD_SECONDS);
      const chunkEnd = Math.min(duration, end + CHUNK_PAD_SECONDS);
      chunks.push([chunkStart, Math.max(chunkStart + 0.2, chunkEnd)]);
      if (end >= island.end - 0.05) break;
      at = end;
    }
  }
  return chunks.length ? chunks : [[0, duration]];
}

export function chunksToSamples(chunks: Array<[number, number]>, totalSamples: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const [startSec, endSec] of chunks) {
    const start = Math.max(0, Math.floor(startSec * SR));
    const end = Math.min(totalSamples, Math.max(start + 1, Math.ceil(endSec * SR)));
    if (end > start) out.push([start, end]);
  }
  return out;
}

/** Đoạn sau có đè lên đoạn trước hay không. Chỉ khi đè thì mới bỏ câu ở biên. */
export function chunkOverlapsPrevious(parts: Array<[number, number]>, index: number): boolean {
  if (index <= 0 || index >= parts.length) return false;
  return parts[index][0] < parts[index - 1][1] - 1;
}
