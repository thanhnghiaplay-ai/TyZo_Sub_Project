import { dong } from "@/lib/money-format";
import { useEffect, useState } from "react";
import { getGiayDesk, saveGiayDesk } from "@/lib/giay-room";
import { pushToast } from "@/components/toast";
import type { GiayPack } from "@/lib/token-desk";

/** Chủ đặt số Token dịch, số ngày, phần trăm chênh và hệ số đệm. Giá bán tính từ giá Turbo. */
export function GiayPackBoard() {
  const [markup, setMarkup] = useState("50");
  const [buffer, setBuffer] = useState("1.2");
  const [packs, setPacks] = useState<GiayPack[]>([]);
  const [prices, setPrices] = useState<(number | null)[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    void getGiayDesk()
      .then((view) => {
        setMarkup(String(view.desk.markup));
        setBuffer(String(view.desk.buffer));
        setPacks(view.desk.packs);
        setPrices(view.packs.map((pack) => pack.price));
        setReady(true);
      })
      .catch((error: Error) => pushToast(error.message || "Chưa đọc được gói Token dịch.", "bad"));
  }

  useEffect(load, []);

  function setPack(index: number, patch: Partial<GiayPack>) {
    setPacks((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <section className="grid gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3">
      <h2 className="font-semibold">Token dịch</h2>
      <p className="text-sm text-muted">Giá bán = số Token dịch × giá gốc Turbo × (1 + phần trăm) × hệ số đệm. Thiếu giá Turbo hoặc tỷ giá thì không bán. Gói đã bán không đổi số Token dịch.</p>
      {!ready ? (
        <p className="text-sm text-muted">Đang đọc…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <label className="grid gap-1 text-sm">
              Phần trăm chênh
              <input value={markup} onChange={(event) => setMarkup(event.target.value)} inputMode="numeric" className="w-28 rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" />
            </label>
            <label className="grid gap-1 text-sm">
              Hệ số đệm
              <input value={buffer} onChange={(event) => setBuffer(event.target.value)} inputMode="decimal" className="w-28 rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" />
            </label>
          </div>
          {packs.map((pack, index) => (
            <div key={pack.id} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line p-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <label className="grid gap-1 text-sm">
                Số Token dịch
                <input value={pack.tokens} onChange={(event) => setPack(index, { tokens: Number(event.target.value) })} inputMode="numeric" className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" />
              </label>
              <label className="grid gap-1 text-sm">
                Số ngày
                <input value={pack.days} onChange={(event) => setPack(index, { days: Number(event.target.value) })} inputMode="numeric" className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" />
              </label>
              <p className="pb-2 text-sm text-muted">{prices[index] == null ? "Chưa có giá" : dong(prices[index] as number)}</p>
              <button type="button" className="min-tap rounded-full border border-line px-3 text-sm" onClick={() => setPacks((rows) => rows.filter((_, i) => i !== index))}>
                Bỏ
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-tap rounded-full border border-line px-4 text-sm"
              onClick={() => setPacks((rows) => [...rows, { id: "g" + Math.random().toString(36).slice(2, 8), tokens: 3600, days: 30 }])}
            >
              Thêm gói Token
            </button>
            <button
              type="button"
              disabled={busy}
              className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                void saveGiayDesk({ data: { markup: Number(markup), buffer: Number(buffer), packs } })
                  .then(() => {
                    pushToast("Đã lưu gói Token dịch.");
                    load();
                  })
                  .catch((error: Error) => pushToast(error.message || "Chưa lưu được.", "bad"))
                  .finally(() => setBusy(false));
              }}
            >
              Lưu các gói Token
            </button>
          </div>
        </>
      )}
    </section>
  );
}
