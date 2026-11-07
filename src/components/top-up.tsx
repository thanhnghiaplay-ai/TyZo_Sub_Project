import { useEffect, useState } from "react";
import { claimPayOrder, createPayOrder, getPayPublic, readPayOrder, syncCasso, type PayOrderView, type PayPublic } from "@/lib/pay-store";

const QUICK = [10_000, 50_000, 100_000, 200_000, 500_000];
const MIN = 10_000;
const MAX = 1_000_000;

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function TopUp({ onPaid, compact = false }: { onPaid: () => void; compact?: boolean }) {
  const [gates, setGates] = useState<PayPublic | null>(null);
  const [provider, setProvider] = useState<"sepay" | "casso">("sepay");
  const [amount, setAmount] = useState(50_000);
  const [draft, setDraft] = useState("50000");
  const [order, setOrder] = useState<PayOrderView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!compact);

  useEffect(() => {
    void getPayPublic()
      .then((next) => {
        setGates(next);
        if (next.sepay) setProvider("sepay");
        else if (next.casso) setProvider("casso");
      })
      .catch(() => setGates({ sepay: false, casso: false }));
  }, []);

  function setAmountSafe(value: number) {
    const next = Math.round(value);
    setAmount(next);
    setDraft(String(next || ""));
  }

  if (!gates) return <p className="text-sm text-muted">Đang xem cổng nạp…</p>;
  if (!gates.sepay && !gates.casso) {
    return (
      <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
        Nạp tiền đang bảo trì. Sẽ cập nhật sớm.
      </p>
    );
  }

  async function makeOrder() {
    const value = Math.round(Number(draft.replace(/\D/g, "") || 0));
    if (!Number.isFinite(value) || value < MIN || value > MAX) {
      setNotice(`Số tiền từ ${dong(MIN)} đến ${dong(MAX)}.`);
      return;
    }
    setAmount(value);
    setBusy(true);
    setNotice(null);
    try {
      setOrder(await createPayOrder({ data: { provider, amount: value } }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa tạo được đơn.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!order) return;
    setBusy(true);
    setNotice(null);
    try {
      if (order.provider === "casso") await syncCasso();
      await claimPayOrder({ data: order.id });
      const next = await readPayOrder({ data: order.id });
      if (next.status === "paid") {
        setNotice("Đã cộng tiền vào số dư.");
        setOrder(null);
        onPaid();
      } else setNotice("Chưa thấy tiền. Nếu vừa chuyển, đợi một lát rồi bấm lại.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa kiểm tra được.");
    } finally {
      setBusy(false);
    }
  }

  if (compact && !open) {
    return (
      <button
        type="button"
        className="min-tap rounded-full border border-line px-4 text-sm"
        onClick={() => setOpen(true)}
      >
        Nạp tiền
      </button>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Nạp tiền</h2>
        {compact && (
          <button type="button" className="text-sm text-muted underline" onClick={() => setOpen(false)}>
            Đóng
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {gates.sepay && (
          <button type="button" className={"min-tap rounded-full px-4 text-sm " + (provider === "sepay" ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setProvider("sepay")}>
            Sepay
          </button>
        )}
        {gates.casso && (
          <button type="button" className={"min-tap rounded-full px-4 text-sm " + (provider === "casso" ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setProvider("casso")}>
            Casso
          </button>
        )}
      </div>
      <p className="text-sm text-muted">Nhập số tiền từ {dong(MIN)} đến {dong(MAX)}. Có thể chọn nhanh bên dưới.</p>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((value) => (
          <button
            key={value}
            type="button"
            className={"min-tap rounded-full border px-3 text-sm " + (amount === value ? "border-accent text-accent" : "border-line")}
            onClick={() => setAmountSafe(value)}
          >
            {dong(value)}
          </button>
        ))}
      </div>
      <label className="grid gap-1 text-sm">
        Số tiền muốn nạp (đồng)
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(event) => {
            const raw = event.target.value.replace(/\D/g, "").slice(0, 7);
            setDraft(raw);
            setAmount(Number(raw || 0));
          }}
          className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
          placeholder={`${MIN} – ${MAX}`}
        />
      </label>
      <p className="text-xs text-muted">Sẽ nạp: {dong(Math.round(Number(draft.replace(/\D/g, "") || 0)))}</p>
      <button type="button" disabled={busy} className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40" onClick={() => void makeOrder()}>
        Tạo mã chuyển khoản
      </button>
      {order && (
        <div className="grid gap-2 text-sm">
          <img src={order.qr} alt="Mã QR chuyển khoản" className="mx-auto h-52 w-52 rounded-xl bg-white p-2" />
          <p>Ngân hàng: {order.bank}</p>
          <p>Số tài khoản: {order.account}</p>
          <p>Chủ tài khoản: {order.name || "Theo tài khoản ngân hàng"}</p>
          <p className="font-semibold text-accent">Số tiền: {dong(order.amount)}</p>
          <p className="font-semibold text-accent">Nội dung: {order.code}</p>
          <p className="text-muted">Ghi đúng nội dung. Sai nội dung sẽ không tự cộng.</p>
          <button type="button" disabled={busy} className="min-tap rounded-full border border-line disabled:opacity-40" onClick={() => void refresh()}>
            Tôi đã chuyển khoản
          </button>
        </div>
      )}
      {notice && <p className="text-sm text-muted">{notice}</p>}
    </section>
  );
}
