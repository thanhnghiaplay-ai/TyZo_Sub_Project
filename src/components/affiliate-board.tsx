import { useEffect, useState } from "react";
import { getAffiliateDesk, markPayout, saveAffiliateRules, setAffiliateState } from "@/lib/affiliate-room";

export function AffiliateBoard() {
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState("20");
  const [run, setRun] = useState("20");
  const [hold, setHold] = useState("14");
  const [windowDays, setWindowDays] = useState("0");
  const [minPay, setMinPay] = useState("200000");
  const [paid, setPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [people, setPeople] = useState<{ user_id: string; email: string; code: string; status: string; rate_plan_bp: number; rate_run_bp: number; waiting: number; ready: number }[]>([]);
  const [payouts, setPayouts] = useState<{ id: number; email: string; amount: number }[]>([]);

  function load() {
    void getAffiliateDesk()
      .then((desk) => {
        setPlan(String(desk.rules.ratePlanBp / 100));
        setRun(String(desk.rules.rateRunBp / 100));
        setHold(String(desk.rules.holdDays));
        setWindowDays(String(desk.rules.windowDays));
        setMinPay(String(desk.rules.minPayout));
        setPeople(desk.people);
        setPayouts(desk.payouts);
      })
      .catch((error: Error) => setNote(error.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Cộng tác viên</h2>
      <p className="text-sm text-muted">0 ngày là hưởng cả đời. Đổi số ngày chỉ chặn hoa hồng mới. Tỷ lệ 0 ở từng người là dùng tỷ lệ chung.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">Tỷ lệ gói (%)<input className="min-tap w-full rounded-xl border border-line bg-bg px-3" value={plan} onChange={(event) => setPlan(event.target.value)} /></label>
        <label className="text-sm">Tỷ lệ lượt (%)<input className="min-tap w-full rounded-xl border border-line bg-bg px-3" value={run} onChange={(event) => setRun(event.target.value)} /></label>
        <label className="text-sm">Ngày chờ<input className="min-tap w-full rounded-xl border border-line bg-bg px-3" value={hold} onChange={(event) => setHold(event.target.value)} /></label>
        <label className="text-sm">Số ngày được hưởng (0 = cả đời)<input className="min-tap w-full rounded-xl border border-line bg-bg px-3" value={windowDays} onChange={(event) => setWindowDays(event.target.value)} /></label>
        <label className="text-sm sm:col-span-2">Rút tối thiểu (đồng)<input className="min-tap w-full rounded-xl border border-line bg-bg px-3" value={minPay} onChange={(event) => setMinPay(event.target.value)} /></label>
      </div>
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
      <div className="space-y-2">
        {people.map((person) => (
          <article key={person.user_id} className="rounded-xl border border-line p-3 text-sm">
            <p className="font-medium">{person.email}</p>
            <p className="text-muted">Mã {person.code} · {person.status} · chờ {person.waiting} · sẵn {person.ready}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void setAffiliateState({ data: { userId: person.user_id, status: "hoat-dong", ratePlanBp: person.rate_plan_bp, rateRunBp: person.rate_run_bp } }).then(load)}>Mở</button>
              <button type="button" className="min-tap rounded-full border border-line px-3" onClick={() => void setAffiliateState({ data: { userId: person.user_id, status: "tam-khoa", ratePlanBp: person.rate_plan_bp, rateRunBp: person.rate_run_bp } }).then(load)}>Tạm khóa</button>
            </div>
            <form
              className="mt-2 flex flex-wrap items-end gap-2"
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
              <label className="text-xs">Gói %<input name="plan" defaultValue={String(person.rate_plan_bp / 100)} className="min-tap w-20 rounded-xl border border-line bg-bg px-2" /></label>
              <label className="text-xs">Lượt %<input name="run" defaultValue={String(person.rate_run_bp / 100)} className="min-tap w-20 rounded-xl border border-line bg-bg px-2" /></label>
              <button type="submit" className="min-tap rounded-full border border-line px-3">Lưu tỷ lệ riêng</button>
            </form>
          </article>
        ))}
      </div>
      {payouts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Lệnh rút</h3>
          <input className="min-tap w-full rounded-xl border border-line bg-bg px-3" placeholder="Mã chuyển khoản" value={paid} onChange={(event) => setPaid(event.target.value)} />
          {payouts.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1">{row.email} · {row.amount.toLocaleString("vi-VN")} đ</span>
              <button type="button" className="min-tap text-xs" onClick={() => void markPayout({ data: { id: row.id, ref: paid } }).then(load).catch((error: Error) => setNote(error.message))}>Đã chuyển</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
