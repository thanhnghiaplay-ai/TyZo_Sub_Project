import { useEffect, useState } from "react";
import { getLiveLatency } from "@/lib/live/live-show-room";
import type { LatencyRow } from "@/lib/live/live-latency";
import { liveCandidates } from "@/lib/live/live-show";

const DAY_CHOICES = [1, 7, 30] as const;

/** Giây, một số lẻ. null thì gạch ngang. */
function sec(ms: number | null): string {
  return ms == null ? "–" : `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

/** Độ trễ thật của Dịch trực tiếp, đo ở cầu nối mỗi phiên. Không có tài khoản hay chữ, chỉ số đo. */
export function LiveLatencyBoard() {
  const [days, setDays] = useState<(typeof DAY_CHOICES)[number]>(7);
  const [rows, setRows] = useState<LatencyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const labels = new Map(liveCandidates().map((row) => [row.id, row.label]));

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(null);
    void getLiveLatency({ data: { days } })
      .then((next) => {
        if (alive) setRows(next);
      })
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : "";
        if (alive) setError(!message || /unauthori[sz]ed/i.test(message) ? "Chưa đọc được số đo. Cần đăng nhập bằng tài khoản Quản lý trở lên." : message);
      });
    return () => {
      alive = false;
    };
  }, [days]);

  return (
    <section className="admin-wide grid content-start gap-3 rounded-[var(--radius-card)] border border-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Độ trễ dịch trực tiếp</h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Khoảng thời gian">
          {DAY_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setDays(choice)}
              aria-pressed={days === choice}
              className={`min-tap rounded-full px-3 text-sm ${days === choice ? "bg-accent font-semibold text-ink" : "border border-line"}`}
            >
              {choice === 1 ? "24 giờ" : `${choice} ngày`}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">
        Đo ở cầu nối mỗi phiên. Sẵn sàng: từ lúc khách nối tới lúc Alibaba nhận. Chữ tạm: từ lúc bắt đầu nói tới chữ dịch đầu tiên. Câu chốt: từ lúc hết tiếng tới câu dịch chốt. p50 là mức thường gặp, p95 là lúc chậm. «Không ra chữ»: phiên đã gửi ít nhất 10 giây tiếng mà không nhận được chữ nào, cần xem nhật ký cầu nối (tyzo → 3). Số gần đúng, đủ để so model và so trước, sau khi chỉnh.
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {rows == null && !error ? <p className="text-sm text-muted">Đang đọc…</p> : null}
      {rows && rows.length === 0 ? <p className="text-sm text-muted">Chưa có phiên nào trong khoảng này. Số đo bắt đầu ghi từ bản cầu nối mới.</p> : null}
      {rows && rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm tabular-nums">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">Model</th>
                <th className="py-1 pr-3 font-medium">Nơi</th>
                <th className="py-1 pr-3 font-medium">Phiên</th>
                <th className="py-1 pr-3 font-medium">Sẵn sàng</th>
                <th className="py-1 pr-3 font-medium">Chữ tạm p50 / p95</th>
                <th className="py-1 pr-3 font-medium">Câu chốt p50 / p95</th>
                <th className="py-1 pr-3 font-medium">Tự dừng vì im</th>
                <th className="py-1 font-medium">Không ra chữ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.via}|${row.model}`} className="border-t border-line">
                  <td className="py-1.5 pr-3">{labels.get(row.model) ?? row.model}</td>
                  <td className="py-1.5 pr-3">{row.via === "app" ? "Ứng dụng" : "Web"}</td>
                  <td className="py-1.5 pr-3">{row.sessions}</td>
                  <td className="py-1.5 pr-3">{sec(row.readyP50)}</td>
                  <td className="py-1.5 pr-3">
                    {sec(row.tamP50)} / {sec(row.tamP95)}
                  </td>
                  <td className="py-1.5 pr-3">
                    {sec(row.chotP50)} / {sec(row.chotP95)} <span className="text-xs text-muted">({row.sentences} câu)</span>
                  </td>
                  <td className="py-1.5 pr-3">{row.idleStops}</td>
                  <td className={"py-1.5" + (row.silentFails ? " font-semibold text-danger" : "")}>{row.silentFails}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
