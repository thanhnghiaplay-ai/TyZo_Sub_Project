import { ROOM_PLANS, TRIAL_FILES, TRIAL_MINUTES } from "@/lib/room-plans";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

/** Chỉ XEM giá thuê phòng. Số nằm ở `src/lib/room-plans.ts` (cũng nằm trong chữ điều khoản và hướng dẫn); sửa phải sửa code, chưa sửa được ở Admin. */
export function RoomPlansView() {
  return (
    <section className="grid gap-2">
      <p className="text-xs text-muted">
        Giá thuê phòng đặt tay, không tính từ Token dịch. Chỉ xem; muốn đổi phải sửa trong mã vì giá nằm cả trong điều khoản.
      </p>
      <ul className="grid gap-1 text-sm">
        {ROOM_PLANS.map((plan) => (
          <li key={plan.id} className="flex flex-wrap justify-between gap-2 rounded-[var(--radius-ctl)] border border-line px-3 py-2">
            <span>{plan.name}</span>
            <span>
              {plan.strike ? <s className="mr-2 text-muted">{dong(plan.strike)}</s> : null}
              <strong>{dong(plan.price)}</strong>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Dùng thử: {TRIAL_FILES} tệp, tối đa {TRIAL_MINUTES} phút.</p>
    </section>
  );
}
