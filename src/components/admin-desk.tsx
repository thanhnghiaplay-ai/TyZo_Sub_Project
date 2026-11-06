import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  escalateAppeal,
  getBadgeStyle,
  getDeskStats,
  getMyPlace,
  grantPlan,
  listAppeals,
  listAudit,
  removeUser,
  replyAppeal,
  saveStaffNote,
  searchUsers,
  sendAppealReply,
  skipAppeal,
  listUserLedger,
  setBadgeStyle,
  setOwnerEmail,
  setStaffRole,
  setTempPassword,
  setUserStatus,
  type AdminUser,
  type AppealRow,
  type AuditRow,
  type DeskStats,
  type LedgerRow,
  type MyPlace,
} from "@/lib/admin-room";
import { ROOM_PLANS } from "@/lib/room-plans";
import { canSkipToOwner, ROLE_LABEL, roleAtLeast } from "@/lib/staff-role";
import { BadgeBoard } from "@/components/badge-board";
import { AccountCard } from "@/components/role-mark";
import { BrandMark } from "@/components/brand-mark";
import { badgeStyle, type BadgeStyleId } from "@/lib/badge-styles";
import { MoneyBoard, OrgBoard } from "@/components/admin-company";
import { PaySettings } from "@/components/pay-settings";
import { pushToast } from "@/components/toast";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function AdminDesk() {
  const [place, setPlace] = useState<MyPlace | null>(null);
  const [stats, setStats] = useState<DeskStats | null>(null);
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
  const [badge, setBadge] = useState<BadgeStyleId>("ribbon");
  const [tab, setTab] = useState<"viec" | "so-do" | "tien">("viec");
  const [replyText, setReplyText] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  async function refreshPlace() {
    const next = await getMyPlace();
    setPlace(next);
    if (next.role) {
      setStats(await getDeskStats());
      setAppeals(await listAppeals());
      setAudit(await listAudit());
      setBadge(badgeStyle(await getBadgeStyle()));
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

  useEffect(() => {
    if (!notice || !place) return;
    pushToast(notice, /chưa|không|hãy|lỗi/i.test(notice) ? "bad" : "ok");
    setNotice(null);
  }, [notice, place]);

  async function run(task: () => Promise<unknown>, done: string) {
    setBusy(true);
    setNotice(null);
    try {
      await task();
      setNotice(done);
      if (place?.role) {
        setStats(await getDeskStats());
        setAppeals(await listAppeals());
        setAudit(await listAudit());
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thực hiện được.");
    } finally {
      setBusy(false);
    }
  }

  const role = place?.role ?? null;

  async function openByEmail(email: string) {
    const found = await searchUsers({ data: email });
    setUsers(found);
    const user = found.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? found[0];
    if (!user) return;
    setPicked(user);
    setNote(user.note);
    setReason(user.reason);
    setLedger(await listUserLedger({ data: user.id }));
    setTab("viec");
  }

  useEffect(() => {
    function onOpen(event: Event) {
      const email = (event as CustomEvent<string>).detail;
      if (!email) return;
      void openByEmail(email).catch(() => undefined);
    }
    window.addEventListener("tyzo-open-user", onOpen);
    return () => window.removeEventListener("tyzo-open-user", onOpen);
  }, []);

  if (!place) {
    return (
      <div className="admin-boot">
        <BrandMark small title="TyZo Sub" />
        <p className="text-sm text-muted">Đang mở trang Admin</p>
        {notice && (
          <Link to="/login" className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink">
            Đăng nhập
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2">
      {role ? (
        <div className="pb-2">
          <RoleChip role={role} />
        </div>
      ) : (
        <p className="text-sm text-muted">Không có quyền vào trang này.</p>
      )}
      {role && (
        <div className="flex gap-2">
          <TabButton current={tab} id="viec" onPick={setTab}>Việc</TabButton>
          <TabButton current={tab} id="so-do" onPick={setTab}>Sơ đồ</TabButton>
          <TabButton current={tab} id="tien" onPick={setTab}>Doanh thu</TabButton>
        </div>
      )}
      {role && tab === "so-do" && <OrgBoard owner={role === "chu"} />}
      {role && tab === "tien" && <MoneyBoard owner={role === "chu"} />}
      {role && tab === "viec" && stats && (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold">Phòng</h2>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Đang online" value={stats.online} hint="3 phút qua" tone="online" />
            <Stat label="Tổng đăng ký" value={stats.users} />
            <Stat label="Đăng ký 24 giờ" value={stats.joinedDay} />
            <Stat label="Đang thuê" value={stats.renting} tone="rent" />
            <Stat label="Quản lý" value={stats.managers} tone="lead" />
            <Stat label="Hỗ trợ" value={stats.support} tone="staff" />
          </div>
          <h2 className="mt-2 text-sm font-semibold">Gói và việc</h2>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Còn lượt thử" value={stats.trial} tone="trial" />
            <Stat label="Gói hết hạn" value={stats.expired} />
            <Stat label="Đang khóa" value={stats.locked} tone="lock" />
            <Stat label="Đang cấm" value={stats.banned} tone="ban" />
            <Stat label="Yêu cầu chờ" value={stats.waiting} tone="wait" />
          </div>
        </section>
      )}
      {role === "chu" && tab === "viec" && (
        <BadgeBoard
          current={badge}
          busy={busy}
          onPick={(id) => {
            void run(async () => {
              await setBadgeStyle({ data: id });
              setBadge(id);
            }, "Đã đổi kiểu thẻ quyền.");
          }}
        />
      )}
      {role && tab === "viec" && (
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
            <AccountCard rank={picked.role} styleId={badge} className="space-y-3">
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
              {roleAtLeast(role, "quan-ly") && (
                <>
                  <label className="grid gap-1 text-sm">
                    Mật khẩu tạm
                    <input value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
                  </label>
                  <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => setTempPassword({ data: { userId: picked.id, password } }), "Đã đặt mật khẩu tạm. Hãy gửi cho họ.")}> 
                    Đặt mật khẩu tạm
                  </button>
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
            </AccountCard>
          )}
          <section className="space-y-2">
            <h2 className="font-semibold">Yêu cầu</h2>
            {appeals.length === 0 && <p className="text-sm text-muted">Chưa có yêu cầu ở cấp của bạn.</p>}
            {appeals.map((item) => (
              <article key={item.id} className="rounded-xl border border-line px-3 py-2 text-sm">
                <button type="button" className="w-full text-left" onClick={() => void openByEmail(item.email)}>
                  <span className="block font-medium">{item.email}</span>
                  <span className="mt-1 block">{item.body}</span>
                  <span className="mt-1 block text-muted">
                    {item.status === "cho" ? "Đang chờ" : item.status === "mo" ? "Đã mở lại" : "Đã từ chối"}
                    {item.reply ? ` · ${item.reply}` : ""} · {ROLE_LABEL[item.holdRole as "ho-tro"] || "Hỗ trợ"}
                  </span>
                </button>
                {item.status === "cho" && (
                  <div className="mt-2 grid gap-2">
                    <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={2} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" placeholder="Câu trả lời gửi cho khách" />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(async () => { await sendAppealReply({ data: { id: item.id, reply: replyText } }); setReplyText(""); }, "Đã trả lời và đóng yêu cầu.")}>
                        Trả lời
                      </button>
                      <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(() => escalateAppeal({ data: item.id }), "Đã báo cấp trên. Yêu cầu vẫn mở.")}>
                        Báo cấp trên
                      </button>
                      {canSkipToOwner(new Date(item.touchedAt).getTime(), Date.now(), item.holdRole) && (
                        <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(() => skipAppeal({ data: item.id }), "Đã báo Chủ.")}>
                          Báo Chủ
                        </button>
                      )}
                      {roleAtLeast(role, "quan-ly") && (
                        <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(() => replyAppeal({ data: { id: item.id, status: "mo", reply: replyText || "Đã mở lại tài khoản." } }), "Đã mở lại và đóng yêu cầu.")}>
                          Mở lại
                        </button>
                      )}
                    </div>
                    {roleAtLeast(role, "quan-ly") && (
                      <div className="grid gap-2">
                        <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={2} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" placeholder="Lý do từ chối, bắt buộc" />
                        <button
                          type="button"
                          disabled={rejectReason.trim().length < 8}
                          className="min-tap w-fit rounded-full border border-line px-3 disabled:opacity-40"
                          onClick={() => void run(async () => { await replyAppeal({ data: { id: item.id, status: "tu-choi", reply: rejectReason.trim() } }); setRejectReason(""); }, "Đã từ chối và gửi lý do cho khách.")}
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </section>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Lịch sử</h2>
              {audit.length > 6 && (
                <button type="button" className="min-tap rounded-full border border-line px-3 text-sm" onClick={() => setAuditOpen((value) => !value)}>
                  {auditOpen ? "Thu gọn" : `Xem thêm ${audit.length - 6}`}
                </button>
              )}
            </div>
            {audit.length === 0 && <p className="text-sm text-muted">Chưa có thao tác ở cấp bạn được xem.</p>}
            <ul className="max-h-52 space-y-1 overflow-y-auto text-sm text-muted">
              {(auditOpen ? audit.slice(0, 24) : audit.slice(0, 6)).map((item) => (
                <li key={item.id}>{logLine(item)}</li>
              ))}
            </ul>
          </section>
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
    </div>
  );
}

function RoleChip({ role }: { role: "ho-tro" | "quan-ly" | "chu" }) {
  return <p className={"role-chip role-" + role}>{ROLE_LABEL[role]}</p>;
}

function TabButton({
  current,
  id,
  onPick,
  children,
}: {
  current: string;
  id: "viec" | "so-do" | "tien";
  onPick: (id: "viec" | "so-do" | "tien") => void;
  children: string;
}) {
  return (
    <button type="button" className={"min-tap rounded-full px-3 text-sm " + (current === id ? "bg-accent font-semibold text-ink" : "border border-line")} onClick={() => onPick(id)}>
      {children}
    </button>
  );
}

function logLine(item: AuditRow) {
  const time = item.createdAt ? new Date(item.createdAt) : null;
  const clock = time && !Number.isNaN(time.getTime())
    ? time.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })
    : "";
  const rank = item.actorRole === "ho-tro" || item.actorRole === "quan-ly" || item.actorRole === "chu" ? ROLE_LABEL[item.actorRole] : "Người dùng";
  return [clock, rank, item.actorEmail, item.action, item.targetEmail, item.note].filter(Boolean).join(" · ");
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: string }) {
  return (
    <article className={"rounded-xl border border-line bg-card px-3 py-2" + (tone ? " stat-" + tone : "")}>
      <p className="text-xs text-muted">{label}</p>
      <p key={value} className="stat-num text-xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </article>
  );
}

function planLine(user: AdminUser) {
  if (!user.plan || !user.planUntil) return "Chưa mua gói. Hết hạn không phải bị khóa.";
  const until = new Date(user.planUntil);
  const name = ROOM_PLANS.find((plan) => plan.id === user.plan)?.name ?? user.plan;
  if (Number.isNaN(until.getTime())) return `Đã gói ${name}.`;
  if (until.getTime() <= Date.now()) return `Đã gói ${name} đã hết hạn. Hết hạn không phải bị khóa.`;
  return `Đã gói ${name} còn đến ${until.toLocaleString("vi-VN")}.`;
}

function foundNotice(query: string) {
  return query.trim() ? "Đã tìm." : "Đã tìm.";
}
