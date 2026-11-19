import { Badge, Button } from "@/components/ui/primitives";
import { PolishReviewPanel, type PolishReviewSeg } from "@/components/polish-review-panel";
import type { PolishUi } from "@/components/use-polish";

/**
 * Khung «Trau chuốt bản dịch» (bước A5.4, HANDOFF_NANG_CAP.md): chọn model kèm giá Token, chạy, so sánh.
 * Chỉ vẽ; luồng và quy tắc nằm ở use-polish.ts. Màu chỉ dùng biến theme. Xác nhận bằng hộp của app (askConfirm trong hook).
 */
export function PolishPanel({ ui, segs, disabled }: { ui: PolishUi; segs: PolishReviewSeg[]; disabled: boolean }) {
  if (ui.phase === "idle") {
    const has = segs.some((seg) => seg.translation && seg.translation.trim());
    if (!has) return null;
    return (
      <div className="grid gap-1">
        <Button variant="secondary" size="sm" disabled={disabled} onClick={() => void ui.prepare()} data-polish-open>
          Trau chuốt bản dịch
        </Button>
      </div>
    );
  }

  if (ui.phase === "review" && ui.review) {
    return (
      <PolishReviewPanel
        segs={segs}
        review={ui.review}
        onAccept={ui.accept}
        onReject={ui.reject}
        onAcceptAll={ui.acceptEvery}
        onRevertAll={ui.revert}
        onClose={() => void ui.finish()}
      />
    );
  }

  return (
    <section className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-card p-3" aria-label="Trau chuốt bản dịch" data-polish-pick>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Trau chuốt bản dịch</h2>
        {ui.plan && <Badge tone="neutral">{ui.plan.sendable} câu</Badge>}
      </header>

      {ui.phase === "quoting" && <p className="text-sm text-muted">Đang tính giá từng model…</p>}

      {ui.phase === "running" && (
        <div className="grid gap-2">
          <p className="text-sm">
            Đang trau chuốt{ui.progress ? `: ${ui.progress.done}/${ui.progress.total} câu` : "…"}. Bản dịch hiện tại chưa bị đổi.
          </p>
          <Button variant="secondary" size="sm" onClick={ui.cancel}>
            Hủy
          </Button>
        </div>
      )}

      {ui.phase === "pick" && (
        <div className="grid gap-2">
          {ui.error && <p className="text-sm text-danger">{ui.error}</p>}
          {ui.note && <p className="text-sm text-muted">{ui.note}</p>}
          {ui.rows.length > 0 && (
            <ul className="grid gap-2" role="radiogroup" aria-label="Model trau chuốt">
              {ui.rows.map((row) => (
                <li key={row.id}>
                  <label className="flex min-tap items-start gap-2 rounded-[var(--radius-ctl)] border border-line bg-bg p-2 text-sm">
                    <input
                      className="mt-1"
                      type="radio"
                      name="polish-model"
                      checked={ui.picked === row.id}
                      disabled={!row.ready}
                      onChange={() => ui.setPicked(row.id)}
                    />
                    <span className="grid gap-0.5">
                      <span className="font-semibold">{row.name}</span>
                      <span className="text-xs text-muted">
                        {row.ready && row.tokens != null ? `Ước ${row.tokens.toLocaleString("vi-VN")} Token dịch` : row.reason || "Chưa có giá"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" size="sm" disabled={!ui.picked || ui.rows.length === 0} onClick={() => void ui.run()}>
              Trau chuốt
            </Button>
            <Button variant="secondary" size="sm" onClick={ui.close}>
              Đóng
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
