import { useEffect, useState } from "react";
import { openAdminPlace } from "@/lib/retry-load";
import { GlossaryBoard } from "@/components/glossary-board";
import { AffiliateBoard } from "@/components/affiliate-board";
import {
  escalateAppeal,
  getBadgeStyle,
  getDeskStats,
  getAdminLog,
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
  resetUserBalance,
  setUserBalance,
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
import { AdminBoot } from "@/components/admin-boot";
import { badgeStyle, type BadgeStyleId } from "@/lib/badge-styles";
import { MoneyBoard, OrgBoard } from "@/components/admin-company";
import { MailDesk } from "@/components/mail-desk";
import { QualityBoard } from "@/components/quality-board";
import { AdminOverview } from "@/components/admin-overview";
import { tabsFor, type AdminTab } from "@/lib/admin-tabs";
import { AdminNav } from "@/components/admin-nav";
import { AdminPalette } from "@/components/admin-palette";
import { Fold } from "@/components/admin-fold";
import { ThemeBoard } from "@/components/theme-board";
import { MailPolicyBoard } from "@/components/mail-policy";
import { PayQueue, PaySettings } from "@/components/pay-settings";
import { RunDeskBoard, TicketCard } from "@/components/run-desk-board";
import { maskFileName } from "@/lib/mask-file-name";
import { AlibabaKeyBoard } from "@/components/alibaba-key-board";
import { ServicePackBoard } from "@/components/service-pack-board";
import { RentShowBoard } from "@/components/rent-show-board";
import { pushToast } from "@/components/toast";
import { ConfirmCodeDialog, ConfirmDialog } from "@/components/confirm-code";
import { formatMoney, parseMoney } from "@/lib/money-format";
import { listUserRuns, refundRun, releaseRunHold, type RunTicket } from "@/lib/admin-room";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

function AppealForm({
  item,
  role,
  busy,
  run,
}: {
  item: AppealRow;
  role: NonNullable<MyPlace["role"]>;
  busy: boolean;
  run: (task: () => Promise<unknown>, done: string) => Promise<void>;
}) {
  const [replyText, setReplyText] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const dot = item.tone === "red" ? "#e15b64" : item.tone === "yellow" ? "#e0a100" : "#2f9e6b";
  return (
    <div className="mt-2 grid gap-2">
      <p className="text-xs" style={{ color: dot }}>
        {item.waitLabel}
      </p>
      <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={2} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" placeholder="Câu trả lời gửi cho khách" />
      <div className="flex flex-wrap gap-2">
        {["Lần này trừ đúng số phút đã chạy. Đơn giá là giá tại lúc bấm chạy.", "Phần giữ thừa đã trả vào số dư.", "Đoạn lỗi không tính tiền.", "Tệp không còn trên phòng. Hãy chọn lại tệp trên máy nếu muốn chạy tiếp.", "Cửa trả theo lượt đang đóng. Key của bạn vẫn dùng được."].map((line) => (
          <button key={line} type="button" className="rounded-full border border-line px-3 py-1 text-left text-xs" onClick={() => setReplyText(line)}>
            {line}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {mayReply(role, item.holdRole) && (
          <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(async () => { await sendAppealReply({ data: { id: item.id, reply: replyText } }); setReplyText(""); }, "Đã trả lời và đóng yêu cầu.")}>
            Trả lời
          </button>
        )}
        {role !== "chu" && (
          <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(() => escalateAppeal({ data: item.id }), "Đã báo cấp trên. Yêu cầu vẫn mở.")}>
            Báo cấp trên
          </button>
        )}
        {canSkipToOwner(new Date(item.touchedAt).getTime(), Date.now(), item.holdRole) && (
          <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(() => skipAppeal({ data: item.id }), "Đã báo Chủ.")}>
            Báo Chủ
          </button>
        )}
        {roleAtLeast(role, "quan-ly") && mayReply(role, item.holdRole) && (
          <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void run(() => replyAppeal({ data: { id: item.id, status: "mo", reply: replyText || "Đã mở lại tài khoản." } }), "Đã mở lại và đóng yêu cầu.")}>
            Mở lại
          </button>
        )}
      </div>
      {roleAtLeast(role, "quan-ly") && mayReply(role, item.holdRole) && (
        <div className="grid gap-2">
          <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={2} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" placeholder="Lý do từ chối, bắt buộc" />
          <button type="button" disabled={rejectReason.trim().length < 8} className="min-tap w-fit rounded-full border border-line px-3 disabled:opacity-40" onClick={() => void run(async () => { await replyAppeal({ data: { id: item.id, status: "tu-choi", reply: rejectReason.trim() } }); setRejectReason(""); }, "Đã từ chối và gửi lý do cho khách.")}>
            Từ chối
          </button>
        </div>
      )}
    </div>
  );
}

function mayReply(role: string, hold: string) {
  if (role === "chu") return true;
  if (role === "quan-ly") return hold === "quan-ly";
  return hold === "ho-tro";
}

function AdminNotes() {
  const [rows, setRows] = useState<{ version: string; time: string; area: string; text: string }[]>([]);
  useEffect(() => {
    void getAdminLog()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  return (
    <section className="admin-wide space-y-3">
      <h2 className="font-semibold">Nhật ký nội bộ</h2>
      {rows.length === 0 && <p className="text-sm text-muted">Chưa có dòng nội bộ.</p>}
      <div className="plan-grid">
        {rows.map((row) => (
          <article key={`${row.version}-${row.area}`} className="rounded-xl border border-line px-3 py-2 text-sm">
            <p className="font-medium text-accent">v{row.version}</p>
            <p className="text-xs text-muted">{row.time}</p>
            <p className="mt-1">{row.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AdminDesk() {
  const [place, setPlace] = useState<MyPlace | null>(null);
  const [stats, setStats] = useState<DeskStats | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [picked, setPicked] = useState<AdminUser | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [runs, setRuns] = useState<RunTicket[]>([]);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [balanceEdit, setBalanceEdit] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [ownerEmail, setOwnerEmailInput] = useState("");
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [badge, setBadge] = useState<BadgeStyleId>("ribbon");
  const [tab, setTab] = useState<AdminTab>("tong-quan");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(true);
  const [resetCode, setResetCode] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [booting, setBooting] = useState(true);

  async function refreshPlace() {
    const next = await openAdminPlace(() => getMyPlace());
    setPlace(next);
    setBooting(false);
    if (!next.role) return;
    const [statsNext, appealsNext, auditNext, badgeNext] = await Promise.all([
      openAdminPlace(() => getDeskStats()).catch(() => null),
      openAdminPlace(() => listAppeals()).catch(() => [] as AppealRow[]),
      openAdminPlace(() => listAudit()).catch(() => [] as AuditRow[]),
      openAdminPlace(() => getBadgeStyle()).then(badgeStyle).catch(() => null),
    ]);
    if (statsNext) setStats(statsNext);
    setAppeals(appealsNext);
    setAudit(auditNext);
    if (badgeNext) setBadge(badgeNext);
  }

  useEffect(() => {
    setBooting(true);
    void refreshPlace().catch((error) => {
      setBooting(false);
      const message = error instanceof Error ? error.message : "";
      setNotice(message === "Unauthorized" ? "Hãy đăng nhập bằng email Chủ, rồi mở lại trang này." : message || "Hãy đăng nhập bằng email Chủ, rồi mở lại trang này.");
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
    function onOpenUser(event: Event) {
      const email = (event as CustomEvent<string>).detail;
      if (!email) return;
      void openByEmail(email).catch(() => undefined);
    }
    function flash(el: Element | null) {
      if (!(el instanceof HTMLElement)) return;
      el.classList.add("pay-flash");
      window.setTimeout(() => el.classList.remove("pay-flash"), 2500);
    }
    function onOpenPay(event: Event) {
      const detail = (event as CustomEvent<{ code?: string; email?: string }>).detail;
      setTab("viec");
      window.setTimeout(() => {
        const code = detail?.code ?? "";
        const el = code ? document.querySelector(`[data-pay-code="${CSS.escape(code)}"]`) : document.querySelector("[data-pay-queue]");
        (el ?? document.querySelector("[data-pay-queue]"))?.scrollIntoView({ behavior: "smooth", block: "center" });
        flash(el);
      }, 300);
    }
    function onOpenAppeal(event: Event) {
      const detail = (event as CustomEvent<{ id?: number; email?: string }>).detail;
      setTab("viec");
      window.setTimeout(() => {
        const el = detail?.id
          ? document.querySelector(`[data-appeal-id="${detail.id}"]`)
          : detail?.email
            ? document.querySelector("[data-appeals]")
            : null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        flash(el);
        if (!detail?.id && detail?.email) void openByEmail(detail.email).catch(() => undefined);
      }, 300);
    }
    window.addEventListener("tyzo-open-user", onOpenUser);
    window.addEventListener("tyzo-open-pay", onOpenPay);
    window.addEventListener("tyzo-open-appeal", onOpenAppeal);
    return () => {
      window.removeEventListener("tyzo-open-user", onOpenUser);
      window.removeEventListener("tyzo-open-pay", onOpenPay);
      window.removeEventListener("tyzo-open-appeal", onOpenAppeal);
    };
  }, []);

  if (!place) return <AdminBoot trying={booting} notice={notice} />;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2">
      {role ? (
        <div className="pb-2">
          <RoleChip role={role} />
        </div>
      ) : (
        <p className="text-sm text-muted">Không có quyền vào trang này. Tài khoản đang đăng nhập chưa được cấp Chủ, Quản lý hoặc Hỗ trợ.</p>
      )}
      {role && <AdminPalette tabs={tabsFor(role)} open={paletteOpen} onOpenChange={setPaletteOpen} onPick={setTab} />}
      <div className="lg:flex lg:items-start lg:gap-4">
      {role && <AdminNav tabs={tabsFor(role)} current={tab} onPick={setTab} onSearch={() => setPaletteOpen(true)} />}
      <div className="min-w-0 flex-1">
      <div className="admin-grid">
      {role && tab === "tong-quan" && <AdminOverview owner={role === "chu"} onGo={setTab} />}
      {role && tab === "thao-tac" && <AuditTab rows={audit} />}
      {role && tab === "viec" && <RunDeskBoard owner={role === "chu"} />}
      {role === "chu" && tab === "cau-hinh" && (
        <>
          <RunDeskBoard owner part="config" />
          <AlibabaKeyBoard />
          <Fold title="Gói dịch" hint="Mỗi việc chọn một nhà và một model">
            <ServicePackBoard packsOnly />
          </Fold>
          <Fold title="Model khách được chọn khi thuê phòng" hint="Khách dùng key của họ">
            <RentShowBoard />
          </Fold>
          <Fold title="Cổng nạp" hint="Sepay, Casso và tài khoản nhận tiền">
            <PaySettings />
          </Fold>
        </>
      )}
      {role && tab === "so-do" && <OrgBoard owner={role === "chu"} />}
      {role && tab === "tien" && <MoneyBoard owner={role === "chu"} />}
      {role && tab === "nhat-ky" && <AdminNotes />}
      {role === "chu" && tab === "chat-luong" && <QualityBoard />}
      {role === "chu" && tab === "thuat-ngu" && <GlossaryBoard />}
      {role === "chu" && tab === "ctv" && <AffiliateBoard />}
      {role === "chu" && tab === "giao-dien" && <ThemeBoard />}
      {role === "chu" && tab === "thu" && (
        <div className="admin-grid admin-wide">
          <MailDesk />
          <MailPolicyBoard />
        </div>
      )}
      {role && tab === "viec" && stats && (
        <section className="admin-wide admin-stats">
          <div className="grid content-start gap-2">
          <h2 className="text-sm font-semibold">Phòng</h2>
          <div className="stat-grid">
            <Stat label="Đang online" value={stats.online} hint="3 phút qua" tone="online" />
            <Stat label="Tổng đăng ký" value={stats.users} />
            <Stat label="Đăng ký 24 giờ" value={stats.joinedDay} />
            <Stat label="Đang thuê" value={stats.renting} tone="rent" />
            <Stat label="Quản lý" value={stats.managers} tone="lead" />
            <Stat label="Hỗ trợ" value={stats.support} tone="staff" />
            <Stat label="Cộng tác viên" value={stats.partners} tone="partner" />
          </div>
          </div>
          <div className="grid content-start gap-2">
          <h2 className="text-sm font-semibold">Gói và việc</h2>
          <div className="stat-grid">
            <Stat label="Còn lượt thử" value={stats.trial} tone="trial" />
            <Stat label="Gói hết hạn" value={stats.expired} />
            <Stat label="Đang khóa" value={stats.locked} tone="lock" />
            <Stat label="Đang cấm" value={stats.banned} tone="ban" />
            <Stat label="Yêu cầu chờ" value={stats.waiting} tone="wait" />
          </div>
          </div>
        </section>
      )}
      {role && tab === "viec" && (
        <>
          <div className="admin-wide admin-split">
          <h2 className="admin-span font-semibold">Tài khoản</h2>
          <p className="admin-span text-sm text-muted">Tìm email, xem sổ tiền và hạn gói, ghi chú, đặt mật khẩu tạm. Quản lý thì khóa hoặc mở hạn. Chỉ Chủ được cấm.</p>
          <div className="admin-find">
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
                    setBalanceEdit(formatMoney(user.balance ?? 0));
                    setLedger([]);
                    setRuns([]);
                    void listUserLedger({ data: user.id }).then(setLedger).catch(() => setLedger([]));
                    void listUserRuns({ data: user.id }).then(setRuns).catch(() => setRuns([]));
                  }}
                >
                  <span className="block font-medium">{user.email}</span>
                  <span className="text-sm text-muted">
                    {user.name} · {user.status === "open" ? "Đang mở" : user.status === "locked" ? "Đang khóa" : "Đang cấm"}
                    {user.role ? ` · ${ROLE_LABEL[user.role]}` : ""}
                    {user.partner ? " · Cộng tác" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          </div>
          {picked && (
            <AccountCard rank={picked.role} extra={picked.partner ? ["ctv"] : []} styleId={badge} className="admin-detail">
              <h2 className="admin-span font-semibold">{picked.email}</h2>
              <p className="admin-span text-sm text-muted">
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
              <div>
                <h3 className="text-sm font-semibold">Phiếu trả theo lượt</h3>
                {runs.length === 0 && <p className="text-sm text-muted">Chưa có phiếu.</p>}
                <ul className="mt-1 space-y-2 text-sm">
                  {runs.map((ticket) => (
                    <li key={ticket.id}>
                      <TicketCard ticket={ticket}>
                      {roleAtLeast(role, "quan-ly") && ticket.status === "dang-giu" && ticket.held > 0 && (
                        <button
                          type="button"
                          disabled={busy}
                          className="mt-2 min-tap rounded-full border border-line px-3 disabled:opacity-40"
                          onClick={() =>
                            void run(async () => {
                              await releaseRunHold({ data: ticket.id });
                              setRuns(await listUserRuns({ data: picked.id }));
                            }, "Đã nhả khoản đang giữ vào ví.")
                          }
                        >
                          Nhả khoản giữ
                        </button>
                      )}
                      </TicketCard>
                    </li>
                  ))}
                </ul>
                {roleAtLeast(role, "quan-ly") && runs.some((ticket) => ticket.charged > ticket.refunded) && (
                  <div className="mt-2 grid gap-2">
                    <input value={refundAmount} onChange={(event) => setRefundAmount(formatMoney(parseMoney(event.target.value)))} inputMode="numeric" placeholder="Số hoàn, đồng" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
                    <input value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="Lý do hoàn, ít nhất 8 ký tự" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
                    {runs
                      .filter((ticket) => ticket.charged > ticket.refunded)
                      .map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          disabled={busy || refundReason.trim().length < 8}
                          className="min-tap rounded-full border border-line px-3 text-left disabled:opacity-40"
                          onClick={() =>
                            void run(async () => {
                              await refundRun({ data: { id: ticket.id, amount: parseMoney(refundAmount), reason: refundReason.trim() } });
                              setRefundAmount("");
                              setRefundReason("");
                              setRuns(await listUserRuns({ data: picked.id }));
                            }, "Đã hoàn vào ví.")
                          }
                        >
                          Hoàn phiếu {maskFileName(ticket.fileName) || ticket.id}
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="admin-pane">
              <label className="grid gap-1 text-sm">
                Ghi chú nội bộ
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" />
              </label>
              <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => saveStaffNote({ data: { userId: picked.id, note } }), "Đã lưu ghi chú.")}>
                Lưu ghi chú
              </button>
              </div>
              {roleAtLeast(role, "quan-ly") && (
                <>
                  <div className="admin-pane">
                  <label className="grid gap-1 text-sm">
                    Mật khẩu tạm
                    <input value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
                  </label>
                  <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void run(() => setTempPassword({ data: { userId: picked.id, password } }), "Đã đặt mật khẩu tạm. Hãy gửi cho họ.")}>
                    Đặt mật khẩu tạm
                  </button>
                  </div>
                  <div className="admin-pane">
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
                  {role === "chu" && (
                  <div>
                    <button type="button" className="text-sm text-muted underline" onClick={() => setPriceOpen((v) => !v)}>
                      {priceOpen ? "Ẩn giá biểu gói" : "Hiện giá biểu gói"}
                    </button>
                    {priceOpen && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ROOM_PLANS.map((plan) => (
                          <button key={plan.id} type="button" disabled={busy} className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" onClick={() => void run(() => grantPlan({ data: { userId: picked.id, planId: plan.id } }), `Đã mở gói ${plan.name}.`)}>
                            Mở {plan.name} · {formatMoney(plan.price)} đ
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                  </div>
                  {roleAtLeast(role, "chu") && (
                    <div className="admin-pane">
                      <label className="grid gap-1 text-sm">
                        Số dư (đồng)
                        <input
                          value={balanceEdit}
                          onChange={(event) => setBalanceEdit(formatMoney(parseMoney(event.target.value)))}
                          inputMode="numeric"
                          className="rounded-xl border border-line bg-raised px-3 py-3 outline-none"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busy}
                        className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40"
                        onClick={() => {
                          const value = Math.round(parseMoney(balanceEdit || "0"));
                          if (!Number.isFinite(value) || value < 0) {
                            setNotice("Số dư phải từ 0 trở lên.");
                            return;
                          }
                          void run(async () => {
                            await setUserBalance({ data: { userId: picked.id, balance: value } });
                            const found = await searchUsers({ data: picked.email });
                            const next = found.find((item) => item.id === picked.id);
                            if (next) {
                              setPicked(next);
                              setBalanceEdit(formatMoney(next.balance ?? 0));
                            }
                            setLedger(await listUserLedger({ data: picked.id }));
                          }, "Đã cập nhật số dư.");
                        }}
                      >
                        Lưu số dư
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="min-tap rounded-full border border-danger px-4 text-sm text-danger disabled:opacity-40"
                        onClick={() => {
                          const code = Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
                          setResetCode(code);
                          setResetOpen(true);
                        }}
                      >
                        Reset số dư về 0
                      </button>
                    </div>
                  )}
                </>
              )}
              {roleAtLeast(role, "chu") && picked.role !== "chu" && (
                <div className="admin-span flex flex-wrap gap-2">
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
                    onClick={() => setDropOpen(true)}
                  >
                    Xóa tài khoản
                  </button>
                </div>
              )}
            </AccountCard>
          )}
          </div>
          {role === "chu" && (
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
          <section className="space-y-2" data-appeals>
            <h2 className="font-semibold">Yêu cầu</h2>
            {appeals.length === 0 && <p className="text-sm text-muted">Chưa có yêu cầu ở cấp của bạn.</p>}
            {appeals.map((item) => (
              <article key={item.id} data-appeal-id={item.id} className={"rounded-xl border border-line px-3 py-2 text-sm" + (role === "chu" && item.holdRole !== "chu" ? " opacity-70" : "")}>
                <button type="button" className="w-full text-left" onClick={() => void openByEmail(item.email)}>
                  <span className="block font-medium">{item.email}</span>
                  <span className="mt-1 block">{item.body}</span>
                  <span className="mt-1 block text-muted">
                    {item.status === "cho" ? "Đang chờ" : item.status === "mo" ? "Đã mở lại" : "Đã từ chối"}
                    {item.reply ? ` · ${item.reply}` : ""} · {ROLE_LABEL[item.holdRole as "ho-tro"] || "Hỗ trợ"}
                  </span>
                </button>
                {item.status === "cho" && role && <AppealForm item={item} role={role} busy={busy} run={run} />}
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
          {roleAtLeast(role, "quan-ly") && <div data-pay-queue><PayQueue owner={role === "chu"} /></div>}
        </>
      )}
      </div>
      </div>
      </div>

      <ConfirmCodeDialog
        open={resetOpen}
        title="Reset số dư về 0"
        message={`Đưa số dư và sổ tiền của ${picked?.email ?? ""} về 0? Việc này không hoàn lại.`}
        code={resetCode}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          setResetOpen(false);
          if (!picked) return;
          void run(async () => {
            await resetUserBalance({ data: picked.id });
            setLedger([]);
            setBalanceEdit(formatMoney(0));
            const found = await searchUsers({ data: picked.email });
            const next = found.find((item) => item.id === picked.id);
            if (next) setPicked(next);
          }, "Đã đưa số dư về 0.");
        }}
      />
      <ConfirmDialog
        open={dropOpen}
        title="Xóa tài khoản"
        message={`Xóa tài khoản ${picked?.email ?? ""}? Việc này không hoàn lại.`}
        confirmLabel="Xóa"
        danger
        onCancel={() => setDropOpen(false)}
        onConfirm={() => {
          setDropOpen(false);
          if (!picked) return;
          void run(async () => {
            await removeUser({ data: picked.id });
            setUsers((list) => list.filter((item) => item.id !== picked.id));
            setPicked(null);
          }, "Đã xóa tài khoản.");
        }}
      />
    </div>
  );
}

function RoleChip({ role }: { role: "ho-tro" | "quan-ly" | "chu" }) {
  return <p className={"role-chip role-" + role}>{ROLE_LABEL[role]}</p>;
}

const AUDIT_ACTION_LABEL: Record<string, string> = {
  "gia-luot": "Đổi giá trả theo lượt",
  "dong-cua-luot": "Đóng cửa trả theo lượt",
  "mo-cua-luot": "Mở cửa trả theo lượt",
  "gia-alibaba": "Đổi giá Alibaba",
  "mo-thue": "Đổi danh sách model cho thuê",
  "goi-dich": "Sửa gói dịch",
  "them-cong-tac": "Thêm cộng tác",
  "go-cong-tac": "Gỡ cộng tác",
  "doi-quyen": "Đổi quyền cộng tác",
  "nha-giu": "Nhả khoản giữ phiếu",
  "hoan-vi": "Hoàn tiền vào ví",
  "key-phong": "Đổi key Groq của phòng",
  "key-model": "Đồng bộ model của key",
  "key-alibaba": "Đổi key Alibaba",
  "giao-dien": "Công bố giao diện",
  "reset-so-du": "Reset số dư",
  "reset-tien-test": "Reset tiền thử",
  "dat-so-du": "Đặt số dư",
  "mo-goi": "Cấp gói",
  "chi-phi": "Thêm chi phí",
  "sua-chi-phi": "Sửa chi phí",
  "xoa-chi-phi": "Xóa chi phí",
  "uoc-gia-von": "Ước giá vốn phiếu cũ",
  "doi-nguong-chat-luong": "Đổi ngưỡng chất lượng",
  "doi-email-chu": "Đổi email Chủ",
  "doi-the-quyen": "Đổi thẻ quyền",
  "mat-khau-tam": "Đặt mật khẩu tạm",
  "xoa-tai-khoan": "Xóa tài khoản",
  "tra-loi": "Trả lời yêu cầu",
  "bao-cap": "Báo cấp trên",
  "bao-chu": "Báo Chủ",
};

function logLine(item: AuditRow) {
  const time = item.createdAt ? new Date(item.createdAt) : null;
  const clock = time && !Number.isNaN(time.getTime())
    ? time.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })
    : "";
  const rank = item.actorRole === "ho-tro" || item.actorRole === "quan-ly" || item.actorRole === "chu" ? ROLE_LABEL[item.actorRole] : "Người dùng";
  return [clock, rank, item.actorEmail, AUDIT_ACTION_LABEL[item.action] ?? item.action, item.targetEmail, item.note].filter(Boolean).join(" · ");
}

/** Nhật ký thao tác của nhân sự: ai, lúc nào, làm gì, giá trị cũ → mới (nằm trong phần ghi chú). Có lọc theo hành động và tìm chữ. */
function AuditTab({ rows }: { rows: AuditRow[] }) {
  const [action, setAction] = useState("");
  const [text, setText] = useState("");
  const kinds = [...new Set(rows.map((row) => row.action))].sort();
  const needle = text.trim().toLowerCase();
  const shown = rows.filter((row) => (!action || row.action === action) && (!needle || logLine(row).toLowerCase().includes(needle)));
  return (
    <section className="admin-wide space-y-3">
      <h2 className="font-semibold">Nhật ký thao tác</h2>
      <p className="text-sm text-muted">Ai làm, lúc nào, đổi gì. Giá trị cũ và mới nằm ở cuối mỗi dòng. Bạn chỉ thấy thao tác của cấp thấp hơn mình{rows.length ? `. Đang có ${rows.length} dòng gần nhất.` : "."}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder="Tìm theo email, hành động hoặc nội dung" aria-label="Tìm trong nhật ký thao tác" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none" />
        <select value={action} onChange={(event) => setAction(event.target.value)} aria-label="Lọc theo hành động" className="rounded-xl border border-line bg-raised px-3 py-3 outline-none">
          <option value="">Mọi hành động</option>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {AUDIT_ACTION_LABEL[kind] ?? kind}
            </option>
          ))}
        </select>
      </div>
      {shown.length === 0 && <p className="text-sm text-muted">{rows.length ? "Không có dòng khớp." : "Chưa có thao tác ở cấp bạn được xem."}</p>}
      <div className="grid gap-2">
        {shown.map((item) => (
          <article key={item.id} className="rounded-xl border border-line px-3 py-2 text-sm">
            <p className="font-medium">{AUDIT_ACTION_LABEL[item.action] ?? item.action}</p>
            <p className="text-xs text-muted">
              {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : ""} · {item.actorRole === "ho-tro" || item.actorRole === "quan-ly" || item.actorRole === "chu" ? ROLE_LABEL[item.actorRole] : "Người dùng"} · {item.actorEmail || "Không rõ"}
              {item.targetEmail ? ` → ${item.targetEmail}` : ""}
            </p>
            {item.note && <p className="mt-1 break-words text-muted">{item.note}</p>}
          </article>
        ))}
      </div>
    </section>
  );
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
  if (Number.isNaN(until.getTime())) return `Gói ${name}.`;
  if (until.getTime() <= Date.now()) return `Gói ${name} đã hết hạn. Hết hạn không phải bị khóa.`;
  return `Gói ${name} còn đến ${until.toLocaleString("vi-VN")}.`;
}

function foundNotice(query: string) {
  const text = query.trim();
  return text ? `Đã tìm «${text}».` : "Đã tìm toàn bộ.";
}
