import { useEffect, useState } from "react";
import { buildDiagnosticsExport, REJECT_LABEL, summarizeDiagnostics, type RejectEntry, type RawAsrPart } from "@/lib/sub/diagnostics";
import { DEFAULT_QUALITY_THRESHOLDS, summarizeQuality, type LangCheckReport, type QualityThresholds } from "@/lib/sub/quality";
import { loadQualityThresholds } from "@/lib/quality-load";
import { BandBar, HealthPill, pct } from "@/components/quality-view";
import { formatPartSpan, formatSeconds, type AsrRetryReport } from "@/lib/sub/asr-retry";
import type { FilterRetryReport } from "@/lib/sub/filter-retry";

/** Bảng chẩn đoán nhận dạng (AsrDiag) của phòng dịch. Tách từ studio.tsx (23/11/2026). */

function stamp(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds * 10) / 10);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const rem = (total % 60).toFixed(1).padStart(4, "0");
  return (h ? `${h}:${String(m).padStart(2, "0")}` : String(m)) + ":" + rem;
}

function scoreBit(value: number | undefined): string {
  return typeof value === "number" ? value.toFixed(2) : "—";
}

export function AsrDiag({
  raw,
  rejects,
  kept,
  fileName,
  retry,
  filterRetry,
  lang,
  onPlay,
  onKeep,
  onDrop,
}: {
  raw: RawAsrPart[];
  rejects: RejectEntry[];
  kept: number;
  fileName?: string;
  retry: AsrRetryReport | null;
  filterRetry: FilterRetryReport | null;
  lang: LangCheckReport | null;
  onPlay: (row: RejectEntry) => void;
  onKeep: (index: number) => void;
  onDrop: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [thresholds, setThresholds] = useState<QualityThresholds>(DEFAULT_QUALITY_THRESHOLDS);
  useEffect(() => {
    let alive = true;
    void loadQualityThresholds().then((next) => {
      if (alive) setThresholds(next);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!raw.length && !rejects.length && !retry?.missing.length && !(retry && retry.usedSeconds > 0) && !(filterRetry && (filterRetry.sent > 0 || filterRetry.deferred > 0))) return null;
  const summary = summarizeDiagnostics(rejects, raw);
  const quality = summarizeQuality({ raw, rejects, kept, lang, thresholds });
  const download = () => {
    const doc = { exportedAt: new Date().toISOString(), ...buildDiagnosticsExport({ rejects, raw, kept }), quality, langCheck: lang };
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    const href = URL.createObjectURL(blob);
    link.href = href;
    link.download = ((fileName || "phu-de").replace(/\.[^.]+$/, "") || "phu-de") + "-chan-doan.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };
  return (
    <div className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-bg p-3">
      <div>
        <h3 className="font-semibold">Chẩn đoán câu bị loại</h3>
        <p className="text-sm text-muted">Không đổi phụ đề. Phân biệt đoạn Whisper không trả câu với câu app tự lọc.</p>
      </div>
      <div className="grid gap-2 rounded-[var(--radius-ctl)] border border-line p-3">
        <HealthPill health={quality.health} reason={quality.healthReason} />
        <p className="text-sm">
          Độ tin trung bình: <span className="font-semibold">{pct(quality.meanConfidence)}</span>
          <span className="text-muted"> · {quality.segments} câu Whisper trả về</span>
        </p>
        <BandBar bands={quality.bands} />
        {quality.byLanguage.length > 0 && (
          <ul className="grid gap-1 text-sm text-muted">
            {quality.byLanguage.map((row) => (
              <li key={row.language}>
                {row.language}: {row.segments} câu · độ tin {pct(row.meanConfidence)}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">Độ tin là mức Whisper tự tin vào chữ nó viết. Không phải tỷ lệ đúng.</p>
      </div>
      {lang && (lang.suspect > 0 || lang.resent > 0) && (
        <div className="grid gap-1 rounded-[var(--radius-ctl)] border border-line p-3 text-sm">
          <p className="font-semibold">Kiểm tra ngôn ngữ từng đoạn</p>
          <p>
            Nghi lệch {lang.suspect} đoạn · gửi lại {lang.resent} · đổi sang bản mới {lang.swapped} · dùng {Math.round(lang.usedSeconds)} / {lang.budgetSeconds} giây
          </p>
          {quality.langCheck.meanBefore !== null && quality.langCheck.meanAfter !== null && (
            <p className="text-muted">
              Độ tin các đoạn đã đổi: {pct(quality.langCheck.meanBefore)} → {pct(quality.langCheck.meanAfter)}
            </p>
          )}
          {lang.suspect > lang.resent && <p className="text-muted">{lang.suspect - lang.resent} đoạn chưa gửi lại vì hết ngân sách.</p>}
          {lang.events.length > 0 && (
            <ul className="grid max-h-40 gap-1 overflow-auto text-muted">
              {lang.events.map((e, i) => (
                <li key={`${e.partIndex}-${i}`}>
                  {stamp(e.start)} · chọn {e.requested} → đoán {e.detected || "?"} · {e.swapped ? "đã đổi" : "giữ bản cũ"} · {pct(Math.exp(e.logprobBefore ?? NaN))} → {pct(Math.exp(e.logprobAfter ?? NaN))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="rounded-[var(--radius-ctl)] border border-line px-3 py-2">
          <span className="block text-muted">Whisper không trả câu</span>
          <span className="font-semibold">{summary.whisperEmptyParts} đoạn</span>
        </p>
        <p className="rounded-[var(--radius-ctl)] border border-line px-3 py-2">
          <span className="block text-muted">App lọc bỏ</span>
          <span className="font-semibold">{summary.appFiltered} câu</span>
        </p>
        <p className="rounded-[var(--radius-ctl)] border border-line px-3 py-2">
          <span className="block text-muted">Im lặng, không gửi</span>
          <span className="font-semibold">{summary.silenceParts} đoạn</span>
        </p>
        <p className="rounded-[var(--radius-ctl)] border border-line px-3 py-2">
          <span className="block text-muted">Không giải mã được</span>
          <span className="font-semibold">{summary.decodeFailParts} đoạn</span>
        </p>
      </div>
      <p className="text-sm text-muted">
        Giữ lại {kept} câu. Whisper có chữ ở {summary.whisperParts} đoạn.
      </p>
      {retry && (retry.usedSeconds > 0 || retry.missing.length > 0) && (
        <div className="grid gap-1 text-sm">
          <p>
            Thử lại đoạn lỗi: đã dùng {formatSeconds(retry.usedSeconds)} (ngân sách {formatSeconds(retry.budgetSeconds)}, mỗi đoạn một lần).
          </p>
          {retry.missing.length === 0 ? (
            <p className="text-muted">Các đoạn lỗi đã nhận dạng lại được.</p>
          ) : (
            <ul className="grid gap-1">
              {retry.missing.map((part) => (
                <li key={part.index}>
                  {formatPartSpan(part)}
                  {part.retried ? " — vẫn chưa nhận dạng được" : " — chưa thử lại vì hết ngân sách"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {filterRetry && (filterRetry.sent > 0 || filterRetry.deferred > 0) && (
        <p className="text-sm">
          Thử lại câu không chắc: đã gửi {filterRetry.sent} đoạn, dùng {formatSeconds(filterRetry.usedSeconds)} (ngân sách {formatSeconds(filterRetry.budgetSeconds)}).
          {filterRetry.deferred > 0 ? ` Còn ${filterRetry.deferred} đoạn vì hết ngân sách.` : ""} Không gửi câu đã bấm Bỏ, và không dùng ngân sách thử lại lỗi giải mã.
        </p>
      )}
      {summary.byReason.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {summary.byReason.map((row) => (
            <li key={row.reason} className="flex justify-between gap-3">
              <span>{row.label}</span>
              <span className="text-muted">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
      {summary.byLanguage.length > 0 && (
        <ul className="grid gap-1 text-sm text-muted">
          {summary.byLanguage.map((row) => (
            <li key={row.language}>
              {row.language}: {row.rawParts} đoạn · Whisper trống {row.whisperEmptyParts} · app lọc {row.appFiltered} · im lặng {row.silenceParts}
              {row.decodeFailParts ? ` · không giải mã ${row.decodeFailParts}` : ""}
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line text-sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Thu gọn" : "Xem danh sách"}
        </button>
        <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line text-sm" onClick={download}>
          Xuất JSON
        </button>
      </div>
      {open && (
        <div className="grid max-h-64 gap-2 overflow-auto text-sm">
          {rejects.length === 0 && <p className="text-muted">Chưa có câu nào bị app lọc. Các đoạn trống nằm ở phần tóm tắt phía trên.</p>}
          {rejects.map((row, index) => (
            <div key={`${row.partIndex}-${row.start}-${index}`} className="grid gap-2 border-b border-line pb-2">
              <p>
                <span className="text-muted">
                  {stamp(row.start)} · đoạn {row.partIndex + 1} · {row.language} · {REJECT_LABEL[row.reason]}
                </span>
                <span className="block">{row.text || "(trống)"}</span>
                <span className="text-muted">
                  no_speech {scoreBit(row.no_speech_prob)} · logprob {scoreBit(row.avg_logprob)} · nén {scoreBit(row.compression_ratio)}
                </span>
              </p>
              {row.dismissed ? (
                <p className="text-muted">Đã bỏ. Không đưa vào phụ đề.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line text-sm" onClick={() => onPlay(row)} disabled={row.start == null || row.end == null}>
                    Nghe
                  </button>
                  <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line text-sm" onClick={() => onKeep(index)} disabled={row.start == null || row.end == null}>
                    Giữ
                  </button>
                  <button type="button" className="min-tap rounded-[var(--radius-ctl)] border border-line text-sm" onClick={() => onDrop(index)}>
                    Bỏ
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
