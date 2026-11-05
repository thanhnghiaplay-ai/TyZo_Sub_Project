import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  getMyPlace,
  grantPlan,
  listAppeals,
  listAudit,
  removeUser,
  replyAppeal,
  saveStaffNote,
  searchUsers,
  listUserLedger,
  setOwnerEmail,
  setStaffRole,
  setTempPassword,
  setUserStatus,
  type AdminUser,
  type AppealRow,
  type AuditRow,
  type LedgerRow,
  type MyPlace,
} from "@/lib/admin-room";
import { ROOM_PLANS } from "@/lib/room-plans";
import { ROLE_LABEL, roleAtLeast } from "@/lib/staff-role";
import { PaySettings } from "@/components/pay-settings";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function AdminDesk() {
  const [place, setPlace] = useState<MyPlace | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [picked, setPicked] = useState<AdminUser | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [ownerEmail, setOwnerEmailInput] = useState("");
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function refreshPlace() {
    const next = await getMyPlace();
    setPlace(next);
    if (next.role) {
      setAppeals(await listAppeals());
      if (roleAtLeast(next.role, "chu")) setAudit(await listAudit());
    }
  }

  useEffect(() => {
    void refreshPlace().catch((error) => {
      const message = error instanceof Error ? error.message : "";
      setNotice(message || "Hãy đăng nhập bằng email Chủ, rồi mở lại trang này.");
    });
  }, []);

  useEffect(() => {
    if (place?.role === "chu" && place.email) setOwnerEmailInput(place.email);
  }, [place]);

  async function run(task: () => Promise<unknown>, done: string) {
    setBusy(true);
    setNotice(null);
    try {
      await task();
      setNotice(done);
      if (place?.role) {
        setAppeals(await listAppeals());
        if (roleAtLeast(place.role, "chu")) setAudit(await listAudit());
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thực hiện được.");
    } finally {
      setBusy(false);
    }
  }

  const role = place?.role ?? null;

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
      <p className="text-sm text-muted">{role ? `Quyền của bạn: ${ROLE_LABEL[role]}` : "Trang Admin tách khỏi phòng dịch."}</p>
      {!place && notice && (
        <Link to="/login" className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink">
          Đăng nhập
        </Link>
      )}
      {place && !role && <p className="text-sm text-muted">Không có quyền vào trang này.</p>}
      {role && (
        <>
          <h2 className="font-semibold">Tài khoản</h2>
          <p className="text-sm text-muted">Tìm email, xem sổ tiền và hạn gói, ghi chú, đặt mật khẩu tạm. Quản lý thì khóa hoặc mở hạn. Chỉ Chủ được cấm.</p>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const found = await searchUsers({ data: query });
                setUsers(found);
                setPicked(null);
              }, foundNotice(query));
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Email hoặc tên"
              className="min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 py-3 outline-none"
            />
            <button type="submit" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40">
              Tìm
            </button>
          </form>
          <ul className="space-y-2">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-line px-3 py-2 text-left"
                  onClick={() => {
                    setPicked(user);
                    setNote(user.note);
                    setReason(user.reason);
                    setLedger([]);
                    void listUserLedger({ data: user.id }).then(setLedger).catch(() => setLedger([]));
                  }}
                >
                  <span className="block font-medium">{user.email}</span>
                  <span className="text-sm text-muted">
                    {user.name} · {user.status === "open" ? "Đang mở" : user.status === "locked" ? "Đang khóa" : "Đang cấm"}
                    {user.role ? ` · ${ROLE_LABEL[user.role]}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {picked && (
            <article className="space-y-3 rounded-2xl border border-line bg-card p-4">
              <h2 className="font-semibold">{picked.email}</h2>
              <p className="text-sm text-muted">
                Số dư {dong(picked.balance)}. {planLine(picked)} Còn {picked.trialLeft} lượt thử.
              </p>
              <div>
                <h3 className="text-sm font-semibold">Sổ tiền</h3>
                {ledger.length === 0 && <p className="text-sm text-muted">Chưa có dòng tiền.</p>}
                <ul className="mt-1 space-y-1 text-sm text-muted">
                  {ledger.map((item) => (
                    <li key={item.id}>
                      {item.note || item.kind} · {dong(item.amount)}
                    </li>
                  ))}
                </ul>
              </div>
              <label className="grid gap-1 text-sm">
                Ghi chú nội bộ
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
              </label>
              <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => saveStaffNote({ data: { userId: picked.id, note } }), "Đã lưu ghi chú.")}>
                Lưu ghi chú
              </button>
              <label className="grid gap-1 text-sm">
                Mật khẩu tạm
                <input value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
              </label>
              <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => setTempPassword({ data: { userId: picked.id, password } }), "Đã đặt mật khẩu tạm. Hãy gửi cho họ.")}>
                Đặt mật khẩu tạm
              </button>
              {roleAtLeast(role, "quan-ly") && (
                <>
                  <label className="grid gap-1 text-sm">
                    Lý do khóa hoặc cấm
                    <input value={reason} onChange={(event) => setReason(event.target.value)} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => setUserStatus({ data: { userId: picked.id, status: "locked", reason } }), "Đã khóa.")}>
                      Khóa
                    </button>
                    <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => setUserStatus({ data: { userId: picked.id, status: "open", reason: "" } }), "Đã mở lại.")}>
                      Mở lại
                    </button>
                    {roleAtLeast(role, "chu") && (
                      <button type="button" disabled={busy} className="min-tap rounded-full border border-danger px-4 text-danger disabled:opacity-40" onClick={() => void run(() => setUserStatus({ data: { userId: picked.id, status: "banned", reason } }), "Đã cấm.")}>
                        Cấm
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_PLANS.map((plan) => (
                      <button key={plan.id} type="button" disabled={busy} className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={() => void run(() => grantPlan({ data: { userId: picked.id, planId: plan.id } }), `Đã mở gói ${plan.name}.`)}>
                        Mở {plan.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {roleAtLeast(role, "chu") && picked.role !== "chu" && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => setStaffRole({ data: { userId: picked.id, role: "ho-tro" } }), "Đã cho quyền Hỗ trợ.")}>
                    Cho Hỗ trợ
                  </button>
                  <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => setStaffRole({ data: { userId: picked.id, role: "quan-ly" } }), "Đã cho quyền Quản lý.")}>
                    Cho Quản lý
                  </button>
                  <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => setStaffRole({ data: { userId: picked.id, role: "none" } }), "Đã gỡ quyền.")}>
                    Gỡ quyền
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="min-tap rounded-full border border-danger px-4 text-danger disabled:opacity-40"
                    onClick={() => {
                      if (!confirm(`Xóa tài khoản ${picked.email}? Việc này không hoàn lại.`)) return;
                      void run(async () => {
                        await removeUser({ data: picked.id });
                        setUsers((list) => list.filter((item) => item.id !== picked.id));
                        setPicked(null);
                      }, "Đã xóa tài khoản.");
                    }}
                  >
                    Xóa tài khoản
                  </button>
                </div>
              )}
            </article>
          )}
          <section className="space-y-2">
            <h2 className="font-semibold">Yêu cầu</h2>
            {appeals.length === 0 && <p className="text-sm text-muted">Chưa có yêu cầu.</p>}
            {appeals.map((item) => (
              <article key={item.id} className="rounded-xl border border-line px-3 py-2 text-sm">
                <p className="font-medium">{item.email}</p>
                <p className="mt-1">{item.body}</p>
                <p className="mt-1 text-muted">{item.status === "cho" ? "Đang chờ" : item.status === "mo" ? "Đã mở lại" : "Đã từ chối"}{item.reply ? ` · ${item.reply}` : ""}</p>
                {item.status === "cho" && roleAtLeast(role, "quan-ly") && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(() => replyAppeal({ data: { id: item.id, status: "mo", reply: "Đã mở lại tài khoản." } }), "Đã ghi là mở lại.")}>
                      Mở lại
                    </button>
                    <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(() => replyAppeal({ data: { id: item.id, status: "tu-choi", reply: "Chưa đủ lý do để mở." } }), "Đã từ chối.")}>
                      Từ chối
                    </button>
                  </div>
                )}
              </article>
            ))}
          </section>
          {roleAtLeast(role, "chu") && (
            <section className="space-y-2">
              <h2 className="font-semibold">Nhật ký</h2>
              {audit.length === 0 && <p className="text-sm text-muted">Chưa có thao tác.</p>}
              <ul className="space-y-1 text-sm text-muted">
                {audit.map((item) => (
                  <li key={item.id}>
                    {item.action} · {item.note}
                    {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString("vi-VN")}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {roleAtLeast(role, "chu") && (
            <form
              className="grid gap-2 rounded-2xl border border-line bg-card p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => setOwnerEmail({ data: ownerEmail }), "Đã đổi email Chủ. Email cũ không còn vào trang này.");
              }}
            >
              <h2 className="font-semibold">Email Chủ</h2>
              <p className="text-sm text-muted">Chỉ email này vào được trang Admin với quyền Chủ. Đổi xong, hãy đăng nhập bằng email mới.</p>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(event) => setOwnerEmailInput(event.target.value)}
                className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
              />
              <button type="submit" disabled={busy} className="min-tap w-fit rounded-full border border-line px-4 disabled:opacity-40">
                Lưu email Chủ
              </button>
            </form>
          )}
          {roleAtLeast(role, "chu") && <PaySettings />}
        </>
      )}
      {notice && <p className="text-sm text-muted">{notice}</p>}
    </div>
  );
}

function planLine(user: AdminUser) {
  if (!user.plan || !user.planUntil) return "Chưa mua gói. Hết hạn không phải bị khóa.";
  const until = new Date(user.planUntil);
  const name = ROOM_PLANS.find((plan) => plan.id === user.plan)?.name ?? user.plan;
  if (Number.isNaN(until.getTime())) return `Gói ${name}.`;
  if (until.getTime() <= Date.now()) return `Gói ${name} đã hết hạn. Hết hạn không phải bị khóa.`;
  return `Gói ${name} còn đến ${until.toLocaleString("vi-VN")}.`;
}

function foundNotice(query: string) {
  return query.trim() ? "Đã tìm." : "Đã tìm.";
}
