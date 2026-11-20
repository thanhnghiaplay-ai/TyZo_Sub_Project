import { useState } from "react";
import { runScore } from "@/lib/sub/asr-score-view";
import type { Lang } from "@/lib/sub/asr-score";

const LANGS: { id: Lang; label: string }[] = [
  { id: "zh", label: "Tiếng Trung" },
  { id: "ja", label: "Tiếng Nhật" },
  { id: "ko", label: "Tiếng Hàn" },
  { id: "en", label: "Tiếng Anh" },
];

const STATUS_STYLE = { pass: "bg-accent text-ink", warn: "border border-line font-semibold", fail: "border border-danger text-danger font-semibold" } as const;

/** Dán một tệp SRT (của bất kỳ nhà nhận dạng nào) để chấm: bỏ lời, câu bịa, lệch ngôn ngữ, lặp. Chạy trong trình duyệt, không gửi đi đâu. */
export function AsrScorePanel() {
  const [srt, setSrt] = useState("");
  const [lang, setLang] = useState<Lang>("zh");
  const [duration, setDuration] = useState("");
  const [reference, setReference] = useState("");
  const [run, setRun] = useState<ReturnType<typeof runScore> | null>(null);
  const input = "rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 outline-none";

  return (
    <details className="rounded-[var(--radius-card)] border border-line bg-bg p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Chấm nhận dạng (dán SRT)</summary>
      <p className="mt-2 text-muted">
        Dán tệp phụ đề gốc (chưa dịch) của một lần nhận dạng để xem có bỏ lời, dính câu bịa, lệch ngôn ngữ hay lặp ở chỗ nối không. Chạy ngay trong trình duyệt, không gửi nội dung đi đâu và không lưu.
        Ngưỡng chữ mỗi giây là mức chung (Trung/Nhật/Hàn 1,5; Anh 6), thoại thật sự thưa có thể bị báo oan.
      </p>
      <div className="mt-2 grid gap-2">
        <label className="grid gap-1">
          <span>Nội dung SRT</span>
          <textarea value={srt} onChange={(event) => setSrt(event.target.value)} rows={8} spellCheck={false} className={input + " font-mono text-xs"} placeholder={"1\n00:00:00,500 --> 00:00:03,200\n…"} />
        </label>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1">
            <span>Ngôn ngữ của lời nói</span>
            <select value={lang} onChange={(event) => setLang(event.target.value as Lang)} className={input}>
              {LANGS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span>Độ dài video (giây, có thể để trống)</span>
            <input inputMode="decimal" value={duration} onChange={(event) => setDuration(event.target.value)} className={input} placeholder="Để trống: lấy mốc câu cuối" />
          </label>
        </div>
        <label className="grid gap-1">
          <span>Bản đáp án (tùy chọn, văn bản thuần đã được người rành duyệt)</span>
          <textarea value={reference} onChange={(event) => setReference(event.target.value)} rows={3} spellCheck={false} className={input} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 font-semibold text-ink" onClick={() => setRun(runScore({ srt, lang, durationText: duration, reference }))}>
            Chấm
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4"
            onClick={() => {
              setSrt("");
              setReference("");
              setDuration("");
              setRun(null);
            }}
          >
            Xóa hết
          </button>
        </div>
      </div>
      {run && !run.ok && <p className="mt-3 text-danger">{run.error}</p>}
      {run && run.ok && (
        <div className="mt-3 grid gap-2">
          <p>
            <span className={"inline-flex rounded-full px-3 py-1 " + STATUS_STYLE[run.verdict.status]}>{run.statusLabel}</span>
          </p>
          {run.verdict.fails.length > 0 && (
            <ul className="grid gap-1 text-danger">
              {run.verdict.fails.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          )}
          {run.verdict.warns.length > 0 && (
            <ul className="grid gap-1">
              {run.verdict.warns.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          )}
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            {run.rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </details>
  );
}
