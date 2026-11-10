import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/goi")({
  component: GoiDemo,
});

const PLANS = [
  {
    id: "ngay",
    name: "24 giờ",
    price: 9_000,
    strike: null as number | null,
    save: null as number | null,
    note: "Một buổi. Trong 24 giờ không giới hạn số tệp. Tiền Groq vẫn do bạn tự trả.",
  },
  {
    id: "tuan",
    name: "7 ngày",
    price: 39_000,
    strike: 63_000,
    save: 24_000,
    note: "Trong 7 ngày không giới hạn số tệp. Rẻ hơn mua bảy ngày lẻ.",
  },
  {
    id: "thang",
    name: "30 ngày",
    price: 99_000,
    strike: 270_000,
    save: 171_000,
    note: "Trong 30 ngày không giới hạn số tệp. Tiền Groq vẫn do bạn tự trả.",
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

const NAP = [9_000, 39_000, 99_000];

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function untilLabel(id: PlanId, from: number) {
  const end = new Date(from);
  if (id === "ngay") end.setHours(end.getHours() + 24);
  if (id === "tuan") end.setDate(end.getDate() + 7);
  if (id === "thang") end.setDate(end.getDate() + 30);
  return end.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function GoiDemo() {
  const [phase, setPhase] = useState<"gia" | "dangky" | "vi">("gia");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [held, setHeld] = useState<PlanId | null>(null);
  const [open, setOpen] = useState<{ id: PlanId; until: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function buy(id: PlanId) {
    const plan = PLANS.find((item) => item.id === id)!;
    if (!account) {
      setHeld(id);
      setNotice(null);
      setPhase("dangky");
      return;
    }
    if (balance < plan.price) {
      setNotice("Số dư chưa đủ. Hãy nạp đúng giá gói. Bản này không trừ tiền thật.");
      setPhase("vi");
      return;
    }
    setBalance((value) => value - plan.price);
    setOpen({ id, until: untilLabel(id, Date.now()) });
    setNotice("Đã mở phòng trên bản xem thử. Tài khoản và tiền không được lưu.");
    setPhase("vi");
  }

  return (
    <main className="room-wide mx-auto flex h-dvh flex-col bg-bg text-fg">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-accent">Bản xem thử giá</p>
          <h1 className="text-base leading-none font-semibold">Thuê phòng TyZo Sub</h1>
        </div>
        <Link to="/" className="room-back">
          Về phòng dịch
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <p className="rounded-2xl border border-line bg-card px-3 py-2 text-sm text-muted">
          Không thu tiền, không tạo tài khoản, không ghi vào cơ sở dữ liệu. Phòng dịch ở trang chủ không đổi.
        </p>

        {phase === "gia" && (
          <section className="plan-grid mt-4">
            <article className="rounded-2xl border border-line bg-raised p-4">
              <p className="text-sm text-muted">Xem thử</p>
              <p className="mt-1 text-2xl font-semibold">0 đ</p>
              <p className="mt-2 text-sm text-muted">Đăng ký, chưa nạp: 1 tệp, tối đa 10 phút, đủ chức năng trên màn hình. Không xuất file Vietsub. Cùng máy tạo thêm tài khoản không được thêm lượt.</p>
            </article>
            {PLANS.map((plan) => (
              <article key={plan.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
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
                  </div>
                  <button
                    type="button"
                    className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink"
                    onClick={() => buy(plan.id)}
                  >
                    Chọn
                  </button>
                </div>
                <p className="mt-2 text-sm text-muted">{plan.note}</p>
              </article>
            ))}
          </section>
        )}

        {phase === "dangky" && (
          <form
            className="mt-4 max-w-xl space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const cleanName = name.trim();
              const cleanEmail = email.trim();
              if (!cleanName || !cleanEmail.includes("@")) {
                setNotice("Điền tên và email hợp lệ. Mật khẩu không cần vì không có tài khoản thật.");
                return;
              }
              setAccount(cleanName);
              setNotice(held ? "Đăng ký xong trên bản xem thử. Hãy nạp rồi mua gói đã chọn." : "Đăng ký xong trên bản xem thử.");
              setPhase("vi");
            }}
          >
            <h2 className="text-lg font-semibold">Đăng ký</h2>
            <label className="block text-sm">
              Tên
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
              />
            </label>
            <label className="block text-sm">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
              />
            </label>
            <button type="submit" className="min-tap w-full rounded-full bg-accent font-semibold text-ink">
              Tạo tài khoản xem thử
            </button>
            <button type="button" className="min-tap w-full rounded-full border border-line" onClick={() => setPhase("gia")}>
              Xem lại giá
            </button>
          </form>
        )}

        {phase === "vi" && account && (
          <section className="mt-4 space-y-3">
            <article className="rounded-2xl border border-line bg-card p-4">
              <p className="text-sm text-muted">{account}</p>
              <p className="mt-1 text-sm text-muted">Số dư</p>
              <p className="text-2xl font-semibold text-accent">{dong(balance)}</p>
              {open && (
                <p className="mt-2 text-sm">
                  Đang mở gói {PLANS.find((item) => item.id === open.id)?.name}. Dùng đến {open.until}.
                </p>
              )}
            </article>
            <div className="grid grid-cols-3 gap-2">
              {NAP.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="min-tap rounded-2xl border border-line bg-raised text-sm"
                  onClick={() => {
                    setBalance((value) => value + amount);
                    setNotice("Đã cộng tiền giả. Không có giao dịch ngân hàng.");
                  }}
                >
                  Nạp {dong(amount)}
                </button>
              ))}
            </div>
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className="flex min-tap w-full items-center justify-between rounded-2xl border border-line bg-card px-4 text-left"
                onClick={() => buy(plan.id)}
              >
                <span>
                  {plan.name}
                  {held === plan.id ? " · đang chọn" : ""}
                </span>
                <span className="font-semibold text-accent">{dong(plan.price)}</span>
              </button>
            ))}
            <button type="button" className="min-tap w-full rounded-full border border-line" onClick={() => setPhase("gia")}>
              Xem lại bảng giá
            </button>
          </section>
        )}

        {notice && <p className="mt-4 text-sm text-muted">{notice}</p>}
      </div>
    </main>
  );
}
