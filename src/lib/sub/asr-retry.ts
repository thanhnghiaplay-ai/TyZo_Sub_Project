import type { RawAsrPart } from "./diagnostics.ts";
import { fmt } from "./text.ts";

/** Tổng thời lượng âm thanh được giải mã lại trong một lần chạy. Mỗi đoạn chỉ một lần. */
export const ASR_RETRY_BUDGET_SECONDS = 180;

export type DecodeSpan = { index: number; start: number; end: number };

export type RetryPlan = {
  budgetSeconds: number;
  retry: DecodeSpan[];
  deferred: DecodeSpan[];
  plannedSeconds: number;
};

export type MissingPart = DecodeSpan & { retried: boolean };

export type AsrRetryReport = {
  budgetSeconds: number;
  usedSeconds: number;
  missing: MissingPart[];
};

export function partSeconds(part: DecodeSpan): number {
  const n = part.end - part.start;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Chỉ đoạn không giải mã được. Im lặng, Whisper trống và câu bị lọc không nằm trong danh sách thử lại. */
export function spansForDecodeRetry(raw: RawAsrPart[], alreadyRetried: Iterable<number>): DecodeSpan[] {
  const seen = new Set(alreadyRetried);
  const out: DecodeSpan[] = [];
  const used = new Set<number>();
  for (const part of raw) {
    if (part.kind !== "decode_fail" || seen.has(part.partIndex) || used.has(part.partIndex)) continue;
    used.add(part.partIndex);
    out.push({ index: part.partIndex, start: part.start, end: part.end });
  }
  return out;
}

/** Lấy đoạn theo thứ tự chỉ số, đến khi hết ngân sách. Đoạn không vừa phần còn lại thì để nguyên, không cắt. */
export function planDecodeRetries(
  failed: DecodeSpan[],
  alreadyRetried: Iterable<number> = [],
  budgetSeconds = ASR_RETRY_BUDGET_SECONDS,
): RetryPlan {
  const seen = new Set(alreadyRetried);
  const unique: DecodeSpan[] = [];
  const used = new Set<number>();
  for (const part of [...failed].sort((a, b) => a.index - b.index)) {
    if (seen.has(part.index) || used.has(part.index)) continue;
    used.add(part.index);
    unique.push(part);
  }
  const retry: DecodeSpan[] = [];
  const deferred: DecodeSpan[] = [];
  let plannedSeconds = 0;
  for (const part of unique) {
    const seconds = partSeconds(part);
    if (plannedSeconds + seconds <= budgetSeconds + 0.05) {
      retry.push(part);
      plannedSeconds += seconds;
    } else deferred.push(part);
  }
  return { budgetSeconds, retry, deferred, plannedSeconds };
}

export function formatSeconds(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} giây`;
}

export function formatPartSpan(part: DecodeSpan): string {
  return `đoạn ${part.index + 1} (${fmt(part.start)}–${fmt(part.end)})`;
}

/** Câu ngắn cho dòng trạng thái. Danh sách đầy đủ nằm ở bảng chẩn đoán. */
export function formatRetryStatus(report: AsrRetryReport, limit = 3): string {
  const used = `Đã dùng ${formatSeconds(report.usedSeconds)} để thử lại (ngân sách ${formatSeconds(report.budgetSeconds)}).`;
  if (!report.missing.length) return used;
  const shown = report.missing.slice(0, limit).map((part) => {
    const span = formatPartSpan(part);
    return part.retried ? `${span} vẫn chưa nhận dạng được` : `${span} chưa thử lại vì hết ngân sách`;
  });
  const more = report.missing.length > limit ? ` và ${report.missing.length - limit} đoạn nữa` : "";
  return `${shown.join("; ")}${more}. ${used}`;
}
