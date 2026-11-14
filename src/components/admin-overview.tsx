import { useCallback, useEffect, useState, type ReactNode } from "react";
import { pushToast } from "@/components/toast";
import { getOverview } from "@/lib/overview-room";
import type { Overview, OverviewRange, TopUser } from "@/lib/overview-data";
import type { AdminTab } from "@/lib/admin-tabs";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

const RANGES: { id: OverviewRange; label: string }[] = [
  { id: 1, label: "Hôm nay" },
  { id: 7, label: "7 ngày" },
  { id: 30, label: "30 ngày" },
];

function Card({ title, go, onGo, children }: { title: string; go: AdminTab; onGo: (tab: AdminTab) => void; children: ReactNode }) {
  return (
    <article className="grid content-start gap-2 rounded-2xl border border-line bg-card p-4">
      <h3 className="text-sm font-semibold text-muted">{title}</h3>
      {children}
      <button type="button" className="min-tap w-fit rounded-full border border-line px-3 text-sm" onClick={() => onGo(go)}>
        Xem chi tiết
      </button>
    </article>
  );
}

function Big({ value, hint }: { value: string; hint?: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function TopList({ rows, money, empty }: { rows: TopUser[]; money: boolean; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ol className="grid gap-1 text-sm">
      {rows.map((row, index) => (
        <li key={row.userId} className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="min-w-0 truncate text-left underline-offset-2 hover:underline"
            onClick={() => window.dispatchEvent(new CustomEvent("tyzo-open-user", { detail: row.email }))}
            disabled={!row.email}
          >
            {index + 1}. {row.email || "Không rõ tài khoản"}
          </button>
          <span className="shrink-0 text-muted">{money ? `${dong(row.amount)} · ${row.runs} lượt` : `${row.amount} lỗi`}</span>
        </li>
      ))}
    </ol>
  );
}

/** Tổng quan: số chính, cảnh báo, top người dùng. Mỗi thẻ có nút nhảy vào tab chi tiết. */
export function AdminOverview({ owner, onGo }: { owner: boolean; onGo: (tab: AdminTab) => void }) {
  const [range, setRange] = useState<OverviewRange>(1);
  const [view, setView] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    (next: OverviewRange) => {
      setLoading(true);
      void getOverview({ data: next })
        .then((result) => setView(result))
        .catch((error) => pushToast(error instanceof Error && error.message ? error.message : "Chưa đọc được tổng quan.", "bad"))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load(range);
  }, [load, range]);

  const rangeText = range === 1 ? "hôm nay" : `${range} ngày qua`;
  const goOrders = () => {
    onGo("viec");
    window.dispatchEvent(new CustomEvent("tyzo-open-pay", { detail: {} }));
  };

  return (
    <section className="admin-wide space-y-3" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Tổng quan</h2>
        <div className="flex gap-2" role="group" aria-label="Khoảng thời gian">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={range === item.id}
              className={"min-tap rounded-full px-3 text-sm " + (range === item.id ? "bg-accent font-semibold text-ink" : "border border-line")}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button type="button" className="min-tap rounded-full border border-line px-3 text-sm" disabled={loading} onClick={() => load(range)}>
            {loading ? "Đang tải…" : "Làm mới"}
          </button>
        </div>
      </div>

      {!view && <p className="text-sm text-muted">{loading ? "Đang đọc số liệu…" : "Chưa có số liệu."}</p>}

      {view && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {owner && view.revenue && (
              <Card title="Doanh thu (tiền nạp)" go="tien" onGo={onGo}>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <p>Hôm nay<br /><strong>{dong(view.revenue.today)}</strong></p>
                  <p>7 ngày<br /><strong>{dong(view.revenue.week)}</strong></p>
                  <p>Tháng này<br /><strong>{dong(view.revenue.month)}</strong></p>
                </div>
              </Card>
            )}
            <Card title={`Lượt chạy ${rangeText}`} go="viec" onGo={onGo}>
              <Big value={String(view.runs.total)} hint={`${view.runs.errors} lỗi · ${Math.round(view.runs.errorRate * 100)}%`} />
            </Card>
            {owner && view.quality && (
              <Card title={`Chất lượng cần chú ý ${rangeText}`} go="chat-luong" onGo={onGo}>
                <Big value={String(view.quality.attention)} hint={`${view.quality.red} lần thấp · trên ${view.quality.total} lần chạy`} />
              </Card>
            )}
            <article className="grid content-start gap-2 rounded-2xl border border-line bg-card p-4">
              <h3 className="text-sm font-semibold text-muted">Đơn nạp đang chờ xác nhận</h3>
              <Big value={String(view.orders.waiting)} hint={view.orders.claimed ? `${view.orders.claimed} khách báo đã chuyển` : undefined} />
              <button type="button" className="min-tap w-fit rounded-full border border-line px-3 text-sm" onClick={goOrders}>
                Xem chi tiết
              </button>
            </article>
          </div>

          <article className="grid gap-2 rounded-2xl border border-line bg-card p-4">
            <h3 className="text-sm font-semibold text-muted">Cảnh báo</h3>
            {view.alerts.length === 0 && <p className="text-sm text-muted">Chưa có cảnh báo.</p>}
            {view.alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-2 text-sm">
                <p className="flex min-w-0 items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: alert.level === "red" ? "#e15b64" : "#e0a100" }} />
                  <span>{alert.text}</span>
                </p>
                <button type="button" className="min-tap shrink-0 rounded-full border border-line px-3 text-sm" onClick={() => onGo(alert.go)}>
                  Xem
                </button>
              </div>
            ))}
            <p className="text-xs text-muted">App chưa ghi hạn dùng và giới hạn tốc độ của key phòng, nên chưa cảnh báo được hai việc đó.</p>
          </article>

          <div className="grid gap-3 sm:grid-cols-2">
            {owner && view.topSpend && (
              <article className="grid content-start gap-2 rounded-2xl border border-line bg-card p-4">
                <h3 className="text-sm font-semibold text-muted">Top 5 tiêu nhiều nhất ({rangeText})</h3>
                <TopList rows={view.topSpend} money empty="Chưa có lượt trừ tiền." />
              </article>
            )}
            <article className="grid content-start gap-2 rounded-2xl border border-line bg-card p-4">
              <h3 className="text-sm font-semibold text-muted">Top 5 lỗi nhiều nhất ({rangeText})</h3>
              <TopList rows={view.topErrors} money={false} empty="Chưa có phiếu lỗi." />
            </article>
          </div>
        </>
      )}
    </section>
  );
}
