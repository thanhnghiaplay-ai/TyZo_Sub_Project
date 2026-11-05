const MIN_HZ = 70;
const MAX_HZ = 400;
const MIN_SECONDS = 0.3;
const MAX_SECONDS = 2.5;
const CORR_MIN = 0.45;
const EDGE_SECONDS = 0.1;

/**
 * Cao độ giữa câu, đã bỏ hai đầu.
 * Trả về null khi đoạn quá ngắn, quá ít tiếng người, hoặc không có chu kỳ rõ.
 */
export function measurePitch(samples: Float32Array, sampleRate: number): number | null {
  if (sampleRate < 4000) return null;
  const edge = Math.floor(sampleRate * EDGE_SECONDS);
  if (samples.length < edge * 2 + sampleRate * MIN_SECONDS) return null;
  const body = samples.subarray(edge, samples.length - edge);
  const step = sampleRate >= 12000 ? 2 : 1;
  const rate = sampleRate / step;
  const count = Math.min(Math.floor(body.length / step), Math.floor(rate * MAX_SECONDS));
  if (count < rate * MIN_SECONDS) return null;
  const mono = new Float32Array(count);
  for (let i = 0; i < count; i++) mono[i] = body[i * step];

  const frame = Math.floor(rate * 0.03);
  const hop = Math.max(1, Math.floor(rate * 0.015));
  const minLag = Math.max(2, Math.floor(rate / MAX_HZ));
  const maxLag = Math.min(frame - 2, Math.floor(rate / MIN_HZ));
  if (maxLag <= minLag) return null;

  const pitches: number[] = [];
  let frames = 0;
  for (let start = 0; start + frame <= mono.length; start += hop) {
    frames++;
    const hz = frameHz(mono, start, frame, minLag, maxLag, rate);
    if (hz) pitches.push(hz);
  }
  if (frames < 8 || pitches.length < 6 || pitches.length / frames < 0.4) return null;
  pitches.sort((a, b) => a - b);
  const q1 = pitches[Math.floor((pitches.length - 1) * 0.25)];
  const q3 = pitches[Math.floor((pitches.length - 1) * 0.75)];
  if (q3 - q1 > 35) return null;
  return pitches[Math.floor(pitches.length / 2)];
}

type Pitched = { pitchHz?: number; voice?: "female" | "male"; voiceLock?: "female" | "male" };

/** Gán nam/nữ theo khoảng trống lớn nhất giữa các câu trong cùng video. Một nhóm thì không gán. Câu đã khóa thì giữ nguyên. */
export function assignVoices(segs: Pitched[]) {
  for (const seg of segs) {
    if (seg.voiceLock === "male" || seg.voiceLock === "female") seg.voice = seg.voiceLock;
    else delete seg.voice;
  }
  const ranked: Array<{ index: number; hz: number }> = [];
  segs.forEach((seg, index) => {
    if (typeof seg.pitchHz === "number" && seg.pitchHz > 0) ranked.push({ index, hz: seg.pitchHz });
  });
  ranked.sort((a, b) => a.hz - b.hz);
  if (ranked.length < 2) return;
  let splitAt = 1;
  let bestGap = 0;
  for (let i = 1; i < ranked.length; i++) {
    const gap = ranked[i].hz - ranked[i - 1].hz;
    if (gap > bestGap) {
      bestGap = gap;
      splitAt = i;
    }
  }
  if (bestGap < 40) return;
  const lowCenter = medianHz(ranked.slice(0, splitAt));
  const highCenter = medianHz(ranked.slice(splitAt));
  if (highCenter - lowCenter < 40) return;
  for (const row of ranked) {
    if (segs[row.index].voiceLock) continue;
    const toLow = Math.abs(row.hz - lowCenter);
    const toHigh = Math.abs(row.hz - highCenter);
    if (toLow + 15 <= toHigh) segs[row.index].voice = "male";
    else if (toHigh + 15 <= toLow) segs[row.index].voice = "female";
  }
}

function medianHz(rows: Array<{ hz: number }>) {
  const mid = Math.floor(rows.length / 2);
  if (rows.length % 2) return rows[mid].hz;
  return (rows[mid - 1].hz + rows[mid].hz) / 2;
}

function frameHz(mono: Float32Array, start: number, frame: number, minLag: number, maxLag: number, rate: number) {
  let mean = 0;
  for (let i = 0; i < frame; i++) mean += mono[start + i];
  mean /= frame;
  let energy = 0;
  const buf = new Float32Array(frame);
  for (let i = 0; i < frame; i++) {
    const value = mono[start + i] - mean;
    buf[i] = value;
    energy += value * value;
  }
  if (energy <= 0 || Math.sqrt(energy / frame) < 0.01) return null;

  let bestLag = 0;
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    const last = frame - lag;
    for (let i = 0; i < last; i++) corr += buf[i] * buf[i + lag];
    if (corr > best) {
      best = corr;
      bestLag = lag;
    }
  }
  if (!bestLag || best / energy < CORR_MIN) return null;
  const lower = bestLag * 2;
  if (lower <= maxLag) {
    let corr = 0;
    const last = frame - lower;
    for (let i = 0; i < last; i++) corr += buf[i] * buf[i + lower];
    if (corr > best * 0.9) bestLag = lower;
  }
  return rate / bestLag;
}

export function lineLockId(seg: { start: number; original: string }) {
  return `${Math.round(seg.start * 10) / 10}|${seg.original}`;
}

/** Khóa đã lưu thắng kết quả vừa đo. */
export function applyLineLocks<T extends { start: number; original: string; voice?: "female" | "male"; voiceLock?: "female" | "male" }>(
  segs: T[],
  locks: Record<string, "female" | "male">,
) {
  for (const seg of segs) {
    const lock = locks[lineLockId(seg)];
    if (lock !== "male" && lock !== "female") continue;
    seg.voiceLock = lock;
    seg.voice = lock;
  }
}
