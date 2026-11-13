import { Check, Loader2, Minus } from "lucide-react";
import type { Stage, StageReport } from "@/lib/sub/stage-progress";

function Dot({ stage }: { stage: Stage }) {
  if (stage.state === "done") return <Check className="size-3.5 shrink-0 text-accent" aria-hidden />;
  if (stage.state === "active") return <Loader2 className="size-3.5 shrink-0 animate-spin text-accent motion-reduce:animate-none" aria-hidden />;
  if (stage.state === "skip") return <Minus className="size-3.5 shrink-0 text-muted" aria-hidden />;
  return <span className="size-3 shrink-0 rounded-full border border-line" aria-hidden />;
}

/** Thanh tiến trình theo giai đoạn: Cắt → Nhận dạng → Dịch → Sửa lại. */
export function StepsBar({ report }: { report: StageReport | null }) {
  if (!report) return null;
  const label = report.stages.map((s) => `${s.label}: ${s.text || (s.state === "wait" ? "chờ" : s.state === "done" ? "xong" : "")}`).join("; ");
  return (
    <div className="grid shrink-0 gap-1.5" role="group" aria-label="Tiến trình theo giai đoạn">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={report.percent}
        aria-valuetext={`${report.percent}%. ${label}`}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${report.percent}%` }} />
      </div>
      <ol className="grid grid-cols-4 gap-1.5">
        {report.stages.map((stage) => (
          <li key={stage.id} className="min-w-0" aria-current={stage.state === "active" ? "step" : undefined}>
            <span className={"flex items-center gap-1 text-xs font-semibold " + (stage.state === "active" ? "text-accent" : stage.state === "wait" || stage.state === "skip" ? "text-muted" : "text-fg")}>
              <Dot stage={stage} />
              <span className="truncate">{stage.label}</span>
            </span>
            <span className="block truncate pl-[1.125rem] text-[11px] text-muted">{stage.text || "\u00a0"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
