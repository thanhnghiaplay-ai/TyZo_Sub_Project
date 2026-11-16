import { useEffect, useState } from "react";
import { askConfirm } from "@/lib/confirm";
import { buyGiayPack, getGiayShelf, type GiayPackView } from "@/lib/giay-room";
import { formatGiay } from "@/lib/token-math";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

/** Kệ mua gói giây. Giá tính lúc mở kệ. Gói đã mua không đổi số giây. */
export function GiayShelf({ reload, onBought }: { reload: number; onBought: (message: string) => void }) {
  const [units, setUnits] = useState<number | null>(null);
  const [packs, setPacks] = useState<GiayPackView[]>([]);
  const [priced, setPriced] = useState(true);
  const [busy, setBusy] = useState(false);

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
    <section className="grid gap-2" aria-label="Gói giây">
      <h2 className="text-sm font-semibold">Gói giây cho trả theo lượt</h2>
      <p className="text-sm text-muted">
        Còn {units == null ? "…" : formatGiay(units)}. Giá gói mới có thể đổi. Gói đã mua giữ nguyên số giây đến hết hạn. Hết hạn thì phần còn lại mất, không hoàn tiền.
      </p>
      {!priced && <p className="text-sm text-danger">Chưa có giá bản Turbo hoặc tỷ giá nên chưa bán gói.</p>}
      {packs.length === 0 && <p className="text-sm text-muted">Chủ chưa mở gói giây.</p>}
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
                title: "Mua gói giây?",
                text: `${formatGiay(pack.tokens)}, hạn ${pack.days} ngày, giá ${dong(price)}.\nGiá gói mới có thể đổi. Gói này giữ nguyên đến hết hạn. Hết hạn thì phần còn lại mất, không hoàn tiền.`,
                confirmLabel: "Mua gói",
              });
              if (!ok) return;
              setBusy(true);
              try {
                await buyGiayPack({ data: pack.id });
                onBought("Đã mua gói giây.");
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
