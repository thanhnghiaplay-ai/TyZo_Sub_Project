import { useEffect, useState } from "react";
import { pushToast } from "@/components/toast";
import { r2AdminCheck, r2AdminInfo } from "@/lib/r2-upload";
import { R2_STEPS, r2CorsRules } from "@/lib/sub/r2-guide";

/** Chủ: kho tạm R2 cho tệp trên máy (âm thanh tách ở máy khách, tải thẳng lên R2, xóa sau khi nhận dạng xong). */
export function R2Board() {
  const [info, setInfo] = useState<{ ready: boolean; missing: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  useEffect(() => {
    void r2AdminInfo()
      .then(setInfo)
      .catch((error) => pushToast(error instanceof Error ? error.message : "Chưa đọc được trạng thái kho tạm R2.", "bad"));
  }, []);

  function check() {
    setBusy(true);
    setResult(null);
    void r2AdminCheck()
      .then(setResult)
      .catch((error) => setResult({ ok: false, message: error instanceof Error ? error.message : "Không kiểm tra được." }))
      .finally(() => setBusy(false));
  }

  return (
    <section className="admin-card grid content-start gap-2">
      <h3 className="text-sm font-semibold">Kho tạm R2 (tệp trên máy)</h3>
      <p className="text-sm text-muted">
        Cho khách chọn tệp trên máy với các nhà chỉ nhận link (Deepgram, AssemblyAI, Speechmatics, Soniox, ElevenLabs, Alibaba). Âm thanh tách ở máy khách, tải thẳng lên R2, xóa ngay khi nhận dạng xong. Chưa đặt biến môi trường thì tính năng tắt.
      </p>
      <p className="text-sm">
        {info === null ? "Đang đọc…" : info.ready ? "Đã đặt đủ 4 biến môi trường." : `Còn thiếu: ${info.missing.join(", ")}.`}
      </p>
      <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line px-3 text-sm" disabled={busy || !info?.ready} onClick={check}>
        {busy ? "Đang thử…" : "Kiểm tra kết nối"}
      </button>
      {result ? <p className={"text-sm " + (result.ok ? "" : "text-bad")}>{result.message}</p> : null}
      <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted">
        {R2_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <label className="grid gap-1 text-xs font-semibold text-muted">
        Quy tắc CORS cho tên miền đang mở (thêm tên miền khác khi dời web)
        <textarea className="w-full min-w-0 rounded-[var(--radius-ctl)] border border-line bg-bg p-2 font-mono text-xs" rows={9} readOnly value={r2CorsRules([origin])} onFocus={(event) => event.currentTarget.select()} />
      </label>
    </section>
  );
}
