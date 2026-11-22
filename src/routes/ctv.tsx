import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/back-button";
import { CopyButton } from "@/components/copy-button";
import { TermsLink } from "@/components/terms-link";
import { applyAffiliate, myAffiliate, requestPayout, saveAffiliateBank } from "@/lib/affiliate-room";
import { EVENT_STATUS_LABEL, MAX_SHARE_CAP_BP, SOURCE_LABEL } from "@/lib/affiliate";
import { PAYOUT_BANKS } from "@/lib/pay-match";
import { dong } from "@/lib/money-format";

export const Route = createFileRoute("/ctv")({ component: PartnerPage });

type Desk = NonNullable<Awaited<ReturnType<typeof myAffiliate>>>;
type Joined = Extract<Desk, { joined: true }>;

const card = "grid gap-3 rounded-[var(--radius-card)] border border-line bg-card p-4";
const field = "min-h-11 w-full rounded-[var(--radius-ctl)] border border-line bg-raised px-3 outline-none";
/** Danh sách dài cuộn trong khung, không kéo cả trang. */
const scrollBox = "max-h-80 overflow-y-auto overscroll-contain rounded-[var(--radius-ctl)] border border-line";
const day = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const pct = (bp: number) => `${(bp / 100).toLocaleString("vi-VN")}%`;

const PAYOUT_LABEL: Record<string, string> = { "cho-chi": "Chờ chuyển", "da-chi": "Đã chuyển", huy: "Trả lại" };

function PartnerPage() {
  const [note, setNote] = useState("");
  const [desk, setDesk] = useState<Desk | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    void myAffiliate()
      .then((next) => setDesk(next ?? null))
      .catch((error: Error) => setNote(error.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="room-wide mx-auto flex h-dvh flex-col overflow-y-auto bg-bg text-fg">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <p className="text-xs font-medium tracking-wide text-accent">Giới thiệu bạn bè</p>
            <h1 className="text-base leading-none font-semibold">Cộng tác viên</h1>
          </div>
        </div>
        <Link to="/tai-khoan" className="room-back">
          Tài khoản
        </Link>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto grid max-w-3xl gap-4">
          {!desk && !note && <p className="text-sm text-muted">Đang tải…</p>}
          {desk && !desk.joined && (
            <section className={card}>
              <h2 className="font-semibold">Giới thiệu khách, nhận hoa hồng</h2>
              <p className="text-sm text-muted">
                Bạn nhận một mã và đường dẫn riêng. Người đăng ký qua đường dẫn của bạn mua Token dịch hoặc thuê phòng thì bạn nhận hoa hồng trên phần lời của
                đơn đó: {pct(desk.rules.rateRunBp)} với Token dịch, {pct(desk.rules.ratePlanBp)} với thuê phòng.
              </p>
              <button
                type="button"
                disabled={busy}
                className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40 sm:w-fit sm:px-6"
                onClick={() => {
                  setBusy(true);
                  void applyAffiliate()
                    .then(load)
                    .catch((error: Error) => setNote(error.message))
                    .finally(() => setBusy(false));
                }}
              >
                Đăng ký mã giới thiệu
              </button>
            </section>
          )}
          {desk?.joined && <JoinedView desk={desk} reload={load} setNote={setNote} />}
          {note ? <p className="text-sm text-danger">{note}</p> : null}
          <p className="border-t border-line pt-3">
            <TermsLink />
          </p>
        </div>
      </div>
    </main>
  );
}

function JoinedView({ desk, reload, setNote }: { desk: Joined; reload: () => void; setNote: (text: string) => void }) {
  const active = desk.status === "hoat-dong";
  const [editing, setEditing] = useState(!desk.bank);
  const [bank, setBank] = useState(desk.bank?.bank ?? "");
  const [account, setAccount] = useState(desk.bank?.account ?? "");
  const [holder, setHolder] = useState(desk.bank?.holder ?? "");
  const [busy, setBusy] = useState(false);
  const canPay = active && Boolean(desk.bank) && desk.ready >= desk.rules.minPayout && !desk.payouts.some((p) => p.status === "cho-chi");
  const payHint = !active
    ? "Mã đang chờ duyệt hoặc tạm khóa."
    : !desk.bank
      ? "Nhập tài khoản ngân hàng nhận tiền trước."
      : desk.payouts.some((p) => p.status === "cho-chi")
        ? "Đang có lệnh rút chờ chuyển."
        : desk.ready < desk.rules.minPayout
          ? `Rút khi đủ ${dong(desk.rules.minPayout)}.`
          : "";

  return (
    <>
      <section className={card} data-ctv-link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Mã giới thiệu</h2>
          <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (active ? "bg-accent/15 text-accent" : "bg-raised text-muted")}>
            {active ? "Đang hoạt động" : desk.status === "tam-khoa" ? "Tạm khóa" : "Chờ Admin duyệt"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-2xl font-semibold tracking-widest select-all">{desk.code}</p>
          <CopyButton text={desk.code} label="Chép mã" />
        </div>
        {active ? (
          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
            {desk.qr ? <img src={desk.qr} alt="Mã QR đường dẫn giới thiệu" className="mx-auto h-40 w-40 rounded-[var(--radius-ctl)] bg-white p-1" /> : null}
            <div className="grid gap-2">
              <p className="rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 text-sm break-all select-all">{desk.link}</p>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={desk.link} label="Chép đường dẫn" />
                {typeof navigator !== "undefined" && "share" in navigator ? (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-3 text-sm"
                    onClick={() => void navigator.share({ title: "TyZo Sub", text: "Dịch phụ đề video bằng AI", url: desk.link }).catch(() => {})}
                  >
                    Chia sẻ
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-muted">Người mở đường dẫn này rồi đăng ký sẽ gắn với mã của bạn. Họ cũng có thể gõ mã ở trang đăng ký.</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Đường dẫn giới thiệu hiện ra khi Admin duyệt mã.</p>
        )}
      </section>

      <section className={card} data-ctv-money>
        <h2 className="font-semibold">Hoa hồng</h2>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            ["Đang chờ", desk.waiting],
            ["Rút được", desk.ready],
            ["Đang rút", desk.pending],
            ["Đã nhận", desk.paid],
          ].map(([label, value]) => (
            <p key={label as string} className="grid gap-1 rounded-[var(--radius-ctl)] border border-line p-3">
              <span className="text-xs text-muted">{label}</span>
              <span className="font-semibold">{dong(value as number)}</span>
            </p>
          ))}
        </div>
        <button
          type="button"
          disabled={!canPay || busy}
          className="min-tap w-full rounded-full bg-accent font-semibold text-ink disabled:opacity-40 sm:w-fit sm:px-6"
          onClick={() => {
            setBusy(true);
            void requestPayout()
              .then(() => {
                setNote("Đã gửi lệnh rút. Admin chuyển vào tài khoản của bạn.");
                reload();
              })
              .catch((error: Error) => setNote(error.message))
              .finally(() => setBusy(false));
          }}
        >
          Yêu cầu rút {desk.ready > 0 ? dong(desk.ready) : ""}
        </button>
        {payHint ? <p className="text-xs text-muted">{payHint}</p> : null}
      </section>

      <section className={card} data-ctv-bank>
        <h2 className="font-semibold">Tài khoản nhận tiền</h2>
        {!editing && desk.bank ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              {desk.bank.bankName} · {desk.bank.masked}
              <span className="block text-muted">{desk.bank.holder}</span>
            </p>
            <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" onClick={() => setEditing(true)}>
              Sửa
            </button>
          </div>
        ) : (
          <form
            className="grid gap-2 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              void saveAffiliateBank({ data: { bank, account, holder } })
                .then(() => {
                  setNote("Đã lưu tài khoản nhận tiền.");
                  setEditing(false);
                  reload();
                })
                .catch((error: Error) => setNote(error.message))
                .finally(() => setBusy(false));
            }}
          >
            <label className="grid gap-1 text-sm">
              <span>Ngân hàng</span>
              <select className={field} value={bank} onChange={(event) => setBank(event.target.value)} required>
                <option value="">Chọn ngân hàng</option>
                {PAYOUT_BANKS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>Số tài khoản</span>
              <input className={field} inputMode="numeric" value={account} onChange={(event) => setAccount(event.target.value)} required />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Tên chủ tài khoản</span>
              <input className={field} value={holder} onChange={(event) => setHolder(event.target.value)} placeholder="NGUYEN VAN A" required />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <button type="submit" disabled={busy} className="min-tap rounded-full bg-accent px-6 font-semibold text-ink disabled:opacity-40">
                Lưu tài khoản
              </button>
              {desk.bank ? (
                <button type="button" className="min-tap rounded-full border border-line px-4" onClick={() => setEditing(false)}>
                  Hủy
                </button>
              ) : null}
            </div>
            <p className="text-xs text-muted sm:col-span-3">Tên chủ tài khoản phải trùng tên của bạn. Chỉ Admin xem được để chuyển tiền.</p>
          </form>
        )}
      </section>

      <section className={card} data-ctv-events>
        <h2 className="font-semibold">Lịch sử hoa hồng</h2>
        {desk.events.length === 0 ? (
          <p className="text-sm text-muted">Chưa có khoản nào. Hoa hồng ghi khi khách của bạn chuyển khoản xong.</p>
        ) : (
          <ul className={scrollBox + " divide-y divide-line"}>
            {desk.events.map((row) => (
              <li key={row.id} className="grid gap-0.5 px-3 py-2 text-sm">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 break-words">{SOURCE_LABEL[row.kind] ?? row.kind} · {row.email}</span>
                  <span className="shrink-0 font-semibold text-accent">+{dong(row.amount)}</span>
                </span>
                <span className="text-xs text-muted">
                  {day(row.at)} · đơn {dong(row.base)} · {EVENT_STATUS_LABEL[row.status] ?? row.status}
                  {row.status === "treo" ? ` (rút được từ ${day(row.availableAt)})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} data-ctv-payouts>
        <h2 className="font-semibold">Lịch sử rút</h2>
        {desk.payouts.length === 0 ? (
          <p className="text-sm text-muted">Chưa rút lần nào.</p>
        ) : (
          <ul className={scrollBox + " divide-y divide-line"}>
            {desk.payouts.map((row) => (
              <li key={row.id} className="grid gap-0.5 px-3 py-2 text-sm">
                <span className="flex items-start justify-between gap-2">
                  <span>{day(row.at)}</span>
                  <span className="shrink-0 font-semibold">{dong(row.amount)}</span>
                </span>
                <span className="text-xs text-muted">
                  {PAYOUT_LABEL[row.status] ?? row.status}
                  {row.paidAt ? ` ngày ${day(row.paidAt)}` : ""}
                  {row.ref ? ` · mã GD ${row.ref}` : ""}
                  {row.note ? ` · ${row.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} data-ctv-guests>
        <h2 className="font-semibold">Khách đã giới thiệu ({desk.guests.length})</h2>
        {desk.guests.length === 0 ? (
          <p className="text-sm text-muted">Chưa có ai đăng ký qua mã của bạn.</p>
        ) : (
          <ul className={scrollBox + " divide-y divide-line"}>
            {desk.guests.map((guest) => (
              <li key={guest.email + guest.at} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 break-all">{guest.email}</span>
                <span className="shrink-0 text-xs text-muted">
                  {day(guest.at)}
                  {guest.bought ? " · đã mua" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card} data-ctv-rules>
        <h2 className="font-semibold">Cách tính</h2>
        <ul className="grid list-disc gap-1 pl-5 text-sm text-muted">
          <li>
            Hoa hồng tính trên <b>phần lời</b> của đơn (tiền khách trả trừ giá vốn và chi phí vận hành): {pct(desk.rateTokenBp)} với Token dịch,{" "}
            {pct(desk.ratePlanBp)} với thuê phòng, tối đa {pct(Math.min(desk.rules.maxShareBp, MAX_SHARE_CAP_BP))} phần lời của đơn.
          </li>
          <li>Đơn có lời quá ít (dưới {pct(desk.rules.minMarginBp)} giá trị đơn) thì không có hoa hồng.</li>
          <li>{desk.rules.windowDays === 0 ? "Hưởng mãi, tính từ lúc khách gắn mã." : `Hưởng trong ${desk.rules.windowDays} ngày kể từ lúc khách gắn mã.`}</li>
          <li>Mỗi khoản chờ {desk.rules.holdDays} ngày rồi mới rút được. Đơn bị hoàn hay hủy thì khoản đó bị hủy.</li>
          <li>Rút tối thiểu {dong(desk.rules.minPayout)}. Không tự giới thiệu chính mình.</li>
        </ul>
      </section>
    </>
  );
}
