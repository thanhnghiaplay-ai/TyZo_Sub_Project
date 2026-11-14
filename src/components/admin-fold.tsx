import type { ReactNode } from "react";

/**
 * Thẻ gập cho phần dài của Admin. Đóng sẵn, tiêu đề và một dòng tóm tắt luôn thấy,
 * bấm vào mới mở. Dùng <details> nên không cần thêm trạng thái.
 */
export function Fold({ title, hint, children, defaultOpen = false }: { title: string; hint?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-2xl border border-line bg-card" open={defaultOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="grid min-w-0">
          <span className="font-semibold">{title}</span>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </span>
        <span aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}
