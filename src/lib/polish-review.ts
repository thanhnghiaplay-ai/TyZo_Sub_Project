// Logic thuần của màn so sánh «Bản dịch» và «Bản trau chuốt» (bước A4 trong HANDOFF_NANG_CAP.md).
// Không đụng giao diện, không gọi mạng. Mọi hàm trả mảng/đối tượng MỚI, không sửa tại chỗ.
//
// Quy tắc:
// - Chỉ câu `changed` mới có nút chấp nhận. `refused` và `failed` hiện để biết (kèm `note`), không chấp nhận được.
//   `same`, `locked`, `skipped` không vào danh sách duyệt, chỉ đếm.
// - KHÔNG ghi đè ngay: chạy xong chỉ lập danh sách duyệt, `translation` của câu giữ nguyên cho đến khi chấp nhận.
// - Câu người dùng đã sửa tay (`edited`) không bao giờ bị đổi, kể cả khi sửa SAU lúc trau chuốt chạy.
// - Câu bị đổi bởi người dùng sau khi lập danh sách (bản hiện tại khác bản lúc lập) là «xung đột»: không đè, không hoàn.

import type { PolishResult, PolishStatus } from "./sub/polish.ts";

export type SegLike = { translation: string | null; edited?: boolean };

type ReviewDecision = "pending" | "accepted" | "rejected" | "conflict";

export type ReviewEntry = {
  /** Chỉ số câu trong mảng phụ đề. */
  index: number;
  /** Bản dịch lúc lập danh sách (bản cũ). */
  oldText: string;
  /** Bản model đề xuất. Với `refused`/`failed` bằng bản cũ. */
  newText: string;
  status: Extract<PolishStatus, "changed" | "refused" | "failed">;
  note?: string;
  decision: ReviewDecision;
};

export type PolishReview = {
  entries: ReviewEntry[];
  /** Số câu không vào danh sách duyệt: giữ nguyên (`same`), sửa tay (`locked`), chưa dịch (`skipped`). */
  untouched: number;
};

/** Lập danh sách duyệt từ kết quả `polishAll`. `segs` là mảng phụ đề lúc bấm trau chuốt. */
export function buildReview(segs: SegLike[], results: PolishResult[]): PolishReview {
  const entries: ReviewEntry[] = [];
  let untouched = 0;
  results.forEach((result, index) => {
    const old = segs[index]?.translation ?? "";
    if (result.status === "changed" || result.status === "refused" || result.status === "failed") {
      entries.push({
        index,
        oldText: old,
        newText: result.status === "changed" ? result.text : old,
        status: result.status,
        note: result.note,
        decision: "pending",
      });
    } else {
      untouched += 1;
    }
  });
  return { entries, untouched };
}

function setDecision(review: PolishReview, index: number, decision: ReviewDecision): PolishReview {
  return { ...review, entries: review.entries.map((e) => (e.index === index ? { ...e, decision } : e)) };
}

function findEntry(review: PolishReview, index: number): ReviewEntry | undefined {
  return review.entries.find((e) => e.index === index);
}

type ReviewApply<T extends SegLike> = { segs: T[]; review: PolishReview };

function applyText<T extends SegLike>(segs: T[], index: number, text: string): T[] {
  return segs.map((seg, i) => (i === index ? { ...seg, translation: text } : seg));
}

/** Chấp nhận một câu: ghi bản mới vào phụ đề. Chỉ câu `changed`, chưa sửa tay, và bản hiện tại vẫn là bản cũ lúc lập danh sách. */
export function acceptOne<T extends SegLike>(segs: T[], review: PolishReview, index: number): ReviewApply<T> {
  const entry = findEntry(review, index);
  const seg = segs[index];
  if (!entry || !seg || entry.status !== "changed" || entry.decision === "accepted") return { segs, review };
  if (seg.edited || (seg.translation ?? "") !== entry.oldText) return { segs, review: setDecision(review, index, "conflict") };
  return { segs: applyText(segs, index, entry.newText), review: setDecision(review, index, "accepted") };
}

/** Hoàn tác một câu đã chấp nhận (hoặc đánh dấu từ chối khi còn chờ): trả về bản cũ. */
export function rejectOne<T extends SegLike>(segs: T[], review: PolishReview, index: number): ReviewApply<T> {
  const entry = findEntry(review, index);
  const seg = segs[index];
  if (!entry || !seg || entry.status !== "changed") return { segs, review };
  if (entry.decision !== "accepted") return { segs, review: setDecision(review, index, "rejected") };
  if (seg.edited || (seg.translation ?? "") !== entry.newText) return { segs, review: setDecision(review, index, "conflict") };
  return { segs: applyText(segs, index, entry.oldText), review: setDecision(review, index, "rejected") };
}

/** Chấp nhận tất cả câu `changed` còn chờ hoặc đã bị từ chối. Câu xung đột được bỏ qua và đánh dấu. */
export function acceptAll<T extends SegLike>(segs: T[], review: PolishReview): ReviewApply<T> {
  let state: ReviewApply<T> = { segs, review };
  for (const entry of review.entries) {
    if (entry.status !== "changed" || entry.decision === "accepted") continue;
    state = acceptOne(state.segs, state.review, entry.index);
  }
  return state;
}

/** «Quay lại bản cũ»: hoàn mọi câu đã chấp nhận về bản cũ. Câu đã đổi tay sau đó được giữ nguyên và đánh dấu xung đột. */
export function revertAll<T extends SegLike>(segs: T[], review: PolishReview): ReviewApply<T> {
  let state: ReviewApply<T> = { segs, review };
  for (const entry of review.entries) {
    if (entry.status !== "changed" || entry.decision !== "accepted") continue;
    state = rejectOne(state.segs, state.review, entry.index);
  }
  return state;
}

type ReviewCounts = {
  /** Số câu model đề xuất đổi. */
  changed: number;
  pending: number;
  accepted: number;
  rejected: number;
  conflict: number;
  refused: number;
  failed: number;
  untouched: number;
};

export function reviewCounts(review: PolishReview): ReviewCounts {
  const c: ReviewCounts = { changed: 0, pending: 0, accepted: 0, rejected: 0, conflict: 0, refused: 0, failed: 0, untouched: review.untouched };
  for (const e of review.entries) {
    if (e.status === "refused") c.refused += 1;
    else if (e.status === "failed") c.failed += 1;
    else {
      c.changed += 1;
      c[e.decision] += 1;
    }
  }
  return c;
}

/** Còn câu chờ quyết định (để hỏi lại trước khi đóng màn so sánh). */
export function hasPending(review: PolishReview): boolean {
  return review.entries.some((e) => e.status === "changed" && e.decision === "pending");
}
