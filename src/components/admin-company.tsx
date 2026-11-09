import { useEffect, useState } from "react";
import { addCost, deleteCost, getMoney, getOrg, resetTestMoney, setNickname, updateCost, type CostRow, type MoneyBreakdown, type MoneyPoint, type OrgCard, type OrgPartner } from "@/lib/admin-room";
import { ROLE_LABEL } from "@/lib/staff-role";
import { pushToast } from "@/components/toast";
import { ConfirmCodeDialog } from "@/components/confirm-code";
import { ownPayStatus, saveOwnPaySecret } from "@/lib/pay-own";
import { formatMoney, parseMoney } from "@/lib/money-format";

function OwnPayBox() {
  const [secret, setSecret] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void ownPayStatus().then((row) => setOpen(row.open)).catch(() => setOpen(false));
  }, []);
  return (
    <form
      className="grid gap-2 rounded-2xl border border-line p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        void saveOwnPaySecret({ data: secret.trim() })
          .then((row) => {
            setOpen(row.open);
            setSecret("");
            pushToast(row.open ? "Đã mở cổng xác nhận riêng." : "Đã đóng cổng xác nhận riêng.");
          })
          .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lưu được.", "bad"))
          .finally(() => setBusy(false));
      }}
    >
      <h2 className="font-semibold">Cổng xác nhận riêng</h2>
      <p className="text-xs text-muted">
        {open ? "Đang mở." : "Đang đóng."} API của bạn gửi POST /api/pay/rieng, header x-tyzo-secret, nội dung mã đơn, số tiền và mã giao dịch. Không khớp đơn đang chờ thì không cộng.
      </p>
      <input value={secret} onChange={(event) => setSecret(event.target.value)} type="password" autoComplete="off" placeholder="Khóa mới, ít nhất 16 ký tự. Để trống là đóng." className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
      <button type="submit" className="min-tap rounded-full border border-line disabled:opacity-40" disabled={busy}>{busy ? "Đang lưu…" : "Lưu khóa"}</button>
    </form>
  );
}

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function vnDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function OrgBoard({ owner }: { owner: boolean }) {
  const [cards, setCards] = useState<OrgCard[]>([]);
  const [partners, setPartners] = useState<OrgPartner[]>([]);
  const [users, setUsers] = useState(0);
  const [nick, setNick] = useState<Record<string, string>>({});

  const [fault, setFault] = useState("");

  useEffect(() => {
    void getOrg().then((next) => {
      setCards(next.cards);
      setPartners(next.partners);
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
      <div className="grid gap-2">
        {partners.map((person) => (
          <article key={person.id} className="org-card role-ctv">
            <p className="role-chip role-ctv">Cộng tác</p>
            <p className="font-medium">{person.name || "Chưa có tên"}</p>
            <p className="text-sm text-muted">{person.email}</p>
            <p className="text-sm text-muted">Mã {person.code} · {person.status === "hoat-dong" ? "Đang mở" : person.status === "tam-khoa" ? "Tạm khóa" : "Chờ duyệt"}</p>
          </article>
        ))}
      </div>
      <article className="org-card role-user">
        <p className="role-chip role-user">Người dùng</p>
        <p className="font-medium">{users} tài khoản dùng phòng</p>
        <p className="text-sm text-muted">Không vào Admin.</p>
      </article>
    </section>
  );
}

export function MoneyBoard({ owner }: { owner: boolean }) {
  const [span, setSpan] = useState<"day" | "week" | "month" | "year">("day");
  const [points, setPoints] = useState<MoneyPoint[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [cost, setCost] = useState(0);
  const [breakdown, setBreakdown] = useState<MoneyBreakdown>({ nap: 0, goi: 0, luot: 0, hoan: 0, nha: 0, chi: 0, von: 0, lai: 0, hoa: 0 });
  const [day, setDay] = useState(vnDay);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [editing, setEditing] = useState<number | null>(null);

  const [fault, setFault] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  function load(next = span) {
    void getMoney({ data: next }).then((result) => {
      setPoints(result.points);
      setRevenue(result.revenue);
      setCost(result.cost);
      setBreakdown(result.breakdown);
      setCosts(result.costs);
      setFault("");
      setReady(true);
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
        <article className="rounded-xl border border-line px-2 py-2"><p className="text-xs text-muted">Lời lỗ</p><p className={"text-sm font-semibold " + ((breakdown.lai - cost - breakdown.hoa) > 0 ? "text-accent" : (breakdown.lai - cost - breakdown.hoa) < 0 ? "text-danger" : "")}>{(breakdown.lai - cost - breakdown.hoa) > 0 ? "+" : ""}{dong(breakdown.lai - cost - breakdown.hoa)}</p></article>
      </div>
      <ul className="space-y-1 text-sm text-muted">
        {points.map((point) => (
          <li key={point.bucket}>{point.bucket} · thu {dong(point.revenue)} · chi {dong(point.cost)}</li>
        ))}
        {points.length === 0 && <li>{ready ? "Chưa có tiền nạp trong khoảng này." : "Đang tải…"}</li>}
      </ul>
      <div className="grid gap-2 rounded-xl border border-line p-3 text-sm">
        <p className="font-semibold">Chi tiết khoản (khoảng đang chọn)</p>
        <ul className="space-y-1 text-muted">
          <li className="flex justify-between gap-2"><span>Tiền nạp đã xác nhận</span><span className="font-medium text-fg">{dong(breakdown.nap)}</span></li>
          <li className="flex justify-between gap-2"><span>Khách mua gói từ số dư</span><span className="font-medium text-fg">{dong(breakdown.goi)}</span></li>
          <li className="flex justify-between gap-2"><span>Đã trừ trả theo lượt (sau hoàn)</span><span className="font-medium text-fg">{dong(breakdown.luot)}</span></li>
          <li className="flex justify-between gap-2"><span>Hoàn vào ví</span><span className="font-medium text-fg">{dong(breakdown.hoan)}</span></li>
          <li className="flex justify-between gap-2"><span>Nhả khoản đang giữ</span><span className="font-medium text-fg">{dong(breakdown.nha)}</span></li>
          <li className="flex justify-between gap-2"><span>Giá vốn lượt (chưa gồm chênh)</span><span className="font-medium text-fg">{dong(breakdown.von)}</span></li>
          <li className="flex justify-between gap-2"><span>Lãi gộp (gói + lượt − giá vốn)</span><span className="font-medium text-fg">{dong(breakdown.lai)}</span></li>
          <li className="flex justify-between gap-2"><span>Hoa hồng đã ghi</span><span className="font-medium text-fg">{dong(breakdown.hoa)}</span></li>
          <li className="flex justify-between gap-2"><span>Chi phí vận hành (ghi tay)</span><span className="font-medium text-fg">{dong(breakdown.chi)}</span></li>
        </ul>
        <p className="text-xs text-muted">
          Lời lỗ = lãi gộp trừ hoa hồng và chi phí ghi tay. Lượt trước bản này chưa lưu giá vốn nên có thể làm lời lỗ cao hơn thực tế.
          Tiền thử và gói mở tay không tính. Key của khách không đi qua sổ này.
        </p>
      </div>
      {owner && (
        <form
          className="grid gap-2 rounded-2xl border border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (saving) return;
            setSaving(true);
            const task = editing
              ? updateCost({ data: { id: editing, day, label, amount: parseMoney(amount) } })
              : addCost({ data: { day, label, amount: parseMoney(amount) } });
            void task
              .then(() => {
                setEditing(null);
                setLabel("");
                setAmount("");
                pushToast(editing ? "Đã sửa khoản chi." : "Đã ghi chi phí.");
                load();
              })
              .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa ghi được.", "bad"))
              .finally(() => setSaving(false));
          }}
        >
          <h2 className="font-semibold">{editing ? "Sửa khoản chi" : "Ghi chi phí"}</h2>
          <input type="date" value={day} onChange={(event) => setDay(event.target.value)} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Tên khoản chi" className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
          <input value={amount} onChange={(event) => setAmount(formatMoney(parseMoney(event.target.value)))} inputMode="numeric" placeholder="Số tiền" className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent font-semibold text-ink disabled:opacity-40" disabled={saving}>{saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Lưu chi phí"}</button>
          {editing && (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-line"
              onClick={() => {
                setEditing(null);
                setLabel("");
                setAmount("");
              }}
            >
              Hủy sửa
            </button>
          )}
          <div className="grid gap-2">
            {costs.map((row) => (
              <article key={row.id} className="grid gap-2 border-t border-line pt-2 text-sm">
                <p className="font-medium">{row.label}</p>
                <p className="text-muted">{row.day.split("-").reverse().join("/")} · {dong(row.amount)}</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-2"
                    onClick={() => {
                      setEditing(row.id);
                      setDay(row.day);
                      setLabel(row.label);
                      setAmount(formatMoney(row.amount));
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-2"
                    onClick={() => {
                      setEditing(null);
                      setLabel(row.label);
                      setAmount(formatMoney(row.amount));
                      setDay(vnDay());
                    }}
                  >
                    Dùng lại
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-2"
                    onClick={() => {
                      if (!window.confirm(`Xóa khoản «${row.label}»?`)) return;
                      void deleteCost({ data: row.id })
                        .then(() => {
                          if (editing === row.id) setEditing(null);
                          pushToast("Đã xóa khoản chi.");
                          load();
                        })
                        .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa xóa được.", "bad"));
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
            {ready && costs.length === 0 && <p className="text-sm text-muted">Chưa có khoản chi trong khoảng đang xem.</p>}
          </div>
        </form>
      )}
      {owner && <OwnPayBox />}
      {owner && (
        <div className="grid gap-2 rounded-2xl border border-danger/40 bg-danger/5 p-3">
          <h2 className="font-semibold text-danger">Reset tiền (chỉ khi test)</h2>
          <p className="text-sm text-muted">
            Đưa toàn bộ số dư về 0, xóa sổ cái, đơn nạp, chi phí ghi tay và phiếu tiền test. Không xóa tài khoản hay gói. Dùng trước khi chạy thật để tránh lẫn số liệu thử.
          </p>
          <button
            type="button"
            className="min-tap rounded-full border border-danger px-4 text-sm font-semibold text-danger"
            onClick={() => {
              const code = Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
              setResetCode(code);
              setResetOpen(true);
            }}
          >
            Reset về 0
          </button>
        </div>
      )}

      <ConfirmCodeDialog
        open={resetOpen}
        title="Reset tiền test"
        message="Xóa hết số liệu tiền test? Không hoàn lại. Đưa toàn bộ số dư về 0, xóa sổ cái, đơn nạp, chi phí ghi tay và phiếu tiền test."
        code={resetCode}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          setResetOpen(false);
          void resetTestMoney({ data: resetCode })
            .then(() => {
              pushToast("Đã reset tiền test về 0.");
              load();
            })
            .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa reset được.", "bad"));
        }}
      />
    </section>
  );
}
