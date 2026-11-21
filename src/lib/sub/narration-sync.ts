// Bù độ trễ cho thuyết minh (mục «thuyết minh trễ» trong docs/lich-su/HANDOFF_2026-11.md, 20/11/2026).
// File thuần: chỉ import tương đối, không gọi mạng, không đụng DOM, test được bằng Node.
//
// Vì sao trễ: câu chỉ bắt đầu được tạo tiếng khi phụ đề hiện, nên tiếng ra chậm đúng bằng thời gian tạo giọng
// (Neural, Orpheus, Aura đều gọi qua mạng). Cách chữa, dùng chung cho MỌI loại giọng:
//   1. Đo độ trễ tạo giọng thật của từng loại (trung bình trượt) và bắt đầu tạo sớm đúng bằng độ trễ đó.
//   2. Tạo trước vài câu kế tiếp (có bộ nhớ đệm) nên câu sau gần như có tiếng sẵn.
//   3. Câu đã có tiếng sẵn thì chờ cho đến đúng lúc, nên không bị đọc sớm hơn phụ đề.
//   4. Ước thời lượng đọc so với khoảng thoại, đọc nhanh vừa phải (tối đa FIT_MAX_BOOST) nếu không kịp.
// Ô «Đọc trước / sau phụ đề» (`lead`) vẫn là mức chỉnh tay, cộng thêm lên trên.

import type { Seg } from "./types.ts";

export type SpeechEngine = "browser" | "orpheus" | "edge" | "aura" | "elevenlabs";

/** Độ trễ tạo giọng ước tính ban đầu (giây), dùng cho tới khi đo được số thật. */
export const LATENCY_DEFAULT: Record<SpeechEngine, number> = {
  edge: 0.8,
  orpheus: 1.3,
  aura: 1,
  elevenlabs: 0.9,
  browser: 0.1,
};

/** Bù tối đa (giây): vượt mức này thì thà trễ còn hơn đọc lệch hẳn sang câu trước. */
export const LATENCY_CAP = 1.8;
/** Hệ số trung bình trượt khi gộp số đo mới. */
export const LATENCY_SMOOTH = 0.35;
/** Số câu kế tiếp được tạo trước. */
export const PREFETCH_COUNT = 2;
/** Tăng tốc đọc tối đa khi câu dài hơn khoảng thoại (1,3 = nhanh hơn 30%). */
export const FIT_MAX_BOOST = 1.3;
/** Khoảng thoại ngắn nhất tính tới (giây), để câu rất ngắn không bị ép nhanh. */
export const FIT_MIN_SLOT = 0.8;

export type LatencyTracker = {
  /** Gộp một số đo (giây) cho loại giọng. Số không hợp lệ bị bỏ qua. */
  record: (engine: SpeechEngine, seconds: number) => void;
  /** Độ trễ ước tính hiện tại (giây), đã giới hạn ở LATENCY_CAP. */
  estimate: (engine: SpeechEngine) => number;
  /** Số lần đã đo (để test và báo cáo). */
  samples: (engine: SpeechEngine) => number;
};

export function createLatencyTracker(): LatencyTracker {
  const value = new Map<SpeechEngine, number>();
  const count = new Map<SpeechEngine, number>();
  return {
    record(engine, seconds) {
      if (!Number.isFinite(seconds) || seconds < 0 || seconds > 30) return;
      const prev = value.get(engine);
      value.set(engine, prev === undefined ? seconds : prev + (seconds - prev) * LATENCY_SMOOTH);
      count.set(engine, (count.get(engine) ?? 0) + 1);
    },
    estimate(engine) {
      const measured = value.get(engine);
      const base = measured === undefined ? LATENCY_DEFAULT[engine] : measured;
      return Math.min(LATENCY_CAP, Math.max(0, base));
    },
    samples: (engine) => count.get(engine) ?? 0,
  };
}

/** Độ lệch dùng để chọn câu đang cần đọc: âm là đọc sớm. Cộng chỉnh tay với độ trễ cần bù. */
export function effectiveLead(manualLead: number, compensation: number): number {
  const manual = Number.isFinite(manualLead) ? manualLead : 0;
  const comp = Number.isFinite(compensation) ? Math.max(0, compensation) : 0;
  return manual - comp;
}

const CJK = /[぀-ヿ㐀-鿿가-힯]/g;

/** Ước thời lượng đọc (giây) ở tốc độ `rate`. Tiếng dùng chữ tượng hình đếm riêng vì mỗi chữ dài hơn. */
export function estimateSpeechSeconds(text: string, rate = 1): number {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return 0;
  const wide = (clean.match(CJK) ?? []).length;
  const other = clean.length - wide;
  const seconds = wide / 5 + other / 14;
  return seconds / Math.max(0.5, rate);
}

/** Khoảng thoại (giây theo đồng hồ video) mà câu `index` được phép chiếm: tới đầu câu kế, hoặc hết câu nếu là câu cuối. */
export function slotFor(segs: readonly Seg[], index: number): number {
  const seg = segs[index];
  if (!seg) return FIT_MIN_SLOT;
  const next = segs[index + 1];
  const own = seg.end > seg.start ? seg.end - seg.start : 0;
  const slot = next && next.start > seg.start ? next.start - seg.start : Math.max(own, 3);
  return Math.max(FIT_MIN_SLOT, slot);
}

/**
 * Hệ số tăng tốc để câu đọc vừa khoảng thoại. 1 nếu đã vừa; không bao giờ vượt `max`.
 * `duration` và `slot` cùng đơn vị (giây thật khi nghe).
 */
export function fitBoost(duration: number, slot: number, max = FIT_MAX_BOOST): number {
  if (!Number.isFinite(duration) || !Number.isFinite(slot) || duration <= 0 || slot <= 0) return 1;
  if (duration <= slot) return 1;
  return Math.min(max, duration / slot);
}

/** Các câu kế tiếp cần tạo trước: bỏ câu không có chữ để đọc, tối đa `count` câu. */
export function prefetchTargets(segs: readonly Seg[], index: number, textOf: (seg: Seg) => string, count = PREFETCH_COUNT): number[] {
  const out: number[] = [];
  for (let i = index + 1; i < segs.length && out.length < count; i++) {
    if (textOf(segs[i]).trim()) out.push(i);
  }
  return out;
}

/** Giây còn phải chờ (theo đồng hồ video) trước khi phát, để tiếng bắt đầu đúng lúc dù đã có sẵn. */
export function holdSeconds(compensation: number, elapsed: number): number {
  const comp = Number.isFinite(compensation) ? Math.max(0, compensation) : 0;
  const spent = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return Math.max(0, comp - spent);
}
