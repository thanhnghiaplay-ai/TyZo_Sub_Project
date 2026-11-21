import { dong } from "@/lib/money-format";
import { Link } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { readPayChoice, type PayChoice } from "@/lib/pay-status";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getBadgeStyle, getMyPlace, listOwnAppeals, skipAppeal, submitAppeal, type MyPlace } from "@/lib/admin-room";
import { AccountCard } from "@/components/role-mark";
import type { BadgeStyleId } from "@/lib/badge-styles";
import { canSkipToOwner } from "@/lib/staff-role";
import { deviceId } from "@/lib/device-id";
import { orderRoomPlan, claimTrialDevice, getRoomAccount, type RoomState } from "@/lib/room-account";
import { roomAccess } from "@/lib/room-plans";
import { useRoomPlans } from "@/lib/use-room-plans";
import { GiayShelf } from "@/components/giay-shelf";
import { PaySlip } from "@/components/pay-slip";
import type { PayOrderView } from "@/lib/pay-store";
import { formatGiay } from "@/lib/token-math";
import { ledgerRows } from "@/lib/ledger-view";
import { DoorDot, RunDoorClosed, useRunDoor } from "@/components/run-door";
import { myAffiliate } from "@/lib/affiliate-room";
import { pushToast } from "@/components/toast";

export function AccountPanel() {
  const plans = useRoomPlans();
  const { user, isPending } = useCurrentUserState();
  const [state, setState] = useState<RoomState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [name, setName] = useState("");
  const [place, setPlace] = useState<MyPlace | null>(null);
  const [partner, setPartner] = useState(false);
  const [badge, setBadge] = useState<BadgeStyleId>("ribbon");
  const [appeal, setAppeal] = useState("");
  const [ownAppeals, setOwnAppeals] = useState<{ id: number; status: string; holdRole: string; touchedAt: string; reply: string }[]>([]);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const [payOpen, setPayOpen] = useState<PayOrderView | null>(null);
  const rows = ledgerRows(state?.ledger ?? []);
  const runDoor = useRunDoor();
  const [payFirst, setPayFirst] = useState<PayChoice | null>(null);
  useEffect(() => {
    try {
      setPayFirst(readPayChoice(localStorage));
    } catch {
      /* kho bị chặn: giữ thứ tự mặc định */
    }
  }, []);

  useEffect(() => {
    if (user?.displayName) setName(user.displayName);
  }, [user]);

  useEffect(() => {
    if (!notice) return;
    pushToast(notice, /chưa|không|hãy|lỗi/i.test(notice) ? "bad" : "ok");
    setNotice(null);
  }, [notice]);

  useEffect(() => {
    if (!user || user.isDevFallback) return;
    let gone = false;
    const id = deviceId();
    void getMyPlace().then((next) => { if (!gone) setPlace(next); }).catch(() => {});
    void myAffiliate().then((next) => { if (!gone) setPartner(next.joined); }).catch(() => {});
    void getBadgeStyle().then((next) => { if (!gone) setBadge(next); }).catch(() => {});
    void listOwnAppeals().then((rows) => { if (!gone) setOwnAppeals(rows); }).catch(() => {});
    // Tài khoản bị khóa thì claimTrialDevice bị máy chủ chặn (403) nhưng vẫn phải xem được ví để gửi yêu cầu.
    void (id ? claimTrialDevice({ data: id }).catch(() => getRoomAccount()) : getRoomAccount())
      .then((next) => {
        if (!gone) setState(next);
      })
      .catch(() => {
        if (!gone) setNotice("Chưa đọc được tài khoản. Hãy đăng nhập lại.");
      });
    return () => {
      gone = true;
    };
  }, [user, reload]);

  // Tài khoản bị khóa hay cấm: ô gửi yêu cầu là việc duy nhất làm được, nên đứng trên cùng. Còn lại đứng cuối Ví.
  const blocked = place?.status === "locked" || place?.status === "banned";
  // Khối của cách trả khách đang dùng (lựa chọn đã nhớ ở trang chủ) đứng trước.
  const turnFirst = payFirst === "turn";
  const helpForm = (
        <form
          className="space-y-2 rounded-[var(--radius-card)] border border-line bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            void submitAppeal({ data: appeal })
              .then(() => {
                setAppeal("");
                setNotice("Đã gửi yêu cầu. Admin hoặc Quản lý xem ở trang Admin.");
              })
              .catch((error) => setNotice(error instanceof Error ? error.message : "Chưa gửi được."))
              .finally(() => setBusy(false));
          }}
        >
          <h2 className="font-semibold">
            {place?.status === "locked" ? "Tài khoản đang bị khóa" : place?.status === "banned" ? "Tài khoản đang bị cấm" : "Cần giúp? Gửi yêu cầu"}
          </h2>
          <p className="text-sm text-muted">
            {place?.status === "open" || !place
              ? "Dùng khi cần hỏi về gói, Token dịch, khóa hoặc cấm. Không gửi key hay mật khẩu."
              : place.reason || "Bạn vẫn gửi được yêu cầu. Không dịch và không xuất file."}
          </p>
          <textarea value={appeal} onChange={(event) => setAppeal(event.target.value)} rows={3} className="w-full rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none" placeholder="Viết rõ việc cần xem, ít nhất 10 ký tự" />
          <button type="submit" disabled={busy} className="min-tap w-full rounded-full border border-line disabled:opacity-40">
            Gửi yêu cầu
          </button>
          {ownAppeals.filter((item) => item.status === "cho" && canSkipToOwner(new Date(item.touchedAt).getTime(), Date.now(), item.holdRole)).map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={busy}
              className="min-tap w-full rounded-full border border-line disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                void skipAppeal({ data: item.id })
                  .then(() => setNotice("Đã báo Admin. Admin sẽ thấy đủ nội dung."))
                  .catch((error) => setNotice(error instanceof Error ? error.message : "Chưa báo được."))
                  .finally(() => setBusy(false));
              }}
            >
              Đã 2 giờ không ai xử lý, báo Admin
            </button>
          ))}
        </form>
  );
  const tokenBlock = (
          <section aria-label="Token dịch" data-wallet-block="token" className="grid gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3">
            <h2 className="font-semibold">Token dịch · trả theo lượt</h2>
            <div data-tour="balance">
              <p className="text-sm text-muted">Token dịch còn</p>
              <p className="text-xl font-semibold">{formatGiay(state?.units ?? 0)}</p>
              <p className="text-xs text-muted">Dùng cho trả theo lượt, dịch trực tiếp và Orpheus. Không cần key.</p>
            </div>
          {runDoor.open ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <DoorDot open />
              Cửa trả theo lượt đang mở. Trừ Token dịch, không giữ số dư.
            </p>
          ) : (
            <RunDoorClosed note={runDoor.note} />
          )}
          <GiayShelf reload={reload} onBought={(message) => { setNotice(message); setReload((value) => value + 1); window.dispatchEvent(new Event("tyzo-room-refresh")); }} />
          </section>
  );
  const rentBlock = (
          <section aria-label="Thuê phòng" data-wallet-block="rent" data-tour="plans" className="grid gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3">
            <h2 className="font-semibold">Thuê phòng · dùng key của bạn</h2>
            <p className="text-sm">
              {state ? roomAccess({ plan: state.plan, planUntil: state.planUntil, trialLeft: state.trialLeft }).text : "Đang xem hạn gói…"}
            </p>
          <p className="text-sm text-muted">
            Trong hạn gói: không giới hạn số tệp, được xuất file phụ đề. Cước AI trả bằng key của bạn.
          </p>
          {payOpen && (
            <PaySlip
              order={payOpen}
              doneText="Đã mở hạn thuê phòng."
              onDone={() => {
                setPayOpen(null);
                setReload((value) => value + 1);
                window.dispatchEvent(new Event("tyzo-room-refresh"));
              }}
              onClose={() => setPayOpen(null)}
            />
          )}
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              disabled={busy}
              className="flex min-tap w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-left disabled:opacity-40"
              onClick={() => {
                setBusy(true);
                setNotice(null);
                void orderRoomPlan({ data: plan.id })
                  .then((order) => {
                    setPayOpen(order);
                    setNotice("Đã tạo mã chuyển khoản.");
                  })
                  .catch((error: Error) => setNotice(error.message || "Chưa tạo được mã."))
                  .finally(() => setBusy(false));
              }}
            >
              <span className="min-w-0">
                <span className="block font-medium">{plan.name}</span>
                {plan.strike != null && plan.save != null ? (
                  <span className="mt-1 block text-xs">
                    <span className="text-muted line-through">{dong(plan.strike)}</span>
                    <span className="mt-0.5 block font-semibold text-accent">Đã tiết kiệm {dong(plan.save)}</span>
                  </span>
                ) : (
                  <span className="mt-1 block text-xs text-muted">Giá một ngày. Gói dài hơn sẽ tiết kiệm hơn</span>
                )}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-lg font-semibold text-accent">{dong(plan.price)}</span>
              </span>
            </button>
          ))}
          </section>
  );

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-1 py-2">
    {/* Chia cột phải nằm trong khung không bị ép chiều cao, nếu không phần dư bị đẩy sang cột ẩn bên phải. */}
    <div className="account-grid">
      {isPending && <p className="text-sm text-muted">Đang kiểm tra phiên…</p>}
      {!isPending && (!user || user.isDevFallback) && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Đăng ký hoặc đăng nhập để dùng phòng.</p>
          <Link to="/login" className="min-tap block rounded-full bg-accent text-center font-semibold text-ink">
            Đăng ký hoặc đăng nhập
          </Link>
        </div>
      )}
      {user && !user.isDevFallback && blocked && helpForm}
      {user && !user.isDevFallback && (
        <>
          <AccountCard rank={place?.role ?? null} extra={partner ? ["ctv"] : []} styleId={badge}>
            <div>
            <p className="font-semibold">{user.displayName || "Chưa có tên"}</p>
            <p className="mt-1 text-sm text-muted">{user.primaryEmail}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link to="/ctv" className="inline-flex h-11 items-center justify-center rounded-full border border-line px-4 text-sm leading-none">
                Cộng tác viên
              </Link>
            </div>
          </AccountCard>
          {(turnFirst ? ["token", "rent"] : ["rent", "token"]).map((block) => (
            <Fragment key={block}>{block === "token" ? tokenBlock : rentBlock}</Fragment>
          ))}
          {rows.length > 0 && (
            <section className="account-wide rounded-[var(--radius-card)] border border-line bg-card p-3">
              <h2 className="text-sm font-semibold">Lịch sử Token/Gói</h2>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                {(ledgerOpen ? rows.slice(0, 9) : rows.slice(0, 3)).map((row) => (
                  <li key={row.id} className="flex justify-between gap-3">
                    <span className={"min-w-0 truncate " + (row.tone === "reject" ? "text-danger" : "")}>{row.label}</span>
                    <span className={"shrink-0 text-right " + (row.tone === "down" || row.tone === "reject" ? "text-danger" : "text-accent")}>
                      {row.main}
                      {row.money && <span className="block text-xs text-muted">{row.money}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {rows.length > 3 && (
                <button type="button" className="mt-2 text-sm text-muted underline" onClick={() => setLedgerOpen((open) => !open)}>
                  {ledgerOpen ? "Thu gọn" : `Xem thêm ${Math.min(rows.length, 9) - 3} dòng`}
                </button>
              )}
            </section>
          )}
          <form
            className="space-y-2 rounded-[var(--radius-card)] border border-line bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const next = name.trim();
              if (!next) return;
              setBusy(true);
              setNotice(null);
              void authClient
                .updateUser({ name: next })
                .then((result) => {
                  if (result.error) setNotice(result.error.message || "Không đổi được tên.");
                  else setNotice("Đã đổi tên.");
                })
                .finally(() => setBusy(false));
            }}
          >
            <h2 className="font-semibold">Tên hiển thị</h2>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-3 outline-none"
            />
            <button type="submit" disabled={busy} className="min-tap w-full rounded-full border border-line disabled:opacity-40">
              Lưu tên
            </button>
          </form>
          <form data-tour="change-password"
            className="space-y-2 rounded-[var(--radius-card)] border border-line bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              setNotice(null);
              void authClient
                .changePassword({ currentPassword, newPassword: nextPassword, revokeOtherSessions: true })
                .then((result) => {
                  if (result.error) setNotice(result.error.message || "Không đổi được mật khẩu.");
                  else {
                    setCurrentPassword("");
                    setNextPassword("");
                    setNotice("Đã đổi mật khẩu.");
                  }
                })
                .finally(() => setBusy(false));
            }}
          >
            <h2 className="font-semibold">Đổi mật khẩu</h2>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Mật khẩu hiện tại"
              required
              className="w-full rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-3 outline-none"
            />
            <input
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              placeholder="Mật khẩu mới, ít nhất 8 ký tự"
              required
              minLength={8}
              className="w-full rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-3 outline-none"
            />
            <button type="submit" disabled={busy} className="min-tap w-full rounded-full border border-line disabled:opacity-40">
              Đổi mật khẩu
            </button>
            <p className="text-xs text-muted">Đổi mật khẩu tại đây. Phòng chưa gửi thư đặt lại mật khẩu.</p>
          </form>
          {!blocked && helpForm}
        </>
      )}
    </div>
    </div>
  );
}
