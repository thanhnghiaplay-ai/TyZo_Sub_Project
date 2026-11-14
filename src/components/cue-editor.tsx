import { Check, X } from "lucide-react";
import { fmt } from "@/lib/sub/text";

const FIELD =
  "min-h-11 w-full rounded-xl border border-line bg-raised px-3 py-2 text-base text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Sửa câu ngay tại dòng đang xem. Ctrl+Enter hoặc nút Lưu để lưu, Esc hoặc nút Hủy để bỏ.
 * Ô thứ hai thêm một cặp «tên gốc = cách dịch» áp cho cả phim, như hộp sửa cũ.
 */
export function CueEditor({
  start,
  original,
  draft,
  rule,
  onDraft,
  onRule,
  onSave,
  onCancel,
}: {
  start: number;
  original: string;
  draft: string;
  rule: string;
  onDraft: (value: string) => void;
  onRule: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="grid gap-2 rounded-xl border border-accent bg-raised p-3"
      aria-label={`Sửa câu lúc ${fmt(start)}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <span className="text-xs font-semibold text-accent">{fmt(start)} · đang sửa</span>
      <p className="text-sm text-muted">{original}</p>
      <textarea
        autoFocus
        className={FIELD}
        rows={3}
        value={draft}
        aria-label="Câu dịch"
        onChange={(event) => onDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onSave();
          }
        }}
      />
      <input className={FIELD} placeholder="Áp cho cả phim: tên gốc = cách dịch" aria-label="Thuật ngữ áp cho cả phim" value={rule} onChange={(event) => onRule(event.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="min-tap inline-flex items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-ink">
          <Check className="size-4" aria-hidden="true" />
          Lưu
        </button>
        <button type="button" className="min-tap inline-flex items-center gap-1.5 rounded-full border border-line px-4 text-sm" onClick={onCancel}>
          <X className="size-4" aria-hidden="true" />
          Hủy
        </button>
        <span className="text-xs text-muted">Ctrl+Enter để lưu · Esc để hủy</span>
      </div>
    </form>
  );
}
