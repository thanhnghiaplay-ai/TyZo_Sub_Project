import { dong } from "@/lib/money-format";
import { useEffect, useState } from "react";
import { askConfirm } from "@/lib/confirm";
import { getGiayShelf, orderGiayPack, type GiayPackView } from "@/lib/giay-room";
import { formatGiay } from "@/lib/token-math";
import { PaySlip } from "@/components/pay-slip";
import type { PayOrderView } from "@/lib/pay-store";

/** Kệ mua gói Token dịch. Giá tính lúc mở kệ. Gói đã mua không đổi số Token dịch. */
export function GiayShelf({ reload, onBought }: { reload: number; onBought: (message: string) => void }) {
  const [packs, setPacks] = useState<GiayPackView[]>([]);
  const [priced, setPriced] = useState(true);
  const [busy, setBusy] = useState(false);
  const [slip, setSlip] = useState<PayOrderView | null>(null);

  useEffect(() => {
    let gone = false;
    void getGiayShelf()
      .then((shelf) => {
        if (gone) return;
        setPacks(shelf.packs);
        setPriced(shelf.priced);
      })
      .catch(() => {
        /* chưa đọc được kệ: để trống, lần mở sau thử lại */
      });
    return () => {
      gone = true;
    };
  }, [reload]);

  return (
    <section className="grid gap-2" aria-label="Token dịch" data-tour="giay">
      {/* Tiêu đề và số dư đã ở đầu khối «Token dịch · trả theo lượt» (account-panel.tsx); ở đây chỉ nói cách mua. */}
      <p className="text-sm text-muted">
        Bấm mua thì hiện mã QR, chuyển khoản đúng số thì được Token dịch. Hết hạn thì phần còn lại mất, không hoàn tiền.
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
      {packs.length === 0 && <p className="text-sm text-muted">Admin chưa mở gói Token dịch.</p>}
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
