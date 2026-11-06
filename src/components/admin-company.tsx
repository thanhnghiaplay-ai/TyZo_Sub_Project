import { useEffect, useState } from "react";
import { addCost, getMoney, getOrg, setNickname, type MoneyPoint, type OrgCard } from "@/lib/admin-room";
import { ROLE_LABEL } from "@/lib/staff-role";
import { pushToast } from "@/components/toast";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function OrgBoard({ owner }: { owner: boolean }) {
  const [cards, setCards] = useState<OrgCard[]>([]);
  const [users, setUsers] = useState(0);
  const [nick, setNick] = useState<Record<string, string>>({});

  const [fault, setFault] = useState("");

  useEffect(() => {
    void getOrg().then((next) => {
      setCards(next.cards);
      setUsers(next.users);
      setNick(Object.fromEntries(next.cards.map((card) => [card.id, card.nickname])));
      setFault("");
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Chưa mở được sơ đồ.";
      setFault(message);
      pushToast(message, "bad");
    });
  }, []);

  const rows: Array<OrgCard["role"]> = ["chu", "quan-ly", "ho-tro"];

  return (
    <section className="org-tree space-y-3">
      {fault && <p className="text-sm text-danger">{fault}</p>}
      {rows.map((role) => (
        <div key={role} className="grid gap-2">
          {cards.filter((card) => card.role === role).map((card) => (
            <article key={card.id} className={"org-card role-" + card.role + (card.role === "chu" ? " org-owner" : "")}>
              <p className={"role-chip role-" + card.role}>{ROLE_LABEL[card.role === "user" ? "ho-tro" : card.role]}</p>
              <p className="font-medium">{card.nickname || card.name || "Chưa có tên"}</p>
              <p className="text-sm text-muted">{card.email}</p>
              <p className="text-sm text-muted">{card.actions} việc trong tháng</p>
              {owner && (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void setNickname({ data: { userId: card.id, nickname: nick[card.id] || "" } })
                      .then(() => pushToast("Đã lưu tên gợi nhớ."))
                      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"));
                  }}
                >
                  <input value={nick[card.id] || ""} onChange={(event) => setNick((prev) => ({ ...prev, [card.id]: event.target.value }))} placeholder="Tên gợi nhớ" className="min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
                  <button type="submit" className="min-tap rounded-full border border-line px-3">Lưu</button>
                </form>
              )}
            </article>
          ))}
        </div>
      ))}
      <article className="org-card role-user">
        <p className="role-chip role-user">Người dùng</p>
        <p className="font-medium">{users} tài khoản dùng phòng</p>
        <p className="text-sm text-muted">Không vào Admin. Hoa hồng giới thiệu để sau.</p>
      </article>
    </section>
  );
}

export function MoneyBoard({ owner }: { owner: boolean }) {
  const [span, setSpan] = useState<"day" | "week" | "month" | "year">("day");
  const [points, setPoints] = useState<MoneyPoint[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [cost, setCost] = useState(0);
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const [fault, setFault] = useState("");

  function load(next = span) {
    void getMoney({ data: next }).then((result) => {
      setPoints(result.points);
      setRevenue(result.revenue);
      setCost(result.cost);
      setFault("");
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Chưa đọc được doanh thu.";
      setFault(message);
      pushToast(message, "bad");
    });
  }

  useEffect(() => {
    load(span);
  }, [span]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {([["day", "Ngày"], ["week", "Tuần"], ["month", "Tháng"], ["year", "Năm"]] as const).map(([id, name]) => (
          <button key={id} type="button" className={"min-tap rounded-full px-3 text-sm " + (span === id ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setSpan(id)}>
            {name}
          </button>
        ))}
      </div>
      {fault && <p className="text-sm text-danger">{fault}</p>}
      <div className="grid grid-cols-3 gap-2">
        <article className="rounded-xl border border-line px-2 py-2"><p className="text-xs text-muted">Doanh thu</p><p className="text-sm font-semibold">{dong(revenue)}</p></article>
        <article className="rounded-xl border border-line px-2 py-2"><p className="text-xs text-muted">Chi phí</p><p className="text-sm font-semibold">{dong(cost)}</p></article>
        <article className="rounded-xl border border-line px-2 py-2"><p className="text-xs text-muted">Lời lỗ</p><p className="text-sm font-semibold">{dong(revenue - cost)}</p></article>
      </div>
      <ul className="space-y-1 text-sm text-muted">
        {points.map((point) => (
          <li key={point.bucket}>{point.bucket} · thu {dong(point.revenue)} · chi {dong(point.cost)}</li>
        ))}
        {points.length === 0 && <li>Chưa có tiền nạp thật trong khoảng này.</li>}
      </ul>
      <p className="text-sm text-muted">Doanh thu chỉ tính tiền nạp qua Sepay hoặc Casso. Tiền thử và gói mở tay không tính. Groq là tiền của khách.</p>
      {owner && (
        <form
          className="grid gap-2 rounded-2xl border border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void addCost({ data: { day, label, amount: Number(amount) } })
              .then(() => {
                setLabel("");
                setAmount("");
                pushToast("Đã ghi chi phí.");
                load();
              })
              .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa ghi được.", "bad"));
          }}
        >
          <h2 className="font-semibold">Ghi chi phí</h2>
          <input type="date" value={day} onChange={(event) => setDay(event.target.value)} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Vercel, Neon, phí cổng" className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" placeholder="Số tiền" className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
          <button type="submit" className="min-tap rounded-full bg-accent font-semibold text-ink">Lưu chi phí</button>
        </form>
      )}
    </section>
  );
}
