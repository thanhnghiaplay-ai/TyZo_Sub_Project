import { useEffect, useState } from "react";
import { askConfirm } from "@/lib/confirm";
import { getGiayShelf, orderGiayPack, type GiayPackView } from "@/lib/giay-room";
import { formatGiay } from "@/lib/token-math";
import { PaySlip } from "@/components/pay-slip";
import type { PayOrderView } from "@/lib/pay-store";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

/** Kệ mua gói Token dịch. Giá tính lúc mở kệ. Gói đã mua không đổi số Token dịch. */
export function GiayShelf({ reload, onBought }: { reload: number; onBought: (message: string) => void }) {
  const [units, setUnits] = useState<number | null>(null);
  const [packs, setPacks] = useState<GiayPackView[]>([]);
  const [priced, setPriced] = useState(true);
  const [busy, setBusy] = useState(false);
  const [slip, setSlip] = useState<PayOrderView | null>(null);

  useEffect(() => {
    let gone = false;
    void getGiayShelf()
      .then((shelf) => {
        if (gone) return;
        setUnits(shelf.units);
        setPacks(shelf.packs);
        setPriced(shelf.priced);
      })
      .catch(() => {
        if (!gone) setUnits(null);
      });
    return () => {
      gone = true;
    };
  }, [reload]);

  return (
    <section className="grid gap-2" aria-label="Token dịch" data-tour="giay">
      <h2 className="text-sm font-semibold">Token dịch</h2>
      <p className="text-sm text-muted">
        Dùng cho trả theo lượt, dịch trực tiếp và Orpheus. Còn {units == null ? "…" : formatGiay(units)}. Bấm mua thì hiện mã QR, chuyển khoản đúng số thì được Token dịch. Hết hạn thì phần còn lại mất, không hoàn tiền.
      </p>
      {slip && (
        <PaySlip
          order={slip}
          doneText="Đã cộng Token dịch."
          onDone={() => {
            setSlip(null);
            onBought("Đã cộng Token dịch.");
          }}
          onClose={() => setSlip(null)}
        />
      )}
      {!priced && <p className="text-sm text-danger">Chưa có giá bản Turbo hoặc tỷ giá nên chưa bán gói.</p>}
      {packs.length === 0 && <p className="text-sm text-muted">Chủ chưa mở gói Token dịch.</p>}
      {packs.map((pack) => (
        <button
          key={pack.id}
          type="button"
          disabled={busy || pack.price == null}
          className="flex min-tap w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-left disabled:opacity-40"
          onClick={() => {
            if (pack.price == null) return;
            const price = pack.price;
            void (async () => {
              const ok = await askConfirm({
                title: "Mua Token dịch?",
                text: `${formatGiay(pack.tokens)}, hạn ${pack.days} ngày, giá ${dong(price)}.\nSẽ hiện mã QR. Chuyển khoản đúng số thì được Token dịch. Hết hạn thì phần còn lại mất, không hoàn tiền.`,
                confirmLabel: "Tạo mã QR",
              });
              if (!ok) return;
              setBusy(true);
              try {
                const made = await orderGiayPack({ data: pack.id });
                setSlip(made);
              } catch (error) {
                onBought(error instanceof Error ? error.message : "Chưa mua được.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <span>
            <span className="block font-medium">{formatGiay(pack.tokens)}</span>
            <span className="mt-1 block text-xs text-muted">Hạn {pack.days} ngày</span>
          </span>
          <span className="shrink-0 text-lg font-semibold text-accent">{pack.price == null ? "Chưa có giá" : dong(pack.price)}</span>
        </button>
      ))}
    </section>
  );
}
