import { acceptSegment, type AcceptReject } from "./text.ts";
import { assignVoices } from "./pitch-voice.ts";
import { refineTimes, type AsrWord } from "./word-time.ts";
import type { Seg } from "./types.ts";

export type RejectReason = AcceptReject;

export const REJECT_LABEL: Record<RejectReason, string> = {
  bad_time: "Mốc thời gian không hợp lệ",
  empty: "Câu trống",
  no_letters: "Không có chữ",
  non_speech: "Không phải lời nói (thở, rên, A/Ah…)",
  hallucination: "Câu ảo (cảm ơn đã xem, đăng ký…)",
  compression: "Nén cao, độ tin thấp",
  low_confidence: "Độ tin thấp",
  short_uncertain: "Một chữ, không chắc",
  brief_uncertain: "Câu rất ngắn, không chắc",
  overlap: "Nằm ở biên chồng đoạn trước",
  duplicate: "Trùng câu vừa nhận",
};

/** whisper: Groq trả ít nhất một segment có text. whisper_empty: gọi Whisper nhưng không có text. silence / decode_fail: không gửi Whisper. */
export type RawPartKind = "whisper" | "whisper_empty" | "silence" | "decode_fail";

export type RawAsrSegment = {
  text: string;
  start: number | null;
  end: number | null;
  no_speech_prob?: number;
  avg_logprob?: number;
  compression_ratio?: number;
};

export type RawAsrPart = {
  partIndex: number;
  start: number;
  end: number;
  requestedLanguage: string;
  detectedLanguage: string;
  language: string;
  kind: RawPartKind;
  segments: RawAsrSegment[];
};

export type RejectEntry = {
  reason: RejectReason;
  partIndex: number;
  start: number | null;
  end: number | null;
  text: string;
  no_speech_prob?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  language: string;
  /** Người dùng đã nghe và chọn bỏ. Không đưa vào phụ đề. */
  dismissed?: boolean;
};

export type AsrPartResult =
  | "skip"
  | "fail"
  | {
      language?: string;
      words?: Array<AsrWord | null>;
      segments?: Array<{
        text?: string;
        start?: number;
        end?: number;
        no_speech_prob?: number;
        avg_logprob?: number;
        compression_ratio?: number;
      } | null>;
    };

export type LangStat = {
  language: string;
  rawParts: number;
  whisperParts: number;
  whisperEmptyParts: number;
  silenceParts: number;
  decodeFailParts: number;
  whisperSegments: number;
  appFiltered: number;
};

export type DiagSummary = {
  whisperParts: number;
  whisperEmptyParts: number;
  silenceParts: number;
  decodeFailParts: number;
  appFiltered: number;
  byReason: Array<{ reason: RejectReason; label: string; count: number }>;
  byLanguage: LangStat[];
};

export function languageBucket(requested: string, detected: string): string {
  const found = detected.trim().toLowerCase();
  if (found) return found;
  const asked = requested.trim().toLowerCase();
  if (asked) return asked;
  return "(tự nhận dạng)";
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function emptyLang(): LangStat {
  return {
    language: "",
    rawParts: 0,
    whisperParts: 0,
    whisperEmptyParts: 0,
    silenceParts: 0,
    decodeFailParts: 0,
    whisperSegments: 0,
    appFiltered: 0,
  };
}

/**
 * Ghi lại kết quả thô của một đoạn, rồi chạy đúng vòng lọc cũ.
 * `segs` chỉ được thêm câu khi bộ lọc chấp nhận — cùng điều kiện như trước Pha 0.
 */
export function ingestAsrPart(input: {
  partIndex: number;
  chunkStart: number;
  chunkEnd: number;
  requestedLanguage: string;
  result: AsrPartResult;
  segs: Seg[];
  samples?: Float32Array | null;
  /** Chỉ bỏ câu đầu đoạn khi đoạn này đè lên đoạn trước. */
  overlapGate?: boolean;
}): { raw: RawAsrPart; rejects: RejectEntry[]; skipped: boolean; failed: boolean } {
  const detected =
    input.result !== "skip" && input.result !== "fail" && typeof input.result.language === "string" ? input.result.language : "";
  const language = languageBucket(input.requestedLanguage, detected);
  const base = {
    partIndex: input.partIndex,
    start: input.chunkStart,
    end: input.chunkEnd,
    requestedLanguage: input.requestedLanguage,
    detectedLanguage: detected,
    language,
  };
  if (input.result === "skip" || input.result === "fail") {
    return {
      raw: { ...base, kind: input.result === "skip" ? "silence" : "decode_fail", segments: [] },
      rejects: [],
      skipped: input.result === "skip",
      failed: input.result === "fail",
    };
  }
  const segments: RawAsrSegment[] = [];
  let textCount = 0;
  for (const item of input.result.segments || []) {
    const text = item && typeof item.text === "string" ? item.text : "";
    if (item && typeof item.text === "string") textCount++;
    segments.push({
      text,
      start: finiteOrNull(item?.start),
      end: finiteOrNull(item?.end),
      no_speech_prob: finite(item?.no_speech_prob),
      avg_logprob: finite(item?.avg_logprob),
      compression_ratio: finite(item?.compression_ratio),
    });
  }
  const rejects: RejectEntry[] = [];
  for (const item of input.result.segments || []) {
    if (!item || typeof item.text !== "string") continue;
    const timing = refineTimes(Number(item.start), Number(item.end), input.result.words);
    const decision = acceptSegment(
      input.segs,
      input.chunkStart,
      timing.start,
      timing.end,
      item.text,
      input.partIndex,
      item,
      input.samples,
      input.overlapGate ?? input.partIndex > 0,
    );
    if (decision.accepted || !decision.reason) continue;
    rejects.push({
      reason: decision.reason,
      partIndex: input.partIndex,
      start: decision.start,
      end: decision.end,
      text: decision.text,
      no_speech_prob: finite(item.no_speech_prob),
      avg_logprob: finite(item.avg_logprob),
      compression_ratio: finite(item.compression_ratio),
      language,
    });
  }
  assignVoices(input.segs);
  return {
    raw: { ...base, kind: textCount ? "whisper" : "whisper_empty", segments },
    rejects,
    skipped: false,
    failed: false,
  };
}

export function slicePcm(pcm: Float32Array, start: number, end: number, sampleRate = 16000): Float32Array | null {
  if (!pcm.length || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const from = Math.max(0, Math.floor(start * sampleRate));
  const to = Math.min(pcm.length, Math.ceil(end * sampleRate));
  if (to - from < 1) return null;
  return pcm.slice(from, to);
}

/** Đưa một câu đã bị lọc vào phụ đề. Trả về false nếu không đủ chữ hoặc đã có câu trùng giờ. */
export function keepRejectedCue(segs: Seg[], row: RejectEntry): boolean {
  if (row.dismissed || row.start == null || row.end == null) return false;
  const text = row.text.trim();
  if (!text || !/[\p{L}\p{N}]/u.test(text)) return false;
  const start = row.start;
  const end = Math.max(row.end, start + 0.2);
  if (segs.some((seg) => seg.original === text && start < seg.end && end > seg.start)) return false;
  segs.push({ start, end, original: text, raw: text, translation: null });
  segs.sort((a, b) => a.start - b.start || a.end - b.end);
  return true;
}

export function summarizeDiagnostics(rejects: RejectEntry[], raw: RawAsrPart[]): DiagSummary {
  const reasonCounts = new Map<RejectReason, number>();
  for (const row of rejects) reasonCounts.set(row.reason, (reasonCounts.get(row.reason) || 0) + 1);
  const byReason = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, label: REJECT_LABEL[reason], count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));

  const langs = new Map<string, LangStat>();
  const bucket = (language: string) => {
    const key = language || "(không rõ)";
    let row = langs.get(key);
    if (!row) {
      row = emptyLang();
      row.language = key;
      langs.set(key, row);
    }
    return row;
  };
  let whisperParts = 0;
  let whisperEmptyParts = 0;
  let silenceParts = 0;
  let decodeFailParts = 0;
  for (const part of raw) {
    const row = bucket(part.language);
    row.rawParts++;
    if (part.kind === "whisper") {
      whisperParts++;
      row.whisperParts++;
      row.whisperSegments += part.segments.reduce((n, seg) => n + (seg.text.trim() ? 1 : 0), 0);
    } else if (part.kind === "whisper_empty") {
      whisperEmptyParts++;
      row.whisperEmptyParts++;
    } else if (part.kind === "silence") {
      silenceParts++;
      row.silenceParts++;
    } else {
      decodeFailParts++;
      row.decodeFailParts++;
    }
  }
  for (const row of rejects) bucket(row.language).appFiltered++;
  return {
    whisperParts,
    whisperEmptyParts,
    silenceParts,
    decodeFailParts,
    appFiltered: rejects.length,
    byReason,
    byLanguage: [...langs.values()].sort((a, b) => a.language.localeCompare(b.language)),
  };
}

export function buildDiagnosticsExport(input: { rejects: RejectEntry[]; raw: RawAsrPart[]; kept: number }) {
  return {
    version: 1,
    kept: input.kept,
    note: "kept là số câu còn trên phụ đề. whisper_empty = Whisper không trả câu. reject = app lọc câu Whisper đã trả. silence/decode_fail = không gửi Whisper.",
    summary: summarizeDiagnostics(input.rejects, input.raw),
    rejects: input.rejects,
    rawParts: input.raw,
  };
}
