import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getBadgeStyle, getMyPlace, listOwnAppeals, skipAppeal, submitAppeal, type MyPlace } from "@/lib/admin-room";
import { AccountCard } from "@/components/role-mark";
import type { BadgeStyleId } from "@/lib/badge-styles";
import { canSkipToOwner } from "@/lib/staff-role";
import { deviceId } from "@/lib/device-id";
import { buyRoomPlan, claimTrialDevice, getRoomAccount, type RoomState } from "@/lib/room-account";
import { ROOM_PLANS, roomAccess } from "@/lib/room-plans";
import { TopUp } from "@/components/top-up";
import { DoorDot, RunDoorClosed, useRunDoor } from "@/components/run-door";
import { pushToast } from "@/components/toast";

function dong(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function AccountPanel() {
  const { user, isPending } = useCurrentUserState();
  const [state, setState] = useState<RoomState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [name, setName] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [place, setPlace] = useState<MyPlace | null>(null);
  const [badge, setBadge] = useState<BadgeStyleId>("ribbon");
  const [appeal, setAppeal] = useState("");
  const [ownAppeals, setOwnAppeals] = useState<{ id: number; status: string; holdRole: string; touchedAt: string; reply: string }[]>([]);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const runDoor = useRunDoor();

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
    void getBadgeStyle().then((next) => { if (!gone) setBadge(next); }).catch(() => {});
    void listOwnAppeals().then((rows) => { if (!gone) setOwnAppeals(rows); }).catch(() => {});
    // Tài khoản bị khóa thì claimTrialDevice bị máy chủ chặn (403) nhưng vẫn phải xem được ví để gửi yêu cầu.
    void (id ? claimTrialDevice({ data: id }).catch(() => getRoomAccount()) : getRoomAccount())
      .then((next) => {
        if (!gone) setState(next);
      })
      .catch(() => {
        if (!gone) setNotice("Chưa đọc được ví. Hãy đăng nhập lại.");
      });
    return () => {
      gone = true;
    };
  }, [user, reload]);

  async function run(task: () => Promise<RoomState>, done: string) {
    setBusy(true);
    setNotice(null);
    try {
      setState(await task());
      setNotice(done);
      window.dispatchEvent(new Event("tyzo-room-refresh"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thực hiện được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
      {isPending && <p className="text-sm text-muted">Đang kiểm tra phiên…</p>}
      {!isPending && (!user || user.isDevFallback) && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Đăng ký hoặc đăng nhập để dùng phòng.</p>
          <Link to="/login" className="min-tap block rounded-full bg-accent text-center font-semibold text-ink">
            Đăng ký hoặc đăng nhập
          </Link>
        </div>
      )}
      {user && !user.isDevFallback && (
        <form
          className="space-y-2 rounded-2xl border border-line bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            void submitAppeal({ data: appeal })
              .then(() => {
                setAppeal("");
                setNotice("Đã gửi yêu cầu. Chủ hoặc Quản lý xem ở trang Admin.");
              })
              .catch((error) => setNotice(error instanceof Error ? error.message : "Chưa gửi được."))
              .finally(() => setBusy(false));
          }}
        >
          <h2 className="font-semibold">
            {place?.status === "locked" ? "Tài khoản đang bị khóa" : place?.status === "banned" ? "Tài khoản đang bị cấm" : "Gửi yêu cầu"}
          </h2>
          <p className="text-sm text-muted">
            {place?.status === "open" || !place
              ? "Dùng khi cần hỏi về gói, nạp tiền, khóa hoặc cấm. Không gửi key Groq."
              : place.reason || "Bạn vẫn gửi được yêu cầu. Không dịch và không xuất file."}
          </p>
          <textarea value={appeal} onChange={(event) => setAppeal(event.target.value)} rows={3} className="w-full rounded-xl border border-line bg-raised px-3 py-2 outline-none" placeholder="Viết rõ việc cần xem, ít nhất 10 ký tự" />
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
                  .then(() => setNotice("Đã báo Chủ. Chủ sẽ thấy đủ nội dung."))
                  .catch((error) => setNotice(error instanceof Error ? error.message : "Chưa báo được."))
                  .finally(() => setBusy(false));
              }}
            >
              Đã 2 giờ không ai xử lý, báo Chủ
            </button>
          ))}
        </form>
      )}
      {user && !user.isDevFallback && (
        <>
          <AccountCard rank={place?.role ?? null} styleId={badge}>
            <p className="font-semibold">{user.displayName || "Chưa có tên"}</p>
            <p className="mt-1 text-sm text-muted">{user.primaryEmail}</p>
            <p className="mt-2 text-sm text-muted">Số dư</p>
            <p className="text-2xl font-semibold text-accent">{dong(state?.balance ?? 0)}</p>
            {(state?.holding ?? 0) > 0 && (
              <p className="text-sm text-muted">Đang giữ {dong(state?.holding ?? 0)} cho lần chạy chưa xong. Quá 6 giờ không chạy tiếp thì số này trả về số dư.</p>
            )}
            <p className="mt-2 text-sm">
              {state ? roomAccess({ plan: state.plan, planUntil: state.planUntil, trialLeft: state.trialLeft }).text : "Đang xem hạn gói…"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TopUp compact onPaid={() => { setReload((value) => value + 1); window.dispatchEvent(new Event("tyzo-room-refresh")); }} />
              <button
                type="button"
                disabled={leaving}
                className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40"
                onClick={() => {
                  setLeaving(true);
                  void signOut("/login").catch(() => {
                    setLeaving(false);
                    setNotice("Chưa đăng xuất được. Thử lại.");
                  });
                }}
              >
                {leaving ? "Đang đăng xuất…" : "Đăng xuất"}
              </button>
            </div>
          </AccountCard>
          {runDoor.open ? (
            <section className="grid gap-1 rounded-xl border border-line bg-card p-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <DoorDot open />
                Trả theo lượt
              </h2>
              <p className="text-sm text-muted">Đơn giá nằm ở tab Key khi chọn Trả theo lượt. Đó là giá dịch vụ của phòng, không phải bảng giá để so với key riêng.</p>
            </section>
          ) : (
            <RunDoorClosed note={runDoor.note} />
          )}
          <p className="text-sm text-muted">
            Đăng ký mà chưa nạp là dùng thử: 1 tệp, tối đa 10 phút, không xuất file. Gói đã mua thì trong hạn không giới hạn số tệp.
          </p>
          {ROOM_PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              disabled={busy}
              className="flex min-tap w-full items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left disabled:opacity-40"
              onClick={() => void run(() => buyRoomPlan({ data: plan.id }), "Đã mở gói.")}
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
          <form
            className="space-y-2 rounded-2xl border border-line bg-card p-4"
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
              className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
            />
            <button type="submit" disabled={busy} className="min-tap w-full rounded-full border border-line disabled:opacity-40">
              Lưu tên
            </button>
          </form>
          <form
            className="space-y-2 rounded-2xl border border-line bg-card p-4"
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
              className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
            />
            <input
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              placeholder="Mật khẩu mới, ít nhất 8 ký tự"
              required
              minLength={8}
              className="w-full rounded-xl border border-line bg-raised px-3 py-3 outline-none"
            />
            <button type="submit" disabled={busy} className="min-tap w-full rounded-full border border-line disabled:opacity-40">
              Đổi mật khẩu
            </button>
            <p className="text-xs text-muted">Đổi mật khẩu tại đây. Phòng chưa gửi thư đặt lại mật khẩu.</p>
          </form>
          {state && state.ledger.length > 0 && (
            <section className="rounded-2xl border border-line bg-card p-3">
              <h2 className="text-sm font-semibold">Lịch sử Nạp/Mua gói</h2>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                {(ledgerOpen ? state.ledger.slice(0, 9) : state.ledger.slice(0, 3)).map((item) => {
                  const reject = item.kind === "huy-nap" || /từ chối/i.test(item.note);
                  const negative = item.amount < 0 || reject;
                  return (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className={"min-w-0 truncate " + (reject ? "text-danger" : "")}>{item.note}</span>
                      <span className={"shrink-0 " + (negative ? "text-danger" : "text-accent")}>
                        {reject && item.amount === 0 ? "Từ chối" : item.amount > 0 ? "+" + dong(item.amount) : dong(item.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {state.ledger.length > 3 && (
                <button type="button" className="mt-2 text-sm text-muted underline" onClick={() => setLedgerOpen((open) => !open)}>
                  {ledgerOpen ? "Thu gọn" : `Xem thêm ${Math.min(state.ledger.length, 9) - 3} dòng`}
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
