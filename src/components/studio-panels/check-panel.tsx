import { usePipeline } from "@/components/use-pipeline";
import { PolishPanel } from "@/components/polish-panel";
import { fmt } from "@/lib/sub/text";
import { AsrDiag } from "@/components/studio-diag";
import type * as React from "react";
import type { ToolId } from "@/components/studio-tools";

type PipelineApp = ReturnType<typeof usePipeline>;

export type CheckPanelProps = {
  toolTab: ToolId;
  app: PipelineApp;
};

/** Thẻ «check» của màn hình dịch (tách từ studio.tsx, đợt 5). */
export function CheckPanel(props: CheckPanelProps) {
  const { toolTab, app } = props;
  return (
    <section id="tool-check" role="region" aria-labelledby="tool-tab-check" hidden={toolTab !== "check"} className="grid gap-3 p-4">
      <PolishPanel ui={app.polish} segs={app.segs} disabled={app.running} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm" disabled={app.running || app.segs.length === 0} onClick={() => void app.scanGaps()}>
          Dò khoảng trống
        </button>
        {app.segs.some((seg) => seg.translationFailed) && (
          <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-danger px-3 text-sm font-semibold text-danger" onClick={app.retryFailed}>
            Dịch lại các câu lỗi
          </button>
        )}
      </div>
      {app.gapPlan && (app.gapPlan.selected.length > 0 || app.gapPlan.deferred.length > 0) && (
        <div className="grid gap-2 rounded-[var(--radius-ctl)] border border-line bg-bg p-3 text-sm">
          <p>
            {app.gapPlan.selected.length
              ? `${app.gapPlan.selected.length} khoảng có tiếng nhưng chưa có câu, ${app.gapPlan.audioSeconds.toFixed(1)} giây. Chưa gửi.`
              : "Không còn khoảng nào vừa ngân sách."}
            {app.gapPlan.deferred.length ? ` ${app.gapPlan.deferred.length} khoảng vượt ngân sách ${app.gapPlan.budgetSeconds} giây, không gửi.` : ""}
          </p>
          {app.gapPlan.selected.length > 0 && (
            <ul className="grid gap-1 text-muted">
              {app.gapPlan.selected.slice(0, 6).map((span) => (
                <li key={`${span.start}-${span.end}`}>
                  {fmt(span.start)}–{fmt(span.end)}
                </li>
              ))}
            </ul>
          )}
          {app.gapPlan.selected.length > 0 && (
            <button type="button" className="min-tap rounded-[var(--radius-ctl)] bg-accent font-semibold text-ink" disabled={app.running} onClick={() => void app.fillGaps()}>
              Nhận dạng các khoảng này
            </button>
          )}
        </div>
      )}
      <AsrDiag
        raw={app.diag.raw}
        rejects={app.diag.rejects}
        kept={app.segs.length}
        fileName={app.file?.name || app.audioFile?.name}
        retry={app.asrRetry}
        filterRetry={app.filterRetry}
        lang={app.langReport}
        onPlay={app.playReject}
        onKeep={app.keepReject}
        onDrop={app.dropReject}
      />
      {!app.diag.raw.length && !app.diag.rejects.length && !app.gapPlan && <p className="text-sm text-muted">Chưa có gì để kiểm tra. Hãy nhận dạng một video trước.</p>}
    </section>
  );
}
