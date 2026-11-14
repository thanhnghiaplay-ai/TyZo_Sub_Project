import { useEffect, useMemo, useState } from "react";
import { getMoneyExtra, type MoneyExtra, type MoneyPoint } from "@/lib/admin-room";
import { categoryLabel, lineGeometry, pathOf } from "@/lib/money-extra";

type Span = "day" | "week" | "month" | "year";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

const BOX = { width: 640, height: 200, pad: 14 };

/** Biểu đồ đường thu và chi theo kỳ đang chọn. Vẽ bằng SVG, không thêm thư viện. */
function LineChart({ points }: { points: MoneyPoint[] }) {
  const sorted = useMemo(() => [...points].sort((a, b) => a.bucket.localeCompare(b.bucket)), [points]);
  const geo = useMemo(() => lineGeometry([sorted.map((p) => p.revenue), sorted.map((p) => p.cost)], BOX), [sorted]);
  if (sorted.length === 0) return <p className="text-sm text-muted">Chưa có số liệu để vẽ.</p>;
  const [revenueLine, costLine] = geo.lines;
  return (
    <figure className="grid gap-1">
      <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} className="w-full" role="img" aria-label="Đường thu và chi theo kỳ">
        <line x1={BOX.pad} x2={BOX.width - BOX.pad} y1={BOX.height - BOX.pad} y2={BOX.height - BOX.pad} stroke="currentColor" strokeOpacity="0.25" />
        <path d={pathOf(revenueLine)} fill="none" stroke="#3fb67a" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={pathOf(costLine)} fill="none" stroke="#e15b64" strokeWidth="2.5" strokeLinejoin="round" />
        {revenueLine.map((point, index) => (
          <circle key={"r" + sorted[index].bucket} cx={point.x} cy={point.y} r="3.5" fill="#3fb67a">
            <title>{`${sorted[index].bucket}: thu ${dong(sorted[index].revenue)}`}</title>
          </circle>
        ))}
        {costLine.map((point, index) => (
          <circle key={"c" + sorted[index].bucket} cx={point.x} cy={point.y} r="3.5" fill="#e15b64">
            <title>{`${sorted[index].bucket}: chi ${dong(sorted[index].cost)}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          <span style={{ color: "#3fb67a" }}>●</span> Thu (tiền nạp) · <span style={{ color: "#e15b64" }}>●</span> Chi (ghi tay)
        </span>
        <span>
          {sorted[0].bucket} → {sorted[sorted.length - 1].bucket} · mức cao nhất {dong(geo.max)}
        </span>
      </figcaption>
    </figure>
  );
}

function Stat({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <article className="rounded-xl border border-line px-2 py-2">
      <p className="text-xs text-muted">{title}</p>
      <p className="text-sm font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </article>
  );
}

/** Các số mới của trang Doanh thu: biểu đồ, ARPU, chuyển đổi, giá vốn mỗi phút, chi phí theo loại. Chỉ Chủ thấy. */
export function RevenueExtra({ span, points }: { span: Span; points: MoneyPoint[] }) {
  const [extra, setExtra] = useState<MoneyExtra | null>(null);
  const [fault, setFault] = useState("");

  useEffect(() => {
    let alive = true;
    setExtra(null);
    void getMoneyExtra({ data: span })
      .then((next) => {
        if (!alive) return;
        setExtra(next);
        setFault("");
      })
      .catch((error) => {
        if (alive) setFault(error instanceof Error && error.message ? error.message : "Chưa đọc được số liệu thêm.");
      });
    return () => {
      alive = false;
    };
  }, [span]);

  const costTotal = extra ? extra.categories.reduce((sum, row) => sum + row.amount, 0) : 0;
  const minutes = extra ? Math.round(extra.audioSeconds / 60) : 0;

  return (
    <div className="grid gap-3 rounded-xl border border-line p-3 text-sm">
      <p className="font-semibold">Biểu đồ thu và chi</p>
      <LineChart points={points} />
      {fault && <p className="text-danger">{fault}</p>}
      {!extra && !fault && <p className="text-muted">Đang tải số liệu thêm…</p>}
      {extra && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat title="ARPU (tiền nạp mỗi khách nạp)" value={extra.arpu === null ? "—" : dong(extra.arpu)} hint={`${extra.payers} khách đã nạp trong kỳ`} />
            <Stat
              title="Dùng thử → mua"
              value={extra.conversion === null ? "—" : `${Math.round(extra.conversion * 1000) / 10}%`}
              hint={`${extra.converted}/${extra.trialUsers} khách đã dùng thử, toàn thời gian`}
            />
            <Stat title="Giá vốn mỗi phút âm thanh" value={extra.costPerMinute === null ? "—" : dong(extra.costPerMinute)} hint={`${minutes} phút đã xử lý trong kỳ`} />
            <Stat title="Tính cả chi phí ghi tay" value={extra.allInPerMinute === null ? "—" : dong(extra.allInPerMinute)} hint="Giá vốn cộng khoản chi ghi tay, mỗi phút" />
          </div>
          <div className="grid gap-1">
            <p className="font-semibold">Chi phí ghi tay theo loại</p>
            {extra.categories.length === 0 && <p className="text-muted">Chưa có khoản chi trong kỳ.</p>}
            <ul className="grid gap-2">
              {extra.categories.map((row) => (
                <li key={row.category} className="grid gap-1">
                  <div className="flex justify-between gap-2">
                    <span>{categoryLabel(row.category)}</span>
                    <span className="font-medium">
                      {dong(row.amount)} · {costTotal ? Math.round((row.amount / costTotal) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-raised">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${costTotal ? (row.amount / costTotal) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted">
            ARPU chỉ tính khách có nạp tiền trong kỳ. Tỷ lệ dùng thử → mua tính trên mọi khách đã dùng hết lượt thử, vì phòng không ghi ngày dùng thử. Giá vốn mỗi phút lấy từ các lượt đã trừ tiền; lượt cũ chưa có giá vốn thật thì tính theo số ước tính. Tất cả là số tổng, không có tên tệp hay chữ phụ đề.
          </p>
        </>
      )}
    </div>
  );
}
