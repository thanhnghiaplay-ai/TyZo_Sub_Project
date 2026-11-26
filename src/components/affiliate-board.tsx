import { useEffect, useState } from "react";
import { cancelPayout, getAffiliateDesk, getPayoutReconcile, markPayout, saveAffiliateRules, setAffiliateState } from "@/lib/affiliate-room";
import { AFFILIATE_DEFAULT, COMMISSION_REASON, commissionFor, MAX_SHARE_CAP_BP, parseAffiliateRules } from "@/lib/affiliate";
import { dong } from "@/lib/payment/money-format";

const field = "min-h-11 w-full rounded-[var(--radius-ctl)] border border-line bg-bg px-3";

export function AffiliateBoard() {
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState("20");
  const [run, setRun] = useState("20");
  const [hold, setHold] = useState("14");
  const [windowDays, setWindowDays] = useState("0");
  const [minPay, setMinPay] = useState("200000");
  const [opex, setOpex] = useState("15");
  const [share, setShare] = useState("40");
  const [margin, setMargin] = useState("15");
  const [tryPrice, setTryPrice] = useState("99000");
  const [tryCost, setTryCost] = useState("0");
  const [tryRate, setTryRate] = useState("20");
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [paid, setPaid] = useState("");
  const [saving, setSaving] = useState(false);
  type Desk = NonNullable<Awaited<ReturnType<typeof getAffiliateDesk>>>;
  const [people, setPeople] = useState<Desk["people"]>([]);
  const [payouts, setPayouts] = useState<Desk["payouts"]>([]);
  const [recon, setRecon] = useState<Awaited<ReturnType<typeof getPayoutReconcile>> | null>(null);
  const [q, setQ] = useState("");

  function load() {
    void getAffiliateDesk()
      .then((desk) => {
        setPlan(String(desk.rules.ratePlanBp / 100));
        setRun(String(desk.rules.rateRunBp / 100));
        setHold(String(desk.rules.holdDays));
        setWindowDays(String(desk.rules.windowDays));
        setMinPay(String(desk.rules.minPayout));
        setOpex(String(desk.rules.opexBp / 100));
        setShare(String(desk.rules.maxShareBp / 100));
        setMargin(String(desk.rules.minMarginBp / 100));
        setPeople(desk.people);
        setPayouts(desk.payouts);
        void getPayoutReconcile().then(setRecon).catch(() => setRecon(null));
        setTotals(desk.totals);
      })
      .catch((error: Error) => setNote(error.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="admin-flow admin-wide">
      <div className="admin-card space-y-3">
      <h2 className="font-semibold">Cộng tác viên</h2>
      <p className="text-sm text-muted">
        Hoa hồng tính trên <b>lời gộp</b> của từng đơn: tiền khách trả − giá vốn (Token dịch: số Token × giá gốc Turbo lúc mua; thuê phòng: 0) − chi phí vận hành.
        Hoa hồng không bao giờ quá {MAX_SHARE_CAP_BP / 100}% lời gộp, nên web luôn giữ ít nhất một nửa lời. Đơn lời quá mỏng không có hoa hồng.
      </p>
      <div className="grid gap-2 text-sm sm:grid-cols-4">
        <p className="rounded-[var(--radius-ctl)] border border-line p-2">Đang chờ<br /><b>{dong(totals.treo ?? 0)}</b></p>
        <p className="rounded-[var(--radius-ctl)] border border-line p-2">Rút được<br /><b>{dong(totals["da-duyet"] ?? 0)}</b></p>
        <p className="rounded-[var(--radius-ctl)] border border-line p-2">Đang rút<br /><b>{dong(totals["cho-rut"] ?? 0)}</b></p>
        <p className="rounded-[var(--radius-ctl)] border border-line p-2">Đã chi<br /><b>{dong(totals["da-chi"] ?? 0)}</b></p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm"><span>Tỷ lệ thuê phòng (% lời gộp)</span><input inputMode="decimal" className={field} value={plan} onChange={(event) => setPlan(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Tỷ lệ mua Token dịch (% lời gộp)</span><input inputMode="decimal" className={field} value={run} onChange={(event) => setRun(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Chi phí vận hành ước tính (% doanh thu)</span><input inputMode="decimal" className={field} value={opex} onChange={(event) => setOpex(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Hoa hồng tối đa (% lời gộp, trần {MAX_SHARE_CAP_BP / 100}%)</span><input inputMode="decimal" className={field} value={share} onChange={(event) => setShare(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Lời tối thiểu để có hoa hồng (% doanh thu)</span><input inputMode="decimal" className={field} value={margin} onChange={(event) => setMargin(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Ngày chờ trước khi rút</span><input inputMode="numeric" className={field} value={hold} onChange={(event) => setHold(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Số ngày được hưởng (0 = cả đời)</span><input inputMode="numeric" className={field} value={windowDays} onChange={(event) => setWindowDays(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Rút tối thiểu (đồng)</span><input inputMode="numeric" className={field} value={minPay} onChange={(event) => setMinPay(event.target.value)} /></label>
      </div>
      {(() => {
        const rules = parseAffiliateRules(JSON.stringify({ ...AFFILIATE_DEFAULT, opexBp: Math.round(Number(opex) * 100), maxShareBp: Math.round(Number(share) * 100), minMarginBp: Math.round(Number(margin) * 100) }));
        const calc = commissionFor({ revenue: Number(tryPrice), cost: Number(tryCost), rateBp: Math.round(Number(tryRate) * 100), rules });
        return (
          <div className="grid gap-2 rounded-[var(--radius-ctl)] border border-line p-3 text-sm" data-affiliate-calc>
            <p className="font-medium">Tính thử một đơn (theo số đang nhập, chưa cần lưu)</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="grid gap-1"><span>Khách trả (đ)</span><input inputMode="numeric" className={field} value={tryPrice} onChange={(event) => setTryPrice(event.target.value)} /></label>
              <label className="grid gap-1"><span>Giá vốn (đ)</span><input inputMode="numeric" className={field} value={tryCost} onChange={(event) => setTryCost(event.target.value)} /></label>
              <label className="grid gap-1"><span>Tỷ lệ (%)</span><input inputMode="decimal" className={field} value={tryRate} onChange={(event) => setTryRate(event.target.value)} /></label>
            </div>
            <p>
              Vận hành {dong(calc.opex)} · Lời gộp <b>{dong(calc.profit)}</b> · Hoa hồng <b>{dong(calc.amount)}</b> · Web giữ <b className="text-accent">{dong(calc.kept)}</b>
              {calc.reason && calc.reason !== "ty-le-0" ? <span className="block text-muted">{COMMISSION_REASON[calc.reason]}.</span> : null}
            </p>
          </div>
        );
      })()}
      <button
        type="button"
        className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40"
        disabled={saving}
        onClick={() => {
          setSaving(true);
          void saveAffiliateRules({
            data: {
              ratePlanBp: Math.round(Number(plan) * 100),
              rateRunBp: Math.round(Number(run) * 100),
              holdDays: Math.round(Number(hold)),
              windowDays: Math.round(Number(windowDays)),
              minPayout: Math.round(Number(minPay)),
              opexBp: Math.round(Number(opex) * 100),
              maxShareBp: Math.round(Number(share) * 100),
              minMarginBp: Math.round(Number(margin) * 100),
            },
          })
            .then(() => {
              setNote("Đã lưu tỷ lệ.");
              load();
            })
            .catch((error: Error) => setNote(error.message))
            .finally(() => setSaving(false));
        }}
      >
        {saving ? "Đang lưu…" : "Lưu tỷ lệ"}
      </button>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
      </div>
      <div className="admin-card space-y-3">
      <label className="grid gap-1 text-sm">
        <span>Tìm theo tên, email hoặc mã</span>
        <input className={field} value={q} onChange={(event) => setQ(event.target.value)} />
      </label>
      <div className="affiliate-list">
        {people.filter((person) => {
          const needle = q.trim().toLowerCase();
          if (!needle) return true;
          const status = person.status === "hoat-dong" ? "đang mở" : person.status === "tam-khoa" ? "tạm khóa" : "chờ duyệt";
          return [person.name, person.email, person.code, status].join(" ").toLowerCase().includes(needle);
        }).map((person) => (
          <article key={person.user_id} className="rounded-[var(--radius-ctl)] border border-line p-3 text-sm">
            <p className="break-all font-medium">{person.name || person.email}</p>
            <p className="break-all text-muted">{person.email}</p>
            <p className="text-muted">Mã {person.code} · {person.status === "hoat-dong" ? "Đang mở" : person.status === "tam-khoa" ? "Tạm khóa" : "Chờ duyệt"}</p>
            <p className="text-muted">{person.guests} khách · Đang chờ {dong(person.waiting)} · Rút được {dong(person.ready)} · Đã nhận {dong(person.paid)}</p>
            <p className="text-muted">{person.has_bank ? "Đã có tài khoản nhận tiền" : "Chưa nhập tài khoản nhận tiền"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-3" onClick={() => void setAffiliateState({ data: { userId: person.user_id, status: "hoat-dong", ratePlanBp: person.rate_plan_bp, rateRunBp: person.rate_run_bp } }).then(load)}>Mở</button>
              <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-3" onClick={() => void setAffiliateState({ data: { userId: person.user_id, status: "tam-khoa", ratePlanBp: person.rate_plan_bp, rateRunBp: person.rate_run_bp } }).then(load)}>Tạm khóa</button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-3"
                onClick={() => {
                  const link = `${window.location.origin}/?ref=${person.code}`;
                  void navigator.clipboard?.writeText(link).then(() => setNote("Đã chép đường dẫn.")).catch(() => setNote(link));
                }}
              >
                Chép đường dẫn
              </button>
            </div>
            <form
              className="mt-3 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void setAffiliateState({
                  data: {
                    userId: person.user_id,
                    ratePlanBp: Math.round(Number(data.get("plan")) * 100),
                    rateRunBp: Math.round(Number(data.get("run")) * 100),
                  },
                })
                  .then(() => {
                    setNote("Đã lưu tỷ lệ riêng.");
                    load();
                  })
                  .catch((error: Error) => setNote(error.message));
              }}
            >
              <label className="grid gap-1 text-sm">
                <span>Thuê phòng riêng (% lời gộp). Điền 0 để dùng tỷ lệ chung</span>
                <input name="plan" defaultValue={String(person.rate_plan_bp / 100)} className={field} />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Token dịch riêng (% lời gộp). Điền 0 để dùng tỷ lệ chung</span>
                <input name="run" defaultValue={String(person.rate_run_bp / 100)} className={field} />
              </label>
              <button type="submit" className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-line px-3">Lưu tỷ lệ riêng</button>
            </form>
          </article>
        ))}
      </div>
      {recon && (recon.mismatched.length > 0 || recon.orphans.length > 0) && (
        <div className="space-y-1 rounded-[var(--radius-ctl)] border border-danger/40 bg-danger/5 p-3 text-sm" data-payout-reconcile>
          <h3 className="font-semibold text-danger">Đối soát lệnh rút (cần Admin xem)</h3>
          {recon.mismatched.map((m) => (
            <p key={m.id}>Lệnh #{m.id}: ghi {dong(m.amount)}, khoản đã gắn {dong(m.linked)}. Chưa xác nhận hay trả lại được cho tới khi khớp.</p>
          ))}
          {recon.orphans.map((o) => (
            <p key={o.affiliateId}>{o.count} khoản cũ ({dong(o.total)}) đang chờ rút nhưng chưa gắn lệnh nào (mã CTV {o.affiliateId.slice(0, 8)}…).</p>
          ))}
        </div>
      )}
      {payouts.length > 0 && (
        <div className="space-y-3" data-affiliate-payouts>
          <h3 className="text-sm font-semibold">Lệnh rút chờ chuyển</h3>
          <input className={field} placeholder="Mã giao dịch ngân hàng sau khi chuyển" value={paid} onChange={(event) => setPaid(event.target.value)} />
          {payouts.map((row) => (
            <article key={row.id} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line p-3 text-sm sm:grid-cols-[auto_1fr]">
              {row.qr ? <img src={row.qr} alt="Mã QR chuyển tiền" className="mx-auto h-40 w-40 rounded-[var(--radius-ctl)] bg-white p-1" /> : null}
              <div className="grid content-start gap-1">
                <p className="break-all font-medium">{row.email}</p>
                <p className="text-lg font-semibold text-accent">{dong(row.amount)}</p>
                <p className="break-all">{row.bank}</p>
                <p className="text-xs text-muted">Nội dung chuyển: TYZO CTV {row.id} · Yêu cầu lúc {new Date(row.at).toLocaleString("vi-VN")}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40" disabled={paid.trim().length < 2} onClick={() => void markPayout({ data: { id: row.id, ref: paid } }).then(() => { setPaid(""); setNote("Đã ghi đã chuyển."); load(); }).catch((error: Error) => setNote(error.message))}>Đã chuyển</button>
                  <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" onClick={() => void cancelPayout({ data: { id: row.id, note: "Admin trả lại lệnh rút, hãy kiểm tài khoản rồi rút lại." } }).then(() => { setNote("Đã trả lại lệnh rút."); load(); }).catch((error: Error) => setNote(error.message))}>Trả lại</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
