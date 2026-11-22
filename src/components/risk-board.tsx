import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { addManualFlag, decideRiskFlag, getRiskDesk, runRiskSweep, saveRiskSettings, type RiskFlagView } from "@/lib/risk-room";
import { MANUAL_TERMS, RISK_RULES, type RiskAuto, type RiskSettings } from "@/lib/risk-rules";

type Desk = Awaited<ReturnType<typeof getRiskDesk>>;

const field = "min-h-11 w-full rounded-[var(--radius-ctl)] border border-line bg-bg px-3";
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const STATUS: Record<string, string> = { mo: "Đang mở", "bo-qua": "Đã bỏ qua", "da-khoa": "Đã khóa", "da-cam": "Đã cấm" };
const STANDING: Record<string, string> = { open: "Tài khoản đang mở", locked: "Tài khoản đang khóa", banned: "Tài khoản đang cấm" };
const AUTO: Record<string, string> = { "da-tu-khoa": "Hệ thống đã tự khóa", "da-go-may": "Hệ thống đã gỡ máy ứng dụng" };
const AUTO_LABEL: Record<RiskAuto, string> = { khong: "Chỉ dựng cờ", khoa: "Tự khóa tài khoản", "thu-hoi-may": "Tự gỡ máy ứng dụng" };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["﻿", text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Tab Admin «Rủi ro» (v5.41.0): cờ vi phạm kèm hồ sơ bằng chứng (bảng dữ kiện + mã băm), xử lý Bỏ qua / Khóa / Cấm,
 * ghi cờ tay, và ngưỡng từng luật. Khách khiếu nại: tìm email hoặc mã hồ sơ, bấm Tải hồ sơ hoặc Chép hồ sơ là gửi được ngay.
 */
export function RiskBoard() {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);

  function load(next: { q?: string; all?: boolean } = {}) {
    void getRiskDesk({ data: { q: next.q ?? q, all: next.all ?? all } })
      .then((d) => {
        setDesk(d);
        if (d.sweep) setNote(`Đã quét ${d.sweep.checked} tài khoản, ${d.sweep.made} cờ mới.`);
      })
      .catch((error: Error) => setNote(error.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = desk?.counts ?? {};
  return (
    <section className="admin-flow admin-wide" data-risk-board>
      <div className="admin-card space-y-3">
        <h2 className="font-semibold">Rủi ro: tài khoản có dấu hiệu vi phạm</h2>
        <p className="text-sm text-muted">
          Hệ thống tự kiểm theo từng ý của điều khoản và dựng cờ kèm hồ sơ bằng chứng chụp lúc phát hiện (giờ, địa chỉ mạng, máy, đơn, yêu cầu…) có mã băm
          SHA-256. Khách khiếu nại: tìm email hoặc mã hồ sơ (RR-…), bấm Tải hồ sơ để gửi ngay. Cờ chỉ là dấu hiệu, người xử lý quyết định.
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            ["Đang mở", counts.mo ?? 0],
            ["Đã khóa", counts["da-khoa"] ?? 0],
            ["Đã cấm", counts["da-cam"] ?? 0],
            ["Đã bỏ qua", counts["bo-qua"] ?? 0],
          ].map(([label, n]) => (
            <p key={label as string} className="rounded-[var(--radius-ctl)] border border-line p-2">
              {label}
              <br />
              <b>{n}</b>
            </p>
          ))}
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            load();
          }}
        >
          <input className={field + " min-w-0 flex-1"} placeholder="Email hoặc mã hồ sơ RR-…" value={q} onChange={(event) => setQ(event.target.value)} />
          <button type="submit" className="min-tap rounded-full border border-line px-4 text-sm">
            Tìm
          </button>
          <button
            type="button"
            className="min-tap rounded-full border border-line px-4 text-sm"
            aria-pressed={all}
            onClick={() => {
              setAll(!all);
              load({ all: !all });
            }}
          >
            {all ? "Chỉ cờ đang mở" : "Xem cả cờ đã xử lý"}
          </button>
          <button
            type="button"
            disabled={busy}
            className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40"
            onClick={() => {
              setBusy(true);
              void runRiskSweep()
                .then((r) => {
                  setNote(`Đã quét ${r.checked} tài khoản, ${r.made} cờ mới.`);
                  load();
                })
                .catch((error: Error) => setNote(error.message))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Đang quét…" : "Quét ngay"}
          </button>
        </form>
        {note ? <p className="text-sm text-muted">{note}</p> : null}
      </div>

      <div className="admin-card space-y-3" data-risk-flags>
        {!desk && <p className="text-sm text-muted">Đang tải…</p>}
        {desk && desk.flags.length === 0 && <p className="text-sm text-muted">Không có cờ nào{q ? " khớp" : " đang mở"}.</p>}
        {desk?.flags.map((flag) => <FlagCard key={flag.id} flag={flag} canBan={desk.canBan} onDone={(text) => { setNote(text); load(); }} />)}
      </div>

      <ManualFlag onDone={(text) => { setNote(text); load(); }} />
      {desk?.canEdit ? <RuleSettings settings={desk.settings} onSaved={(text) => { setNote(text); load(); }} /> : null}
    </section>
  );
}

function FlagCard({ flag, canBan, onDone }: { flag: RiskFlagView; canBan: boolean; onDone: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const decide = (action: "bo-qua" | "khoa" | "cam") => {
    setBusy(true);
    void decideRiskFlag({ data: { id: flag.id, action, note: text } })
      .then(() => onDone(action === "bo-qua" ? `Đã bỏ qua RR-${flag.id}.` : `Đã ${action === "cam" ? "cấm" : "khóa"} ${flag.email} (RR-${flag.id}).`))
      .catch((error: Error) => onDone(error.message))
      .finally(() => setBusy(false));
  };
  return (
    <article className="grid gap-2 rounded-[var(--radius-ctl)] border border-line p-3 text-sm" data-risk-flag={flag.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{flag.title}</p>
          <p className="break-all text-muted">
            {flag.email} · RR-{flag.id} · điểm {flag.score}
          </p>
        </div>
        <span className={"shrink-0 rounded-full px-3 py-1 text-xs font-semibold " + (flag.recommend === "cam" ? "bg-error/15 text-error" : "bg-warning/15 text-warning")}>
          Đề xuất {flag.recommend === "cam" ? "cấm" : "khóa"}
        </span>
      </div>
      <p>{flag.summary}</p>
      <p className="text-xs text-muted">
        {flag.termsRef} · {STATUS[flag.status] ?? flag.status} · {STANDING[flag.standing] ?? flag.standing} · phát hiện {when(flag.createdAt)}
        {flag.updatedAt !== flag.createdAt ? ` · cập nhật ${when(flag.updatedAt)}` : ""}
        {flag.autoAction ? ` · ${AUTO[flag.autoAction] ?? flag.autoAction}` : ""}
        {flag.decidedAt ? ` · xử lý ${when(flag.decidedAt)} bởi ${flag.decidedBy}${flag.note ? `: ${flag.note}` : ""}` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Ẩn bằng chứng" : "Xem bằng chứng"}
        </button>
        <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" onClick={() => download(`ho-so-RR-${flag.id}.txt`, flag.report)}>
          Tải hồ sơ
        </button>
        <CopyButton text={flag.report} label="Chép hồ sơ" />
      </div>
      {open && (
        <div className="grid gap-3">
          {flag.sections.map((section) => (
            <div key={section.title} className="grid gap-1">
              <p className="font-medium">
                {section.title} ({section.rows.length})
              </p>
              <div className="max-h-72 overflow-auto overscroll-contain rounded-[var(--radius-ctl)] border border-line">
                <table className="w-full min-w-max text-left text-xs">
                  <thead className="sticky top-0 bg-raised">
                    <tr>
                      {section.columns.map((c) => (
                        <th key={c} className="px-2 py-1 font-semibold">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, i) => (
                      <tr key={i} className="border-t border-line">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="break-all text-xs text-muted">Mã băm SHA-256: {flag.hash}</p>
        </div>
      )}
      {flag.status === "mo" && (
        <div className="grid gap-2 border-t border-line pt-2">
          <input className={field} placeholder="Ghi chú xử lý (bắt buộc khi bỏ qua)" value={text} onChange={(event) => setText(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} className="min-tap rounded-full border border-line px-4 text-sm disabled:opacity-40" onClick={() => decide("bo-qua")}>
              Bỏ qua
            </button>
            <button type="button" disabled={busy} className="min-tap rounded-full border border-warning px-4 text-sm text-warning disabled:opacity-40" onClick={() => decide("khoa")}>
              Khóa tài khoản
            </button>
            <button
              type="button"
              disabled={busy || !canBan}
              title={canBan ? "" : "Chỉ Admin được cấm"}
              className="min-tap rounded-full border border-error px-4 text-sm text-error disabled:opacity-40"
              onClick={() => decide("cam")}
            >
              Cấm
            </button>
          </div>
          <p className="text-xs text-muted">Lý do khóa/cấm gửi khách tự ghi điều khoản và mã hồ sơ RR-{flag.id}. Mọi thao tác ghi vào Nhật ký thao tác.</p>
        </div>
      )}
    </article>
  );
}

function ManualFlag({ onDone }: { onDone: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(0);
  const [what, setWhat] = useState("");
  const [proof, setProof] = useState("");
  return (
    <div className="admin-card space-y-3" data-risk-manual>
      <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Đóng ghi cờ tay" : "Ghi cờ tay (khiếu nại bản quyền, nội dung cấm…)"}
      </button>
      {open && (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void addManualFlag({ data: { email, terms, note: what, proof } })
              .then((r) => {
                onDone(`Đã ghi cờ RR-${r.id}.`);
                setOpen(false);
                setEmail("");
                setWhat("");
                setProof("");
              })
              .catch((error: Error) => onDone(error.message));
          }}
        >
          <label className="grid gap-1 text-sm">
            <span>Email tài khoản</span>
            <input className={field} value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Ý điều khoản vi phạm</span>
            <select className={field} value={terms} onChange={(event) => setTerms(Number(event.target.value))}>
              {MANUAL_TERMS.map((t, i) => (
                <option key={t.ref} value={i}>
                  {t.ref}: {t.text}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span>Mô tả việc vi phạm</span>
            <textarea className={field + " min-h-20 py-2"} value={what} onChange={(event) => setWhat(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Bằng chứng (mỗi dòng một mục: đường dẫn, mã khiếu nại, tên tệp, thời điểm…)</span>
            <textarea className={field + " min-h-28 py-2"} value={proof} onChange={(event) => setProof(event.target.value)} required />
          </label>
          <button type="submit" className="min-tap w-fit rounded-full bg-accent px-6 text-sm font-semibold text-ink">
            Ghi cờ
          </button>
        </form>
      )}
    </div>
  );
}

function RuleSettings({ settings, onSaved }: { settings: RiskSettings; onSaved: (text: string) => void }) {
  const [draft, setDraft] = useState<RiskSettings>(settings);
  const [open, setOpen] = useState(false);
  useEffect(() => setDraft(settings), [settings]);
  return (
    <div className="admin-card space-y-3" data-risk-settings>
      <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Đóng ngưỡng luật" : "Ngưỡng từng luật (chỉ Admin)"}
      </button>
      {open && (
        <div className="grid gap-3">
          {RISK_RULES.filter((rule) => rule.id !== "thu-cong").map((rule) => {
            const s = draft[rule.id];
            const set = (next: Partial<typeof s>) => setDraft({ ...draft, [rule.id]: { ...s, ...next } });
            return (
              <div key={rule.id} className="grid gap-2 rounded-[var(--radius-ctl)] border border-line p-3 text-sm">
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" className="h-5 w-5" checked={s.on} onChange={(event) => set({ on: event.target.checked })} />
                  {rule.title}
                </label>
                <p className="text-xs text-muted">
                  {rule.termsRef}: «{rule.termsText}» · Đề xuất {rule.recommend === "cam" ? "cấm" : "khóa"}
                </p>
                <p className="text-xs">{rule.how(s.p)}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {rule.params.map((param) => (
                    <label key={param.key} className="grid gap-1 text-xs">
                      <span>
                        {param.label} ({param.min}–{param.max})
                      </span>
                      <input
                        inputMode="numeric"
                        className={field}
                        value={s.p[param.key]}
                        onChange={(event) => set({ p: { ...s.p, [param.key]: Number(event.target.value) || 0 } })}
                      />
                    </label>
                  ))}
                  {rule.autos.length > 1 && (
                    <label className="grid gap-1 text-xs">
                      <span>Khi phát hiện</span>
                      <select className={field} value={s.auto} onChange={(event) => set({ auto: event.target.value as RiskAuto })}>
                        {rule.autos.map((a) => (
                          <option key={a} value={a}>
                            {AUTO_LABEL[a]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="min-tap w-fit rounded-full bg-accent px-6 text-sm font-semibold text-ink"
            onClick={() =>
              void saveRiskSettings({ data: draft })
                .then(() => onSaved("Đã lưu ngưỡng luật. Số ngoài khoảng cho phép được kẹp lại."))
                .catch((error: Error) => onSaved(error.message))
            }
          >
            Lưu ngưỡng
          </button>
        </div>
      )}
    </div>
  );
}
