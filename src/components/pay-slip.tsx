import { dong } from "@/lib/payment/money-format";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PayEnding } from "@/components/pay-ending";
import { Icon } from "@/components/ui/icon";
import { cancelMyPayOrder, claimPayOrder, readPayOrder, syncCasso, type PayOrderView } from "@/lib/payment/pay-store";
import { PAY_MINUTES } from "@/lib/payment/pay-minutes";

function clock(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-[var(--radius-ctl)] border border-line bg-bg/40 px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted">{label}</span>
        <span className="block break-words text-sm font-semibold text-accent">{value}</span>
      </span>
      <button
        type="button"
        className="inline-flex min-tap shrink-0 items-center gap-1 rounded-full border border-line px-3 text-xs"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1400);
          }).catch(() => setDone(false));
        }}
      >
        {done ? <Icon slot="st.ok" className="size-3.5" /> : <Icon slot="act.copy" className="size-3.5" />}
        {done ? "Đã chép" : "Sao chép"}
      </button>
    </div>
  );
}

/** Mã QR của một đơn mua đúng giá, nổi giữa màn hình. Tiền về thì giao món, không cộng số dư. */
export function PaySlip({ order, doneText, onDone, onClose }: { order: PayOrderView; doneText: string; onDone: () => void; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ending, setEnding] = useState<null | "thanks" | "sorry">(null);
  const left = Math.max(0, Math.ceil((new Date(order.createdAt).getTime() + PAY_MINUTES * 60 * 1000 - now) / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!ending && left <= 0) setEnding("sorry");
  }, [ending, left]);

  useEffect(() => {
    if (ending || left <= 0) return;
    let stop = false;
    async function look() {
      try {
        const next = await readPayOrder({ data: order.id });
        if (stop) return;
        if (next.status === "paid") setEnding("thanks");
        else if (next.status === "expired" || next.status === "cancelled" || next.status === "void") setEnding("sorry");
      } catch {
        /* lần sau hỏi lại */
      }
    }
    void look();
    const timer = window.setInterval(() => void look(), 5000);
    const casso = order.provider === "casso" ? window.setInterval(() => void syncCasso().catch(() => undefined), 15000) : 0;
    return () => {
      stop = true;
      window.clearInterval(timer);
      if (casso) window.clearInterval(casso);
    };
  }, [ending, left, order.id, order.provider]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && ending) {
        event.preventDefault();
        if (ending === "thanks") onDone();
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ending, onDone, onClose]);

  const sheet = (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-slip-title"
        className={"pay-sheet pay-rise relative grid w-full max-w-md max-h-[min(40rem,90dvh)] gap-3 overflow-y-auto rounded-[var(--radius-card)] border border-accent/40 bg-card p-4 shadow-xl " + (ending ? "min-h-72" : "")}
      >
        <div className={ending ? "pay-bye pointer-events-none grid gap-3" : "grid gap-3"}>
          <div className="flex items-center justify-between gap-2">
            <p id="pay-slip-title" className="text-sm font-semibold">Chuyển khoản đúng số tiền</p>
            <p className="text-xs font-semibold tabular-nums text-warning">Còn {clock(left)}</p>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-[width] duration-1000" style={{ width: `${Math.min(100, (left / (PAY_MINUTES * 60)) * 100)}%` }} />
          </div>
          <img src={order.qr} alt="Mã QR chuyển khoản" className="pay-ring mx-auto h-auto w-56 max-w-full rounded-[var(--radius-card)] bg-white p-2" />
          <p className="text-center text-xs text-muted">{order.qrLive ? "Mở ứng dụng ngân hàng và quét mã." : "Chuyển theo số tài khoản và nội dung bên dưới."}</p>
          <CopyLine label="Ngân hàng" value={order.bank || "Theo ứng dụng ngân hàng"} />
          <CopyLine label="Số tài khoản" value={order.account} />
          <CopyLine label="Số tiền" value={dong(order.amount)} />
          <CopyLine label="Nội dung chuyển khoản" value={order.code} />
          {notice && <p className="text-sm text-danger">{notice}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              className="min-tap rounded-full border border-line px-3 text-sm disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                void (async () => {
                  try {
                    if (order.provider === "casso") await syncCasso().catch(() => undefined);
                    await claimPayOrder({ data: order.id });
                    const next = await readPayOrder({ data: order.id });
                    if (next.status === "paid") setEnding("thanks");
                    else setNotice("Đã ghi nhận. Trang vẫn tự kiểm tra.");
                  } catch (error) {
                    setNotice(error instanceof Error ? error.message : "Chưa kiểm tra được.");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Tôi đã chuyển khoản
            </button>
            <button
              type="button"
              disabled={busy}
              className="min-tap rounded-full border border-line px-3 text-sm text-danger disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                void cancelMyPayOrder({ data: order.id })
                  .then(() => setEnding("sorry"))
                  .catch((error: Error) => setNotice(error.message || "Chưa hủy được."))
                  .finally(() => setBusy(false));
              }}
            >
              Hủy đơn
            </button>
          </div>
          <p className="pay-stay">
            <span className="pay-spin" aria-hidden="true" />
            Vui lòng không rời đi hoặc tải lại trang
          </p>
        </div>
        {ending && (
          <div className="pay-thanks absolute inset-0 grid place-items-center bg-card px-6 text-center">
            <PayEnding
              kind={ending}
              text={ending === "thanks" ? doneText : "Đơn đã đóng. Hãy tạo mã mới nếu vẫn muốn mua."}
              actionLabel={ending === "thanks" ? "Xong" : "Đóng"}
              onAction={ending === "thanks" ? onDone : onClose}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}