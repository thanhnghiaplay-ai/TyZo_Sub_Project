import { useEffect, useState } from "react";
import { addCost, deleteCost, estimateOldCost, getMoney, getOrg, resetTestMoney, setNickname, startTestReset, updateCost, type CostRow, type MoneyBreakdown, type MoneyPoint, type OrgCard, type OrgPartner } from "@/lib/admin/admin-money";
import { ROLE_LABEL } from "@/lib/staff-role";
import { pushToast } from "@/components/toast";
import { askConfirm } from "@/lib/confirm";
import { ConfirmCodeDialog } from "@/components/confirm-code";
import { formatMoney, parseMoney, dong } from "@/lib/payment/money-format";
import { ProfitVerdict } from "@/components/profit-verdict";
import { COST_CATEGORIES, bucketTotals, categoryLabel, spanLabel } from "@/lib/payment/money-extra";
import { RevenueExtra } from "@/components/revenue-extra";

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

  const partnerById = new Map(partners.map((person) => [person.id, person]));

  return (
    <section className="org-tree admin-flow admin-wide">
      {fault && <p className="text-sm text-danger">{fault}</p>}
      {(["chu", "quan-ly", "ho-tro"] as const).map((role) => (
        <div key={role} className="grid gap-2">
          {cards.filter((card) => card.role === role).map((card) => {
            const partner = partnerById.get(card.id);
            return (
            <article key={card.id} className={"org-card role-" + role + (role === "chu" ? " org-owner" : "")}>
              <div className="mb-1 flex flex-wrap items-center gap-1">
                <p className={"role-chip role-" + role}>{ROLE_LABEL[role]}</p>
                {partner && <p className="role-chip role-ctv">Cộng tác</p>}
              </div>
              <p className="font-medium">{card.nickname || card.name || "Chưa có tên"}</p>
              <p className="text-sm text-muted">{card.email}</p>
              <p className="text-sm text-muted">{partner ? `Mã ${partner.code} · ` : ""}{card.actions} việc trong tháng</p>
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
                  <input value={nick[card.id] || ""} onChange={(event) => setNick((prev) => ({ ...prev, [card.id]: event.target.value }))} placeholder="Tên gợi nhớ" className="min-w-0 flex-1 rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" />
                  <button type="submit" className="min-tap rounded-full border border-line px-3">Lưu</button>
                </form>
              )}
            </article>
            );
          })}
        </div>
      ))}
      <div className="grid gap-2">
        {partners.filter((person) => !cards.some((card) => card.id === person.id)).map((person) => (
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
  const [breakdown, setBreakdown] = useState<MoneyBreakdown>({ nap: 0, goi: 0, luot: 0, hoan: 0, nha: 0, chi: 0, von: 0, lai: 0, hoa: 0, loi: 0, vonUoc: 0, vonToken: 0, tokenChuaGia: false, chuaVon: 0 });
  const [day, setDay] = useState(vnDay);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("khac");
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
    <section className="admin-flow admin-wide">
      <div className="admin-card space-y-3">
      <div className="flex flex-wrap gap-2">
        {([["day", "Theo ngày"], ["week", "Theo tuần"], ["month", "Theo tháng"], ["year", "Theo năm"]] as const).map(([id, name]) => (
          <button key={id} type="button" className={"min-tap rounded-full px-3 text-sm " + (span === id ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => setSpan(id)}>
            {name}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">Các số bên dưới cộng {spanLabel(span)}.</p>
      {owner && <ProfitVerdict span={span} />}
      {span === "day" && ready && (
        <p className="text-xs text-muted">Hôm nay ({vnDay()}): thu {dong(bucketTotals(points, vnDay()).revenue)} · chi {dong(bucketTotals(points, vnDay()).cost)}</p>
      )}
      {fault && <p className="text-sm text-danger">{fault}</p>}
      <div className="grid grid-cols-3 gap-2">
        <article className="rounded-[var(--radius-ctl)] border border-line px-2 py-2"><p className="text-xs text-muted">Doanh thu</p><p className="text-sm font-semibold">{dong(revenue)}</p></article>
        <article className="rounded-[var(--radius-ctl)] border border-line px-2 py-2"><p className="text-xs text-muted">Chi phí</p><p className="text-sm font-semibold">{dong(cost)}</p></article>
        <article className="rounded-[var(--radius-ctl)] border border-line px-2 py-2"><p className="text-xs text-muted">Lời lỗ</p><p className={"text-sm font-semibold " + (breakdown.loi > 0 ? "text-accent" : breakdown.loi < 0 ? "text-danger" : "")}>{breakdown.loi > 0 ? "+" : ""}{dong(breakdown.loi)}</p></article>
      </div>
      <ul className="space-y-1 text-sm text-muted">
        {points.map((point) => (
          <li key={point.bucket}>{point.bucket} · thu {dong(point.revenue)} · chi {dong(point.cost)}</li>
        ))}
        {points.length === 0 && <li>{ready ? "Chưa có chuyển khoản trong khoảng này." : "Đang tải…"}</li>}
      </ul>
      </div>
      {owner && <RevenueExtra span={span} points={points} />}
      <div className="grid gap-2 rounded-[var(--radius-ctl)] border border-line p-3 text-sm">
        <p className="font-semibold">Chi tiết khoản (khoảng đang chọn)</p>
        <ul className="space-y-1 text-muted">
          <li className="flex justify-between gap-2"><span>Tiền chuyển khoản đã xác nhận</span><span className="font-medium text-fg">{dong(breakdown.nap)}</span></li>
          <li className="flex justify-between gap-2"><span>Đã dùng từ số dư cũ: mua gói</span><span className="font-medium text-fg">{dong(breakdown.goi)}</span></li>
          <li className="flex justify-between gap-2"><span>Đã dùng từ số dư cũ: trả theo lượt (sau hoàn)</span><span className="font-medium text-fg">{dong(breakdown.luot)}</span></li>
          <li className="flex justify-between gap-2"><span>Hoàn vào số dư cũ</span><span className="font-medium text-fg">{dong(breakdown.hoan)}</span></li>
          <li className="flex justify-between gap-2"><span>Nhả khoản đang giữ</span><span className="font-medium text-fg">{dong(breakdown.nha)}</span></li>
          <li className="flex justify-between gap-2"><span>Giá vốn (chưa gồm chênh)</span><span className="font-medium text-fg">{dong(breakdown.von)}</span></li>
          {breakdown.vonToken > 0 && (
            <li className="flex justify-between gap-2"><span>Trong đó Token dịch (quy theo giá gốc Turbo hiện hành)</span><span className="font-medium text-fg">{dong(breakdown.vonToken)}</span></li>
          )}
          {breakdown.vonUoc > 0 && (
            <li className="flex justify-between gap-2"><span>Trong đó giá vốn ước tính (phiếu cũ)</span><span className="font-medium text-fg">{dong(breakdown.vonUoc)}</span></li>
          )}
          <li className="flex justify-between gap-2"><span>Lãi gộp (tiền vào − giá vốn)</span><span className="font-medium text-fg">{dong(breakdown.lai)}</span></li>
          <li className="flex justify-between gap-2"><span>Hoa hồng đã ghi</span><span className="font-medium text-fg">{dong(breakdown.hoa)}</span></li>
          <li className="flex justify-between gap-2"><span>Chi phí vận hành (ghi tay)</span><span className="font-medium text-fg">{dong(breakdown.chi)}</span></li>
        </ul>
        <p className="text-xs text-muted">
          Lời lỗ = tiền chuyển khoản vào − giá vốn − hoa hồng − chi phí ghi tay. Các dòng «từ số dư cũ» chỉ để tham khảo, không cộng vào lời lỗ vì tiền đó đã tính lúc khách nạp. Phiếu từ bản này trở đi lưu giá vốn thật. Phiếu cũ chỉ có giá vốn ước tính (đánh dấu ở trên) và có thể lệch so với thực tế.
          Tiền thử và gói mở tay không tính. Key của khách không đi qua sổ này.
        </p>
        {breakdown.tokenChuaGia && (
          <p className="text-xs text-danger">Có lượt trừ Token dịch nhưng chưa có giá Turbo để quy ra đồng, nên giá vốn đang thiếu và lời lỗ có thể cao hơn thật. Vào Cấu hình → Giá để tải bảng giá.</p>
        )}
        {owner && breakdown.chuaVon > 0 && (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 text-sm"
            disabled={saving}
            onClick={() => {
              if (saving) return;
              setSaving(true);
              void estimateOldCost()
                .then((result) => {
                  pushToast(`Đã ước tính giá vốn cho ${result.count} phiếu cũ (chênh ${result.markup}%).`);
                  load();
                })
                .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa ước tính được.", "bad"))
                .finally(() => setSaving(false));
            }}
          >
            Ước tính giá vốn cho {breakdown.chuaVon} phiếu cũ
          </button>
        )}
      </div>
      {owner && (
        <form
          className="grid gap-2 rounded-[var(--radius-card)] border border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (saving) return;
            setSaving(true);
            const task = editing
              ? updateCost({ data: { id: editing, day, label, amount: parseMoney(amount), category } })
              : addCost({ data: { day, label, amount: parseMoney(amount), category } });
            void task
              .then(() => {
                setEditing(null);
                setLabel("");
                setAmount("");
                setCategory("khac");
                pushToast(editing ? "Đã sửa khoản chi." : "Đã ghi chi phí.");
                load();
              })
              .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa ghi được.", "bad"))
              .finally(() => setSaving(false));
          }}
        >
          <h2 className="font-semibold">{editing ? "Sửa khoản chi" : "Ghi chi phí"}</h2>
          <input type="date" value={day} onChange={(event) => setDay(event.target.value)} className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" />
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Tên khoản chi" className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" />
          <input value={amount} onChange={(event) => setAmount(formatMoney(parseMoney(event.target.value)))} inputMode="numeric" placeholder="Số tiền" className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" />
          <label className="grid gap-1 text-sm">
            <span className="text-muted">Loại chi phí</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none">
              {COST_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent font-semibold text-ink disabled:opacity-40" disabled={saving}>{saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Lưu chi phí"}</button>
          {editing && (
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-line"
              onClick={() => {
                setEditing(null);
                setLabel("");
                setAmount("");
                setCategory("khac");
              }}
            >
              Hủy sửa
            </button>
          )}
          <div className="grid gap-2">
            {costs.map((row) => (
              <article key={row.id} className="grid gap-2 border-t border-line pt-2 text-sm">
                <p className="font-medium">{row.label}</p>
                <p className="text-muted">{row.day.split("-").reverse().join("/")} · {dong(row.amount)} · {categoryLabel(row.category)}</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-2"
                    onClick={() => {
                      setEditing(row.id);
                      setDay(row.day);
                      setLabel(row.label);
                      setAmount(formatMoney(row.amount));
                      setCategory(row.category || "khac");
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
                      setCategory(row.category || "khac");
                      setDay(vnDay());
                    }}
                  >
                    Dùng lại
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-2"
                    onClick={async () => {
                      if (!(await askConfirm({ title: "Xóa khoản này?", text: `Xóa khoản «${row.label}»?`, confirmLabel: "Xóa", danger: true }))) return;
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
      {owner && (
        <div className="grid gap-2 rounded-[var(--radius-card)] border border-danger/40 bg-danger/5 p-3">
          <h2 className="font-semibold text-danger">Reset số liệu thử</h2>
          <p className="text-sm text-muted">
            Xóa Token dịch, chuông, đơn, phiếu, nhật ký thao tác, hoa hồng thử và gói thuê đang mở. Lượt thử về 1. Giữ tài khoản, cấu hình và key. Không hoàn tiền.
          </p>
          <button
            type="button"
            className="min-tap rounded-full border border-danger px-4 text-sm font-semibold text-danger"
            onClick={() => {
              void startTestReset()
                .then(({ code }) => {
                  setResetCode(code);
                  setResetOpen(true);
                })
                .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa lấy được mã xác nhận.", "bad"));
            }}
          >
            Reset về sạch
          </button>
        </div>
      )}

      <ConfirmCodeDialog
        open={resetOpen}
        title="Reset số liệu thử"
        message="Xóa hết số liệu thử? Không hoàn tiền. Xóa Token dịch, chuông, đơn, phiếu, nhật ký, hoa hồng thử và gói thuê. Lượt thử về 1. Giữ tài khoản, cấu hình và key."
        code={resetCode}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          setResetOpen(false);
          void resetTestMoney({ data: resetCode })
            .then(() => {
              pushToast("Đã xóa số liệu thử.");
              load();
            })
            .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa reset được.", "bad"));
        }}
      />
    </section>
  );
}
