import { useEffect, useState } from "react";
import { getModalPrice, saveModalPrice } from "@/lib/tyzo-modal-settings";
import { HOLD_RATIO, MODAL_PRICE_DEFAULT } from "@/lib/sub/tyzo-modal-price";

const INPUT = "min-tap w-full min-w-0 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 text-sm";

export function TyzoModalPriceBoard() {
  const [gpu, setGpu] = useState(String(MODAL_PRICE_DEFAULT.gpuUsdPerHour));
  const [overhead, setOverhead] = useState(String(MODAL_PRICE_DEFAULT.overhead));
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    getModalPrice()
      .then((price) => {
        if (!active) return;
        if (price) {
          setGpu(String(price.gpuUsdPerHour));
          setOverhead(String(price.overhead));
          setSaved(true);
        }
        setReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : String(error));
        setReady(true);
      });
    return () => { active = false; };
  }, []);
  const g = Number(gpu), k = Number(overhead);
  const perHour = Number.isFinite(g) && Number.isFinite(k) ? g * k : 0;
  return (
    <section className="admin-card grid content-start gap-2">
      <h3 className="text-sm font-semibold">Giá TyZo Modal</h3>
      <p className="text-sm text-muted">
        Tính theo chi phí GPU thật: giây máy nhận dạng xử lý × giá GPU × hệ số bù, cộng phí Alibaba nếu có. Quy ra Token dịch như các nhà khác, nên lời
        nằm ở giá Token dịch (giá 1 giây Turbo + % chênh lệch). Hệ số bù gồm bật máy, máy chạy không, CPU, RAM và máy mô hình chữ: đối chiếu hóa đơn Modal rồi chỉnh.
        Chỉ dùng ở cửa Trả theo lượt. Đổi giá chỉ áp dụng cho lượt mở sau.
      </p>
      <p className="text-sm">{!ready ? "Đang đọc…" : saved ? "Đã lưu giá. Khách dùng được TyZo khi gói có TyZo." : "Chưa lưu giá: khách chưa dùng được TyZo."}</p>
      <form
        className="grid gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setReady(false);
          try {
            await saveModalPrice({ data: { gpuUsdPerHour: g, overhead: k } });
            setSaved(true);
            setMessage("Đã lưu giá TyZo Modal.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
          } finally {
            setReady(true);
          }
        }}
      >
        <fieldset disabled={!ready} className="grid gap-2">
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Giá GPU máy nhận dạng (USD mỗi giờ, Modal L4 là 0,80)
            <input className={INPUT} required type="number" min="0.01" max="50" step="any" inputMode="decimal" value={gpu} onChange={(e) => setGpu(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Hệ số bù (1 đến 20, mặc định 3)
            <input className={INPUT} required type="number" min="1" max="20" step="any" inputMode="decimal" value={overhead} onChange={(e) => setOverhead(e.target.value)} />
          </label>
          <p className="text-xs text-muted">
            Một giờ GPU tính {perHour.toFixed(2)} USD. Giữ Token trước khi chạy theo {HOLD_RATIO.nhanh * 100}% (Nhanh) và {HOLD_RATIO.ky * 100}% (Kỹ) thời lượng phim,
            trừ theo số thật, trả lại phần giữ thừa.
          </p>
          <button type="submit" className="min-tap rounded-[var(--radius-ctl)] bg-accent px-3 text-sm font-semibold text-ink">
            Lưu giá
          </button>
        </fieldset>
      </form>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
    </section>
  );
}
