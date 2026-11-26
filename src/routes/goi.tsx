import { dong } from "@/lib/payment/money-format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { TRIAL_FILES, TRIAL_MINUTES, type RoomPlanId } from "@/lib/room-plans";
import { useRoomPlans } from "@/lib/use-room-plans";

export const Route = createFileRoute("/goi")({
  component: GoiPage,
});

/** Giá, số ngày, giá gạch và số tiết kiệm lấy hết từ giá Admin đã lưu (useRoomPlans, mặc định ROOM_PLANS). Ở đây chỉ giữ lời ghi chú. */
const PLAN_NOTES: Record<RoomPlanId, string> = {
  ngay: "Một buổi. Trong 24 giờ không giới hạn số tệp. Cước của nhà cung cấp AI (Groq, Alibaba…) vẫn do bạn tự trả bằng key của bạn.",
  tuan: "Trong 7 ngày không giới hạn số tệp. Rẻ hơn mua bảy ngày lẻ.",
  thang: "Trong 30 ngày không giới hạn số tệp. Cước của nhà cung cấp AI (Groq, Alibaba…) vẫn do bạn tự trả bằng key của bạn.",
};

function GoiPage() {
  const plans = useRoomPlans();
  return (
    <main className="room-wide mx-auto flex h-dvh flex-col bg-bg text-fg">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <p className="text-xs font-medium tracking-wide text-accent">Bảng giá</p>
            <h1 className="text-base leading-none font-semibold">Thuê phòng TyZo Sub</h1>
          </div>
        </div>
        <Link to="/" className="room-back">
          Về phòng dịch
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="rounded-[var(--radius-card)] border border-line bg-card px-3 py-2 text-sm text-muted">
          Trang này chỉ xem giá, không thu tiền và không giữ số dư. Muốn thuê thì mở Tài khoản trong phòng dịch rồi bấm gói. Mã QR hiện ra. Chuyển khoản đúng số thì mở hạn.
        </p>
        <section className="plan-grid mt-4">
          <article className="rounded-[var(--radius-card)] border border-line bg-raised p-4">
            <p className="text-sm text-muted">Dùng thử</p>
            <p className="mt-1 text-2xl font-semibold">0 đ</p>
            <p className="mt-2 text-sm text-muted">Đăng ký, chưa mua gói: {TRIAL_FILES} tệp, tối đa {TRIAL_MINUTES} phút, đủ chức năng trên màn hình. Không xuất file phụ đề.</p>
          </article>
          {plans.map((plan) => (
            <article key={plan.id} className="rounded-[var(--radius-card)] border border-line bg-card p-4">
              <h2 className="font-semibold">{plan.name}</h2>
              <p className="mt-1 text-2xl font-semibold text-accent">{dong(plan.price)}</p>
              {plan.save != null ? (
                <p className="text-sm text-muted">
                  <span className="line-through">{dong(plan.strike!)}</span>
                  {" · đã tiết kiệm "}
                  {dong(plan.save)}
                </p>
              ) : (
                <p className="text-sm text-muted">Giá một ngày. Gói 7 ngày và 30 ngày tiết kiệm hơn.</p>
              )}
              <p className="mt-2 text-sm text-muted">{PLAN_NOTES[plan.id]}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
