import { useEffect, useState } from "react";
import { dong } from "@/lib/payment/money-format";
import { getProfitView, type ProfitView } from "@/lib/profit-room";
import { PROVIDERS, isProviderId } from "@/lib/sub/provider";

const nf = new Intl.NumberFormat("vi-VN");
const usd = (n: number) => `${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)} USD`;
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + dong(Math.abs(n));
/** Khoản chi: 0 thì không có dấu trừ (tránh «−0 đ»). */
const minus = (n: number) => (n > 0 ? "−" : "") + dong(n);
function houseName(id: string) {
  return isProviderId(id) ? PROVIDERS[id].label : id === "khac" ? "Khác" : id;
}

const TONE = {
  loi: { box: "border-accent", text: "text-accent", title: "ĐANG LỜI" },
  lo: { box: "border-danger", text: "text-danger", title: "ĐANG LỖ" },
  "lo-neu-dung-het": { box: "border-warning", text: "text-warning", title: "ĐANG LỜI, NHƯNG CÓ THỂ LỖ" },
} as const;

/**
 * Lời hay lỗ nhìn một lần (v5.32.0): tiền vào − tiền phải trả từng nhà − hoa hồng − chi phí ghi tay,
 * cộng cảnh báo khi Token khách đã mua mà chưa dùng có thể làm lỗ. Bảng từng nhà để đối chiếu hóa đơn.
 */
export function ProfitVerdict({ span }: { span: "day" | "week" | "month" | "year" }) {
  const [view, setView] = useState<ProfitView | null>(null);
  const [fault, setFault] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    setFault("");
    void getProfitView({ data: span })
      .then((next) => {
        if (!gone) setView(next);
      })
      .catch((error) => {
        if (!gone) setFault(error instanceof Error ? error.message : "Chưa đọc được lời lỗ.");
      });
    return () => {
      gone = true;
    };
  }, [span]);

  if (fault) return <p className="text-sm text-danger">{fault}</p>;
  if (!view) return <p className="text-sm text-muted">Đang tính lời lỗ…</p>;
  const tone = TONE[view.verdict.state];
  return (
    <section className={"grid gap-3 rounded-[var(--radius-card)] border-2 bg-card p-4 " + tone.box} data-profit-verdict={view.verdict.state}>
      <div>
        <p className={"text-sm font-bold tracking-wide " + tone.text}>{view.verdict.now === 0 && view.verdict.state === "loi" ? "HÒA VỐN" : tone.title}</p>
        <p className={"text-3xl font-bold tabular-nums " + tone.text}>{signed(view.verdict.now)}</p>
        {view.verdict.state === "lo-neu-dung-het" && (
          <p className="mt-1 text-sm">
            Nếu khách dùng hết {nf.format(view.owedTokens)} Token dịch còn hạn, kỳ này thành <strong className="text-danger">{signed(view.verdict.worst)}</strong>.
          </p>
        )}
      </div>

      {view.spend.pending>0 && <p role="status" className="text-sm text-warning">Có {nf.format(view.spend.pending)} khoản chi phí chờ ghi tổng hợp; đã tính trong số phải trả bên dưới.</p>}
      <ul className="grid gap-1 text-sm">
        <li className="flex justify-between gap-2"><span>Tiền vào (chuyển khoản đã xác nhận)</span><span className="shrink-0 whitespace-nowrap font-semibold tabular-nums">{dong(view.revenue)}</span></li>
        <li className="flex justify-between gap-2"><span>Phải trả các nhà cung cấp ({usd(view.spend.total.usd)})</span><span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-danger">{minus(view.providers)}</span></li>
        <li className="flex justify-between gap-2"><span>Hoa hồng cộng tác viên</span><span className="shrink-0 whitespace-nowrap tabular-nums text-danger">{minus(view.commission)}</span></li>
        <li className="flex justify-between gap-2"><span>Chi phí ghi tay</span><span className="shrink-0 whitespace-nowrap tabular-nums text-danger">{minus(view.manual)}</span></li>
        <li className="flex justify-between gap-2 border-t border-line pt-1 font-semibold"><span>Lời / lỗ</span><span className={"shrink-0 whitespace-nowrap tabular-nums " + tone.text}>{signed(view.verdict.now)}</span></li>
      </ul>

      <div className="grid gap-1 text-sm">
        <p>
          Token khách đã mua còn hạn, chưa dùng: <strong>{nf.format(view.owedTokens)}</strong> (giá gốc nếu dùng hết khoảng {dong(view.owedVnd)}).
        </p>
        {view.expiredTokens > 0 && <p>Token hết hạn chưa dùng trong kỳ: {nf.format(view.expiredTokens)} (đã thu tiền, không tốn).</p>}
      </div>

      <div className="grid gap-2" data-profit-providers>
        <p className="text-sm font-semibold">Phải trả từng nhà (để đối chiếu hóa đơn)</p>
        {view.spend.providers.length === 0 && <p className="text-sm text-muted">Chưa có lần gọi nào bằng key của phòng trong kỳ.</p>}
        <ul className="grid gap-1">
          {view.spend.providers.map((house) => (
            <li key={house.provider} className="rounded-[var(--radius-ctl)] border border-line px-3 py-2 text-sm">
              <button type="button" className="flex w-full items-center justify-between gap-2 text-left" aria-expanded={open === house.provider} onClick={() => setOpen(open === house.provider ? null : house.provider)}>
                <span className="font-medium">{houseName(house.provider)}</span>
                <span className="tabular-nums">
                  <strong>{usd(house.usd)}</strong> <span className="text-muted">· {dong(house.vnd)} · {nf.format(house.calls)} lần</span>
                </span>
              </button>
              {open === house.provider && (
                <ul className="mt-2 grid gap-1 border-t border-line pt-2 text-xs">
                  {house.models.map((row) => (
                    <li key={row.model} className="flex justify-between gap-2">
                      <span className="min-w-0 break-all">{row.model}</span>
                      <span className="shrink-0 tabular-nums">{usd(row.usd)} · {nf.format(row.calls)} lần</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">
          Số USD theo giá niêm yết lúc gọi, chưa gồm thuế, giảm giá hay chênh tỷ giá ngân hàng; nhà nào lệch nhiều so với hóa đơn thì xem lại giá ở Cấu hình → Giá.
          {view.spend.since ? ` Sổ từng nhà bắt đầu từ ${view.spend.since}.` : " Sổ từng nhà bắt đầu từ bản này."}
          {view.providersEstimated > 0 ? ` Phần trước đó (${dong(view.providersEstimated)}) ước theo Token đã trừ.` : ""}
          {" "}Thuê phòng và dùng thử dùng key của khách, không tính ở đây.
        </p>
      </div>
    </section>
  );
}
