import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { claimPayOrder, cancelMyPayOrder, createPayOrder, getPayDesk, getPayPublic, readPayOrder, syncCasso, type PayHistoryItem, type PayOrderView, type PayPublic } from "@/lib/pay-store";
import { PAY_MINUTES } from "@/lib/pay-match";
import { pushToast } from "@/components/toast";
import { BrandMark } from "@/components/brand-mark";
import { formatMoney, parseMoney } from "@/lib/money-format";

const QUICK = [10_000, 50_000, 100_000, 200_000, 500_000];
const MIN = 10_000;
const MAX = 1_000_000;
const WINDOW = PAY_MINUTES * 60 * 1000;

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function clock(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function chip(status: string) {
  if (status === "paid") return { label: "Đã cộng", className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" };
  if (status === "expired") return { label: "Hết hạn", className: "border-red-400/40 bg-red-400/10 text-red-200" };
  if (status === "cancelled") return { label: "Đã từ chối", className: "border-red-400/40 bg-red-400/10 text-red-200" };
  if (status === "void") return { label: "Đã hủy", className: "border-red-400/40 bg-red-400/10 text-red-200" };
  return { label: "Đang chờ", className: "border-amber-300/40 bg-amber-300/10 text-amber-100" };
}

function CopyLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-line bg-bg/40 px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted">{label}</span>
        <span className={"block break-words " + (strong ? "text-base font-semibold tracking-wide text-accent" : "text-sm font-medium")}>{value}</span>
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
        {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {done ? "Đã chép" : "Sao chép"}
      </button>
    </div>
  );
}

function History({ rows }: { rows: PayHistoryItem[] }) {
  if (!rows.length) return null;
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Lịch sử nạp</p>
      <ul className="grid gap-1.5">
        {rows.map((row) => {
          const tone = chip(row.status);
          return (
            <li key={row.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-raised/60 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{dong(row.amount)} · {row.code}</span>
                <span className="block text-xs text-muted">{new Date(row.createdAt).toLocaleString("vi-VN")}</span>
              </span>
              <span className={"shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold " + tone.className}>{tone.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TopUp({ onPaid, compact = false }: { onPaid: () => void; compact?: boolean }) {
  const [gates, setGates] = useState<PayPublic | null>(null);
  const [provider, setProvider] = useState<"sepay" | "casso">("sepay");
  const [amount, setAmount] = useState(50_000);
  const [draft, setDraft] = useState(formatMoney(50000));
  const [order, setOrder] = useState<PayOrderView | null>(null);
  const [history, setHistory] = useState<PayHistoryItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!compact);
  const [told, setTold] = useState(false);
  const [paid, setPaid] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  function remember(desk: { live: PayOrderView | null; history: PayHistoryItem[] }) {
    setHistory(desk.history);
    if (desk.live) setOrder(desk.live);
  }

  useEffect(() => {
    void getPayPublic()
      .then((next) => {
        setGates(next);
        if (next.sepay) setProvider("sepay");
        else if (next.casso) setProvider("casso");
      })
      .catch(() => setGates({ sepay: false, casso: false }));
    void getPayDesk().then(remember).catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const left = order ? Math.max(0, Math.ceil((new Date(order.createdAt).getTime() + WINDOW - now) / 1000)) : 0;
  const waiting = Boolean(order && !paid && order.status !== "expired" && order.status !== "cancelled" && left > 0);

  useEffect(() => {
    if (!waiting || !order) return;
    let stop = false;
    async function look() {
      if (!order) return;
      try {
        const next = await readPayOrder({ data: order.id });
        if (stop) return;
        if (next.status === "paid") {
          setPaid(true);
          pushToast("Đã cộng tiền vào số dư.");
          return;
        }
        if (next.status === "expired" || next.status === "cancelled") setOrder({ ...order, status: next.status });
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
  }, [waiting, order]);

  const paidNotice = useRef(onPaid);
  paidNotice.current = onPaid;

  useEffect(() => {
    if (!paid) return;
    const timer = window.setTimeout(() => {
      setPaid(false);
      setOrder(null);
      setOpen(false);
      setTold(false);
      paidNotice.current();
      void getPayDesk().then(remember).catch(() => undefined);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [paid]);

  function setAmountSafe(value: number) {
    const next = Math.round(value);
    setAmount(next);
    setDraft(formatMoney(next));
  }

  async function makeOrder() {
    const value = Math.round(parseMoney(draft));
    if (!Number.isFinite(value) || value < MIN || value > MAX) {
      setNotice(`Số tiền từ ${dong(MIN)} đến ${dong(MAX)}.`);
      return;
    }
    setAmount(value);
    setBusy(true);
    setNotice(null);
    setPaid(false);
    setTold(false);
    try {
      setOrder(await createPayOrder({ data: { provider, amount: value } }));
      const desk = await getPayDesk();
      setHistory(desk.history);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa tạo được đơn.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!order || told) {
      if (!order) return;
      const next = await readPayOrder({ data: order.id });
      if (next.status === "paid") setPaid(true);
      else setNotice("Chưa thấy tiền. Trang vẫn tự kiểm tra.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (order.provider === "casso") await syncCasso().catch(() => undefined);
      await claimPayOrder({ data: order.id });
      setTold(true);
      const next = await readPayOrder({ data: order.id });
      if (next.status === "paid") setPaid(true);
      else setNotice("Đã ghi nhận. Tiền sẽ tự cộng khi ngân hàng báo về.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa kiểm tra được.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    if (!order) return;
    setBusy(true);
    setNotice(null);
    try {
      await cancelMyPayOrder({ data: order.id });
      setOrder(null);
      setAskCancel(false);
      setTold(false);
      pushToast("Đã hủy đơn nạp.");
      const desk = await getPayDesk();
      setHistory(desk.history);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa hủy được đơn.");
    } finally {
      setBusy(false);
    }
  }

  if (!gates) return <p className="text-sm text-muted">Đang xem cổng nạp…</p>;
  if (!gates.sepay && !gates.casso) {
    return (
      <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
        Nạp tiền đang bảo trì. Sẽ cập nhật sớm.
      </p>
    );
  }

  const sheet = order && !paid && (
    <div className="pay-rise grid gap-3 rounded-2xl border border-accent/30 bg-gradient-to-b from-accent/10 to-transparent p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Chuyển khoản</p>
        <p className={"rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums " + (left > 0 && order.status !== "expired" && order.status !== "cancelled" ? chip("pending").className : chip(order.status === "cancelled" ? "cancelled" : "expired").className)}>
          {left > 0 && order.status !== "expired" && order.status !== "cancelled" ? `Còn ${clock(left)}` : chip(order.status === "cancelled" ? "cancelled" : "expired").label}
        </p>
      </div>
      {left > 0 && order.status !== "expired" && order.status !== "cancelled" ? (
        <>
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-[width] duration-1000" style={{ width: `${Math.min(100, (left / (PAY_MINUTES * 60)) * 100)}%` }} />
          </div>
          <img src={order.qr} alt="Mã QR chuyển khoản" className="pay-ring mx-auto h-auto w-52 max-w-full rounded-2xl bg-white p-2" />
          <p className="text-center text-xs text-muted">
            {order.qrLive ? "Mở ứng dụng ngân hàng và quét mã." : "Ngân hàng này chưa lập được mã quét. Chuyển theo số bên dưới."}
          </p>
          <CopyLine label="Ngân hàng" value={order.bank || "Theo ứng dụng ngân hàng"} />
          <CopyLine label="Số tài khoản" value={order.account} />
          <CopyLine label="Chủ tài khoản" value={order.name || "Theo tài khoản ngân hàng"} />
          <CopyLine label="Số tiền" value={dong(order.amount)} strong />
          <CopyLine label="Nội dung chuyển khoản" value={order.code} strong />
          <p className="text-xs leading-relaxed text-muted">
            {order.provider === "sepay"
              ? "Thường cộng sau 10–30 giây nếu nội dung chuyển khoản đúng mã."
              : "Cổng này có thể chậm hơn một chút. Trang vẫn tự kiểm tra."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} className="min-tap rounded-full border border-line text-sm disabled:opacity-40" onClick={() => void refresh()}>
              {told ? "Đang chờ ngân hàng" : "Tôi đã chuyển khoản"}
            </button>
            <button type="button" disabled={busy} className="min-tap rounded-full border border-red-400/40 text-sm text-red-200 disabled:opacity-40" onClick={() => setAskCancel(true)}>
              Hủy đơn
            </button>
          </div>
          {askCancel && (
            <div className="grid gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm">
              <p>Hủy đơn này? Nếu đã chuyển khoản, tiền sẽ không tự cộng.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="min-tap rounded-full border border-line" onClick={() => setAskCancel(false)}>
                  Giữ đơn
                </button>
                <button type="button" disabled={busy} className="min-tap rounded-full bg-red-400/80 font-semibold text-ink disabled:opacity-40" onClick={() => void cancelOrder()}>
                  Hủy đơn
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-red-200">{order.status === "cancelled" ? "Đơn đã bị từ chối. Không cộng tiền." : "Hết 15 phút. Đơn đã đóng. Hãy tạo mã mới nếu vẫn muốn nạp."}</p>
      )}
    </div>
  );

  const success = paid && (
    <div className="pay-thanks absolute inset-0 grid place-items-center gap-3 px-4 text-center">
      <BrandMark title="TyZo Sub" />
      <p className="text-lg font-semibold text-fg">Xin cảm ơn</p>
      <p className="text-sm text-muted">Đã cộng tiền vào số dư</p>
    </div>
  );

  if (compact && !open && !paid) {
    return (
      <div className="grid min-w-0 max-w-full gap-3">
        <button type="button" className="min-tap w-fit rounded-full border border-accent/50 bg-accent/10 px-4 text-sm font-medium" onClick={() => setOpen(true)}>
          Nạp tiền
        </button>
        <History rows={history} />
      </div>
    );
  }

  return (
    <section className={"relative min-w-0 max-w-full overflow-hidden rounded-2xl border border-line bg-card p-4 " + (paid ? "min-h-72" : "")}>
      <div className={"space-y-3 " + (paid ? "pay-bye pointer-events-none" : "")}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Nạp tiền</h2>
          {compact && !paid && (
            <button type="button" className="text-sm text-muted underline" onClick={() => setOpen(false)}>
              Đóng
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {gates.sepay && (
            <button type="button" className={"min-tap rounded-full px-4 text-sm " + (provider === "sepay" ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setProvider("sepay")}>
              {gates.casso ? "Sepay" : "Chuyển khoản"}
            </button>
          )}
          {gates.casso && (
            <button type="button" className={"min-tap rounded-full px-4 text-sm " + (provider === "casso" ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setProvider("casso")}>
              {gates.sepay ? "Casso" : "Chuyển khoản"}
            </button>
          )}
        </div>
        <p className="text-sm text-muted">Từ {dong(MIN)} đến {dong(MAX)}. Mã có hiệu lực {PAY_MINUTES} phút.</p>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((value) => (
            <button
              key={value}
              type="button"
              className={"min-tap rounded-full border px-3 text-sm " + (amount === value ? "border-accent bg-accent/15 text-accent" : "border-line")}
              onClick={() => setAmountSafe(value)}
            >
              {dong(value)}
            </button>
          ))}
        </div>
        <label className="grid gap-1 text-sm">
          Số tiền muốn nạp
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(event) => {
              const raw = event.target.value.replace(/[^\d.]/g, "");
              const num = parseMoney(raw);
              setDraft(formatMoney(num) || "");
              setAmount(num);
            }}
            className="w-full min-w-0 rounded-xl border border-line bg-raised px-3 py-3 outline-none"
            placeholder={`${MIN} – ${MAX}`}
          />
        </label>
        <button type="button" disabled={busy} className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40" onClick={() => void makeOrder()}>
          Tạo mã chuyển khoản
        </button>
        {sheet}
        {notice && <p className="text-sm text-muted">{notice}</p>}
        <History rows={history} />
      </div>
      {success}
    </section>
  );
}
