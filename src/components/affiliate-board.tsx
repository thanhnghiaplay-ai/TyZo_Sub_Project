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
  const [people, setPeople] = useState<{ user_id: string; email: string; name: string; code: string; status: string; rate_plan_bp: number; rate_run_bp: number; waiting: number; ready: number }[]>([]);
  const [payouts, setPayouts] = useState<{ id: number; email: string; amount: number }[]>([]);
  const [q, setQ] = useState("");

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
    <section className="admin-flow admin-wide">
      <div className="admin-card space-y-3">
      <h2 className="font-semibold">Cộng tác viên</h2>
      <p className="text-sm text-muted">0 ngày là hưởng cả đời. Đổi số ngày chỉ chặn hoa hồng mới. Tỷ lệ 0 ở từng người là dùng tỷ lệ chung.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm"><span>Tỷ lệ gói (%)</span><input className="min-h-11 w-full rounded-xl border border-line bg-bg px-3" value={plan} onChange={(event) => setPlan(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Tỷ lệ lượt (%)</span><input className="min-h-11 w-full rounded-xl border border-line bg-bg px-3" value={run} onChange={(event) => setRun(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Ngày chờ</span><input className="min-h-11 w-full rounded-xl border border-line bg-bg px-3" value={hold} onChange={(event) => setHold(event.target.value)} /></label>
        <label className="grid gap-1 text-sm"><span>Số ngày được hưởng (0 = cả đời)</span><input className="min-h-11 w-full rounded-xl border border-line bg-bg px-3" value={windowDays} onChange={(event) => setWindowDays(event.target.value)} /></label>
        <label className="grid gap-1 text-sm sm:col-span-2"><span>Rút tối thiểu (đồng)</span><input className="min-h-11 w-full rounded-xl border border-line bg-bg px-3" value={minPay} onChange={(event) => setMinPay(event.target.value)} /></label>
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
      </div>
      <div className="admin-card space-y-3">
      <label className="grid gap-1 text-sm">
        <span>Tìm theo tên, email hoặc mã</span>
        <input className="min-h-11 w-full rounded-xl border border-line bg-bg px-3" value={q} onChange={(event) => setQ(event.target.value)} />
      </label>
      <div className="affiliate-list">
        {people.filter((person) => {
          const needle = q.trim().toLowerCase();
          if (!needle) return true;
          const status = person.status === "hoat-dong" ? "đang mở" : person.status === "tam-khoa" ? "tạm khóa" : "chờ duyệt";
          return [person.name, person.email, person.code, status].join(" ").toLowerCase().includes(needle);
        }).map((person) => (
          <article key={person.user_id} className="rounded-xl border border-line p-3 text-sm">
            <p className="break-all font-medium">{person.name || person.email}</p>
            <p className="break-all text-muted">{person.email}</p>
            <p className="text-muted">Mã {person.code} · {person.status === "hoat-dong" ? "Đang mở" : person.status === "tam-khoa" ? "Tạm khóa" : "Chờ duyệt"}</p>
            <p className="text-muted">Đang chờ {person.waiting.toLocaleString("vi-VN")} đ · Rút được {person.ready.toLocaleString("vi-VN")} đ</p>
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
                <span>Gói riêng (%). Điền 0 để dùng tỷ lệ chung</span>
                <input name="plan" defaultValue={String(person.rate_plan_bp / 100)} className="min-h-11 w-full rounded-xl border border-line bg-bg px-3" />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Lượt riêng (%). Điền 0 để dùng tỷ lệ chung</span>
                <input name="run" defaultValue={String(person.rate_run_bp / 100)} className="min-h-11 w-full rounded-xl border border-line bg-bg px-3" />
              </label>
              <button type="submit" className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-line px-3">Lưu tỷ lệ riêng</button>
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
      </div>
    </section>
  );
}
