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
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Thẻ quyền</h2>
      <p className="text-sm text-muted">Chọn một kiểu. Ô tài khoản của mọi người sẽ hiện đúng kiểu này.</p>
      <div className="grid grid-cols-2 gap-2">
        {BADGE_STYLES.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(item.id)}
            className={"rounded-2xl border p-2 text-left disabled:opacity-40 " + (current === item.id ? "border-accent" : "border-line")}
          >
            <AccountCard rank="chu" styleId={item.id} className="pointer-events-none min-h-[9rem]">
              <p className="font-semibold">Nghĩa</p>
              <p className="mt-2 text-xs text-muted">Số dư</p>
              <p className="font-semibold text-accent">12.000 đ</p>
            </AccountCard>
            <p className="mt-2 text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted">{current === item.id ? "Đang dùng" : "Bấm để dùng"}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
