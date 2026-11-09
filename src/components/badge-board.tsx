import { useState } from "react";
import { BADGE_STYLES, type BadgeStyleId } from "@/lib/badge-styles";
import { AccountCard } from "@/components/role-mark";

export function BadgeBoard({
  current,
  busy,
  onPick,
}: {
  current: BadgeStyleId;
  busy: boolean;
  onPick: (id: BadgeStyleId) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentName = BADGE_STYLES.find((item) => item.id === current)?.name ?? "Ruy băng";
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Thẻ quyền</h2>
        <button type="button" className="min-tap rounded-full border border-line px-3 text-sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Thu gọn" : "Hiện kiểu"}
        </button>
      </div>
      <p className="text-sm text-muted">Đang dùng: {currentName}. Màu thẻ theo cấp. Ô xem thử hiện hai thẻ.</p>
      {open && (
        <div className="grid grid-cols-2 gap-2">
          {BADGE_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(item.id)}
              className={"rounded-2xl border p-2 text-left disabled:opacity-40 " + (current === item.id ? "border-accent" : "border-line")}
            >
              <AccountCard rank="chu" extra={["ctv"]} styleId={item.id} className="pointer-events-none">
                <p className="font-semibold">Nghĩa</p>
                <p className="mt-2 text-xs text-muted">Số dư</p>
                <p className="font-semibold text-accent">12.000 đ</p>
              </AccountCard>
              <p className="mt-2 text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted">{current === item.id ? "Đang dùng" : "Bấm để dùng"}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}