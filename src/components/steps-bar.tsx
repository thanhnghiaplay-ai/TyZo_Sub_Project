import { Icon } from "@/components/ui/icon";
import type { Stage, StageReport } from "@/lib/sub/stage-progress";

function Dot({ stage }: { stage: Stage }) {
  if (stage.state === "done") return <Icon slot="st.ok" className="size-3.5 shrink-0 text-accent" />;
  if (stage.state === "active") return <Icon slot="ui.busy" className="size-3.5 shrink-0 animate-spin text-accent motion-reduce:animate-none" />;
  if (stage.state === "skip") return <Icon slot="ui.skip" className="size-3.5 shrink-0 text-muted" />;
  return <span className="size-3 shrink-0 rounded-full border border-line" aria-hidden />;
}

/** Vị trí các vạch ngăn giai đoạn trên thanh liền, theo đúng trọng số của computeStages (5, 15, 70, 10). */
const NOTCHES = [5, 20, 90];

/**
 * Dòng thời gian tiến trình: một thanh liền chạy từ trái sang phải, có vạch ngăn bốn giai đoạn,
 * phần trăm tổng ở bên phải, và tên giai đoạn kèm số đếm ngay bên dưới.
 */
/** waiting: có chữ thì lượt đang dừng chờ khách (ví dụ xem bảng nhân vật), không ghi «Đang: Dịch» cho khỏi hiểu lầm. */
export function StepsBar({ report, waiting, keepOpen = false }: { report: StageReport | null; waiting?: string; /** Đang chạy: nhắc giữ trang mở (v5.32.1). */ keepOpen?: boolean }) {
  if (!report) return null;
  const label = report.stages.map((s) => `${s.label}: ${s.text || (s.state === "wait" ? "chờ" : s.state === "done" ? "xong" : "")}`).join("; ");
  const current = report.stages.find((s) => s.id === report.active);
  return (
    <div className="grid shrink-0 gap-1.5" role="group" aria-label="Tiến trình theo giai đoạn">
      <div className="flex items-center gap-2">
        <div
          className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={report.percent}
          aria-valuetext={`${report.percent}%. ${label}`}
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${report.percent}%` }} />
          {NOTCHES.map((at) => (
            <span key={at} aria-hidden className="absolute inset-y-0 w-px bg-bg/70" style={{ left: `${at}%` }} />
          ))}
        </div>
        <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-fg" aria-hidden>
          {report.percent}%
        </span>
      </div>
      {waiting ? (
        <p className="text-xs text-muted" data-steps-waiting>
          <span className="font-semibold text-accent">Đang chờ bạn</span> · {waiting}
        </p>
      ) : (
        current && (
          <p className="text-xs text-muted" aria-hidden>
            Đang: <span className="font-semibold text-accent">{current.label}</span>
            {current.text ? ` · ${current.text}` : ""}
          </p>
        )
      )}
      {keepOpen && !waiting && (
        <p className="text-xs text-muted" data-keep-open>
          Giữ trang này mở đến khi xong. Màn hình được giữ sáng; chuyển sang ứng dụng khác lâu thì điện thoại có thể dừng lượt chạy.
        </p>
      )}
      <ol className="grid grid-cols-4 gap-1.5">
        {report.stages.map((stage) => (
          <li key={stage.id} className="min-w-0" aria-current={stage.state === "active" ? "step" : undefined}>
            <span className={"flex items-center gap-1 text-xs font-semibold " + (stage.state === "active" ? "text-accent" : stage.state === "wait" || stage.state === "skip" ? "text-muted" : "text-fg")}>
              <Dot stage={stage} />
              <span className="truncate">{stage.label}</span>
            </span>
            <span className="block truncate pl-[1.125rem] text-[11px] text-muted">{stage.text || " "}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
