import type { RawAsrPart, RejectEntry, RejectReason } from "./diagnostics.ts";

/** Riêng với ngân sách giải mã lỗi. Không cộng chung. */
export const FILTER_RETRY_BUDGET_SECONDS = 120;
export const FILTER_RETRY_PAD = 0.35;

const REASONS = new Set<RejectReason>(["low_confidence", "short_uncertain", "brief_uncertain"]);

export type FilterClip = {
  key: string;
  start: number;
  end: number;
  reason: RejectReason | "whisper_empty";
};

export type FilterRetryPlan = {
  budgetSeconds: number;
  retry: FilterClip[];
  deferred: FilterClip[];
  plannedSeconds: number;
};

export type FilterRetryReport = {
  budgetSeconds: number;
  usedSeconds: number;
  sent: number;
  deferred: number;
};

export function filterRejectKey(row: Pick<RejectEntry, "reason" | "start" | "text">): string {
  return `${row.reason}:${row.start ?? "x"}:${row.text}`;
}

function clipSeconds(clip: FilterClip): number {
  const n = clip.end - clip.start;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Chỉ câu không chắc và đoạn Whisper trống. Câu user đã bấm Bỏ, lỗi giải mã, và câu đã thử không vào danh sách.
 */
export function planFilterRetries(input: {
  rejects: RejectEntry[];
  raw: RawAsrPart[];
  already?: Iterable<string>;
  budgetSeconds?: number;
}): FilterRetryPlan {
  const budgetSeconds = input.budgetSeconds ?? FILTER_RETRY_BUDGET_SECONDS;
  const seen = new Set(input.already ?? []);
  const clips: FilterClip[] = [];
  const used = new Set<string>();
  const push = (clip: FilterClip) => {
    if (seen.has(clip.key) || used.has(clip.key) || !(clip.end > clip.start)) return;
    used.add(clip.key);
    clips.push(clip);
  };
  for (const row of input.rejects) {
    if (row.dismissed || !REASONS.has(row.reason) || row.start == null || row.end == null) continue;
    const start = Math.max(0, row.start - FILTER_RETRY_PAD);
    const end = Math.max(start + 0.4, row.end + FILTER_RETRY_PAD);
    push({ key: filterRejectKey(row), start, end, reason: row.reason });
  }
  for (const part of input.raw) {
    if (part.kind !== "whisper_empty") continue;
    push({
      key: `whisper_empty:${part.partIndex}`,
      start: part.start,
      end: Math.max(part.end, part.start + 0.4),
      reason: "whisper_empty",
    });
  }
  clips.sort((a, b) => a.start - b.start || a.end - b.end);
  const retry: FilterClip[] = [];
  const deferred: FilterClip[] = [];
  let plannedSeconds = 0;
  for (const clip of clips) {
    const seconds = clipSeconds(clip);
    if (plannedSeconds + seconds <= budgetSeconds + 0.05) {
      retry.push(clip);
      plannedSeconds += seconds;
    } else deferred.push(clip);
  }
  return { budgetSeconds, retry, deferred, plannedSeconds };
}
