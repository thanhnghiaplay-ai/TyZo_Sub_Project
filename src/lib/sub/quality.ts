import type { RawAsrPart, RejectEntry } from "./diagnostics.ts";

/**
 * Chỉ số chất lượng nhận dạng của một lần chạy. Chỉ là số, không chứa chữ phụ đề, tên tệp hay khóa.
 * Độ tin lấy từ avg_logprob của Whisper: đo mức Whisper tự tin vào chữ nó viết, không đo chữ đó đúng hay sai.
 * Các ngưỡng dưới đây là ước lượng ban đầu, chưa chỉnh theo số đo thật. Chủ nên đổi khi đã có dữ liệu.
 */
export const QUALITY_HIGH_LOGPROB = -0.5;
export const QUALITY_LOW_LOGPROB = -0.8;
export const QUALITY_HIGH_COMPRESSION = 2.4;
export const QUALITY_MIN_SEGMENTS = 5;

export const HEALTH_RED_LOW_SHARE = 0.25;
export const HEALTH_RED_DECODE_SHARE = 0.1;
export const HEALTH_YELLOW_LOW_SHARE = 0.12;
export const HEALTH_YELLOW_NOT_HIGH_SHARE = 0.4;
export const HEALTH_YELLOW_DECODE_SHARE = 0.03;
export const HEALTH_YELLOW_FILTER_RATE = 0.3;

export type Health = "green" | "yellow" | "red" | "unknown";
export type Band = "high" | "check" | "low" | "unknown";

export type Bands = { high: number; check: number; low: number; unknown: number };

export type LangEvent = {
  partIndex: number;
  start: number;
  requested: string;
  detected: string;
  /** Có đổi sang bản nhận lại hay không. */
  swapped: boolean;
  logprobBefore: number | null;
  logprobAfter: number | null;
  /** Chỉ để hiện trên máy người dùng. Không đưa vào bản gửi máy chủ. */
  before: string;
  after: string;
};

export type LangCheckReport = {
  /** Số đoạn nghi lệch ngôn ngữ, kể cả đoạn chưa gửi lại vì hết ngân sách. */
  suspect: number;
  /** Số đoạn đã gửi lại. */
  resent: number;
  swapped: number;
  usedSeconds: number;
  budgetSeconds: number;
  events: LangEvent[];
};

export type LangQuality = { language: string; parts: number; segments: number; meanConfidence: number | null };

export type QualitySummary = {
  version: 1;
  segments: number;
  bands: Bands;
  meanConfidence: number | null;
  parts: { total: number; whisper: number; empty: number; silence: number; decodeFail: number };
  appFiltered: number;
  keptCues: number;
  health: Health;
  healthReason: string;
  byLanguage: LangQuality[];
  langCheck: {
    suspect: number;
    resent: number;
    swapped: number;
    meanBefore: number | null;
    meanAfter: number | null;
  };
};

export function confidenceOf(logprob: number | undefined | null): number | null {
  if (typeof logprob !== "number" || !Number.isFinite(logprob)) return null;
  return Math.min(1, Math.max(0, Math.exp(logprob)));
}

export function bandOf(seg: { avg_logprob?: number; compression_ratio?: number }): Band {
  const lp = seg.avg_logprob;
  if (typeof lp !== "number" || !Number.isFinite(lp)) return "unknown";
  if (lp < QUALITY_LOW_LOGPROB || (seg.compression_ratio ?? 0) > QUALITY_HIGH_COMPRESSION) return "low";
  if (lp >= QUALITY_HIGH_LOGPROB) return "high";
  return "check";
}

function weightedMean(items: Array<{ value: number; weight: number }>): number | null {
  let sum = 0;
  let weight = 0;
  for (const item of items) {
    sum += item.value * item.weight;
    weight += item.weight;
  }
  return weight ? sum / weight : null;
}

function meanOf(values: Array<number | null>): number | null {
  const ok = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!ok.length) return null;
  return ok.reduce((a, b) => a + b, 0) / ok.length;
}

export function healthOf(input: {
  segments: number;
  bands: Bands;
  parts: { total: number; decodeFail: number };
  appFiltered: number;
}): { health: Health; reason: string } {
  if (input.segments < QUALITY_MIN_SEGMENTS) return { health: "unknown", reason: "Chưa đủ câu để đánh giá." };
  const known = input.bands.high + input.bands.check + input.bands.low;
  if (known === 0) return { health: "unknown", reason: "Whisper không trả độ tin." };
  const lowShare = input.bands.low / known;
  const notHigh = (input.bands.check + input.bands.low) / known;
  const decode = input.parts.total ? input.parts.decodeFail / input.parts.total : 0;
  const filter = input.appFiltered / Math.max(1, input.segments);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  if (lowShare > HEALTH_RED_LOW_SHARE) return { health: "red", reason: `${pct(lowShare)} câu có độ tin thấp.` };
  if (decode > HEALTH_RED_DECODE_SHARE) return { health: "red", reason: `${pct(decode)} đoạn không giải mã được.` };
  if (lowShare > HEALTH_YELLOW_LOW_SHARE) return { health: "yellow", reason: `${pct(lowShare)} câu có độ tin thấp.` };
  if (notHigh > HEALTH_YELLOW_NOT_HIGH_SHARE) return { health: "yellow", reason: `${pct(notHigh)} câu chưa đạt độ tin cao.` };
  if (decode > HEALTH_YELLOW_DECODE_SHARE) return { health: "yellow", reason: `${pct(decode)} đoạn không giải mã được.` };
  if (filter > HEALTH_YELLOW_FILTER_RATE) return { health: "yellow", reason: `App lọc bỏ ${pct(filter)} câu Whisper trả về.` };
  return { health: "green", reason: "Độ tin cao, ít đoạn lỗi." };
}

export function summarizeQuality(input: {
  raw: RawAsrPart[];
  rejects: RejectEntry[];
  kept: number;
  lang?: LangCheckReport | null;
}): QualitySummary {
  const bands: Bands = { high: 0, check: 0, low: 0, unknown: 0 };
  const conf: Array<{ value: number; weight: number }> = [];
  const parts = { total: 0, whisper: 0, empty: 0, silence: 0, decodeFail: 0 };
  const langs = new Map<string, { parts: number; segments: number; conf: Array<{ value: number; weight: number }> }>();
  let segments = 0;
  for (const part of input.raw) {
    parts.total++;
    if (part.kind === "whisper") parts.whisper++;
    else if (part.kind === "whisper_empty") parts.empty++;
    else if (part.kind === "silence") parts.silence++;
    else parts.decodeFail++;
    const key = part.language || "(không rõ)";
    let row = langs.get(key);
    if (!row) {
      row = { parts: 0, segments: 0, conf: [] };
      langs.set(key, row);
    }
    row.parts++;
    for (const seg of part.segments) {
      const text = typeof seg.text === "string" ? seg.text.trim() : "";
      if (!text) continue;
      segments++;
      row.segments++;
      bands[bandOf(seg)]++;
      const c = confidenceOf(seg.avg_logprob);
      if (c !== null) {
        const item = { value: c, weight: Math.max(1, text.length) };
        conf.push(item);
        row.conf.push(item);
      }
    }
  }
  const { health, reason } = healthOf({ segments, bands, parts, appFiltered: input.rejects.length });
  const lang = input.lang;
  return {
    version: 1,
    segments,
    bands,
    meanConfidence: weightedMean(conf),
    parts,
    appFiltered: input.rejects.length,
    keptCues: input.kept,
    health,
    healthReason: reason,
    byLanguage: [...langs.entries()]
      .map(([language, row]) => ({ language, parts: row.parts, segments: row.segments, meanConfidence: weightedMean(row.conf) }))
      .sort((a, b) => a.language.localeCompare(b.language)),
    langCheck: {
      suspect: lang?.suspect ?? 0,
      resent: lang?.resent ?? 0,
      swapped: lang?.swapped ?? 0,
      meanBefore: lang ? meanOf(lang.events.filter((e) => e.swapped).map((e) => confidenceOf(e.logprobBefore))) : null,
      meanAfter: lang ? meanOf(lang.events.filter((e) => e.swapped).map((e) => confidenceOf(e.logprobAfter))) : null,
    },
  };
}
