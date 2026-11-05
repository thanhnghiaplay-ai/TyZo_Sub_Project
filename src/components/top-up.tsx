import { useEffect, useState } from "react";
import { createPayOrder, getPayPublic, readPayOrder, syncCasso, type PayOrderView, type PayPublic } from "@/lib/pay-store";

const AMOUNTS = [19_000, 59_000, 149_000];

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function TopUp({ onPaid }: { onPaid: () => void }) {
  const [gates, setGates] = useState<PayPublic | null>(null);
  const [provider, setProvider] = useState<"sepay" | "casso">("sepay");
  const [amount, setAmount] = useState(19_000);
  const [order, setOrder] = useState<PayOrderView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPayPublic()
      .then((next) => {
        setGates(next);
        if (next.sepay) setProvider("sepay");
        else if (next.casso) setProvider("casso");
      })
      .catch(() => setGates({ sepay: false, casso: false }));
  }, []);

  if (!gates) return <p className="text-sm text-muted">Đang xem cổng nạp…</p>;
  if (!gates.sepay && !gates.casso) {
    return (
      <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
        Nạp tiền đang bảo trì. Sẽ cập nhật sớm.
      </p>
    );
  }

  async function makeOrder() {
    setBusy(true);
    setNotice(null);
    try {
      setOrder(await createPayOrder({ data: { provider, amount } }));
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

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-semibold">Nạp tiền</h2>
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
      <div className="grid grid-cols-3 gap-2">
        {AMOUNTS.map((value) => (
          <button key={value} type="button" className={"min-tap rounded-2xl border text-sm " + (amount === value ? "border-accent text-accent" : "border-line")} onClick={() => setAmount(value)}>
            {dong(value)}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={10000}
        max={5000000}
        value={amount}
        onChange={(event) => setAmount(Number(event.target.value))}
        className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
      />
      <button type="button" disabled={busy} className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40" onClick={() => void makeOrder()}>
        Tạo mã chuyển khoản
      </button>
      {order && (
        <div className="grid gap-2 text-sm">
          <img src={order.qr} alt="Mã QR chuyển khoản" className="mx-auto w-52 rounded-xl bg-white p-2" />
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
