import { Badge, Button, cx } from "@/components/ui/primitives";
import { fmt } from "@/lib/sub/text";
import { reviewCounts, type PolishReview, type ReviewEntry } from "@/lib/polish/polish-review";

/**
 * Màn so sánh «Bản dịch» và «Bản trau chuốt» (bước A4, HANDOFF_NANG_CAP.md).
 * Chỉ vẽ và gọi lại; trạng thái và quy tắc nằm ở lib/polish-review.ts. Màu chỉ dùng biến theme.
 * Điện thoại: bản cũ nằm trên, bản mới nằm dưới. Màn rộng: hai cột cạnh nhau.
 */

export type PolishReviewSeg = { start: number; original: string; translation: string | null };

type Props = {
  segs: PolishReviewSeg[];
  review: PolishReview;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onAcceptAll: () => void;
  onRevertAll: () => void;
  onClose: () => void;
};

function decisionBadge(entry: ReviewEntry) {
  if (entry.status === "refused") return <Badge tone="error">Model từ chối</Badge>;
  if (entry.status === "failed") return <Badge tone="warn">Không trau chuốt được</Badge>;
  if (entry.decision === "accepted") return <Badge tone="ok">Đã dùng bản mới</Badge>;
  if (entry.decision === "rejected") return <Badge tone="neutral">Giữ bản cũ</Badge>;
  if (entry.decision === "conflict") return <Badge tone="warn">Bạn đã sửa câu này, không đổi</Badge>;
  return <Badge tone="accent">Chờ chọn</Badge>;
}

export function PolishReviewPanel({ segs, review, onAccept, onReject, onAcceptAll, onRevertAll, onClose }: Props) {
  const counts = reviewCounts(review);
  const canAcceptAll = review.entries.some((e) => e.status === "changed" && e.decision !== "accepted" && e.decision !== "conflict");

  return (
    <section className="grid gap-3" aria-label="So sánh bản dịch và bản trau chuốt" data-polish-review>
      <header className="grid gap-2">
        <h2 className="text-base font-semibold">Bản trau chuốt</h2>
        <p className="text-sm text-muted">
          {counts.changed} câu được đề xuất đổi, {counts.accepted} câu đã dùng bản mới
          {counts.refused + counts.failed > 0 ? `, ${counts.refused + counts.failed} câu giữ bản cũ vì lỗi hoặc bị từ chối` : ""}.
          {counts.untouched > 0 ? ` ${counts.untouched} câu không đổi hoặc bạn đã sửa tay.` : ""} Chưa chọn thì bản cũ vẫn được giữ.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" size="sm" disabled={!canAcceptAll} onClick={onAcceptAll}>
            Dùng tất cả bản mới
          </Button>
          <Button variant="secondary" size="sm" disabled={counts.accepted === 0} onClick={onRevertAll}>
            Quay lại bản cũ
          </Button>
        </div>
      </header>

      {review.entries.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-card p-3 text-sm text-muted">Model không đề xuất đổi câu nào.</p>
      ) : (
        <ol className="grid gap-2">
          {review.entries.map((entry) => {
            const seg = segs[entry.index];
            const accepted = entry.decision === "accepted";
            return (
              <li key={entry.index} className="grid gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3" data-polish-entry={entry.index}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    Câu {entry.index + 1}
                    {seg ? ` · ${fmt(seg.start)}` : ""}
                  </span>
                  {decisionBadge(entry)}
                </div>
                {seg?.original ? <p className="text-xs text-muted">{seg.original}</p> : null}
                <div className="grid gap-2 md:grid-cols-2">
                  <div className={cx("rounded-[var(--radius-ctl)] border p-2 text-sm", accepted ? "border-line text-muted" : "border-accent")}>
                    <div className="mb-1 text-xs font-semibold text-muted">Bản dịch</div>
                    {entry.oldText}
                  </div>
                  <div className={cx("rounded-[var(--radius-ctl)] border p-2 text-sm", accepted ? "border-accent" : "border-line", entry.status !== "changed" && "text-muted")}>
                    <div className="mb-1 text-xs font-semibold text-muted">Bản trau chuốt</div>
                    {entry.status === "changed" ? entry.newText : (entry.note ?? "Giữ bản cũ.")}
                  </div>
                </div>
                {entry.status === "changed" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="primary" size="sm" disabled={accepted} onClick={() => onAccept(entry.index)}>
                      Dùng bản mới
                    </Button>
                    <Button variant="secondary" size="sm" disabled={entry.decision === "rejected" || entry.decision === "conflict"} onClick={() => onReject(entry.index)}>
                      Giữ bản cũ
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <Button variant="secondary" onClick={onClose}>
        Xong
      </Button>
    </section>
  );
}
