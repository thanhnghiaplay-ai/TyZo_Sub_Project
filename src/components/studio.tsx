import { isStudioSheet } from "@/lib/studio-layout";
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { AccountPanel } from "@/components/account-panel";
import { getMyPlace, submitAppeal, touchPresence, type MyPlace } from "@/lib/admin-room";
import { Link } from "@tanstack/react-router";
import { retryLoad } from "@/lib/retry-load";
import { signOut } from "@/lib/auth/client";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Clapperboard,
  Eye,
  EyeOff,
  FileAudio,
  CircleHelp,
  Link2,
  Loader2,
  Menu,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  Settings,
  Square,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from "lucide-react";
import { usePipeline } from "@/components/use-pipeline";
import { useOnline } from "@/lib/use-online";
import { useLinkCheck } from "@/components/use-link-check";
import { pushToast } from "@/components/toast";
import { groqListHolds } from "@/lib/sub/asr-house";
import { ownKeyAvailable, rentOpen } from "@/lib/rent-show";
import { useRentShow } from "@/components/rent-show-board";
import { TurnPackList } from "@/components/turn-pack-list";
import { turnPackModels } from "@/lib/turn-pack";
import { AccountStrip } from "@/components/account-strip";
import { BrandMark } from "@/components/brand-mark";
import { NoticeBell } from "@/components/notice-bell";
import { DisplayToggle } from "@/components/display-toggle";
import { RunDoorClosed, roomCustom, useRunDoor } from "@/components/run-door";
import { DragSlider } from "@/components/drag-slider";
import { VersionMark } from "@/components/version-mark";
import { PlayerDrop } from "@/components/player-drop";
import { StepsBar } from "@/components/steps-bar";
import { GuidedTour } from "@/components/guided-tour";
import { tourSeen } from "@/components/tour-seen";
import { isMediaFile, useFileThumb, type FileThumb } from "@/components/file-thumb";
import { TIER_LABEL, VOICE_LANES, modelLabel, resolveVoiceLane, voiceLaneOf } from "@/lib/sub/models";
import { type GroqBoard } from "@/lib/sub/groq-board";
import { formatRoomPrice } from "@/lib/run-desk";
import { createNarrator, defaultOrpheusVoice, guessGender, orpheusVoices, sampleLine } from "@/lib/sub/narration";
import { edgeVoice } from "@/lib/sub/edge-voice";
import { narrationChoice } from "@/lib/sub/cast-voice";
import { LANGS, SRC_LANGS, cueText, findCueIndex, fmt, orpheusReady, speechIndex, speechLang } from "@/lib/sub/text";
import { termsToCsv, usesBaseGlossary } from "@/lib/sub/glossary";
import { buildDiagnosticsExport, REJECT_LABEL, summarizeDiagnostics, type RejectEntry, type RawAsrPart } from "@/lib/sub/diagnostics";
import { DEFAULT_QUALITY_THRESHOLDS, summarizeQuality, type LangCheckReport, type QualityThresholds } from "@/lib/sub/quality";
import { loadQualityThresholds } from "@/lib/quality-load";
import { BandBar, HealthPill, pct } from "@/components/quality-view";
import { formatPartSpan, formatSeconds, type AsrRetryReport } from "@/lib/sub/asr-retry";
import type { FilterRetryReport } from "@/lib/sub/filter-retry";
import { NARRATION_DEFAULT, type ChatModel, type NarrationSettings, type Seg } from "@/lib/sub/types";

const KEY_MODE_TIP = "Dùng key Groq của bạn. Groq tính tiền nhận dạng và dịch cho bạn, phòng không trừ ví cho lượt chạy.";
const TURN_MODE_TIP = "Dùng key của phòng, bạn không nhập key. Phòng giữ trước một khoản ước tính từ ví, trừ số thực khi xong và trả phần thừa. Không trừ ngày gói.";

const EXPORT_EMPTY = "Chưa có phụ đề nào. Hãy chọn video và bấm Tải và dịch trước.";
const FIELD =
  "min-tap w-full rounded-xl border border-line bg-bg px-3 text-base text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent";

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

function AsrDiag({
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
    <div className="grid gap-3 rounded-2xl border border-line bg-bg p-3">
      <div>
        <h3 className="font-semibold">Chẩn đoán câu bị loại</h3>
        <p className="text-sm text-muted">Không đổi phụ đề. Phân biệt đoạn Whisper không trả câu với câu app tự lọc.</p>
      </div>
      <div className="grid gap-2 rounded-xl border border-line p-3">
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
        <div className="grid gap-1 rounded-xl border border-line p-3 text-sm">
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
        <p className="rounded-xl border border-line px-3 py-2">
          <span className="block text-muted">Whisper không trả câu</span>
          <span className="font-semibold">{summary.whisperEmptyParts} đoạn</span>
        </p>
        <p className="rounded-xl border border-line px-3 py-2">
          <span className="block text-muted">App lọc bỏ</span>
          <span className="font-semibold">{summary.appFiltered} câu</span>
        </p>
        <p className="rounded-xl border border-line px-3 py-2">
          <span className="block text-muted">Im lặng, không gửi</span>
          <span className="font-semibold">{summary.silenceParts} đoạn</span>
        </p>
        <p className="rounded-xl border border-line px-3 py-2">
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
        <button type="button" className="min-tap rounded-xl border border-line text-sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Thu gọn" : "Xem danh sách"}
        </button>
        <button type="button" className="min-tap rounded-xl border border-line text-sm" onClick={download}>
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
                  <button type="button" className="min-tap rounded-xl border border-line text-sm" onClick={() => onPlay(row)} disabled={row.start == null || row.end == null}>
                    Nghe
                  </button>
                  <button type="button" className="min-tap rounded-xl border border-line text-sm" onClick={() => onKeep(index)} disabled={row.start == null || row.end == null}>
                    Giữ
                  </button>
                  <button type="button" className="min-tap rounded-xl border border-line text-sm" onClick={() => onDrop(index)}>
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

function GlossaryEditor({ app }: { app: ReturnType<typeof usePipeline> }) {
  const [src, setSrc] = useState("");
  const [tgt, setTgt] = useState("");
  const [note, setNote] = useState("");
  const [share, setShare] = useState(false);
  useEffect(() => {
    try {
      setShare(localStorage.getItem("gshare") === "1");
    } catch {
      setShare(false);
    }
  }, []);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const add = () => {
    app.addUserTerm(src, tgt);
    setSrc("");
    setTgt("");
    setNote(`Đã thêm «${src.trim()}».`);
  };
  return (
    <div className="grid gap-2 pb-2">
      <p className="text-muted text-xs">
        Term của bạn lưu trên máy này, theo đúng cặp ngôn ngữ × thể loại đang chọn, và ghi đè file của thể loại đó khi trùng. File không dùng chung giữa các thể loại. Tiếng Nhật khớp thêm đuôi nói thường gặp (ます / た / ない / する). CSV: cột source, target (hoặc mỗi dòng «gốc = dịch»).
      </p>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input className={FIELD} placeholder="Từ gốc" value={src} onChange={(e) => setSrc(e.target.value)} />
        <input className={FIELD} placeholder="Cách dịch" value={tgt} onChange={(e) => setTgt(e.target.value)} />
        <button type="button" className="min-tap rounded-xl bg-accent px-3 text-sm font-semibold text-ink" onClick={add} disabled={!src.trim()}>
          Thêm
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-tap rounded-xl border border-line px-3 text-sm" onClick={() => fileRef.current?.click()}>
          Nhập CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const text = await file.text();
            const n = app.importUserCsv(text);
            setNote(n ? `Đã nhập ${n} dòng.` : "Không đọc được dòng nào.");
          }}
        />
        <button
          type="button"
          className="min-tap rounded-xl border border-line px-3 text-sm"
          disabled={!app.userTerms.length}
          onClick={() => {
            const blob = new Blob([termsToCsv(app.userTerms)], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "glossary.csv";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Xuất CSV
        </button>
        <button
          type="button"
          className="min-tap rounded-xl border border-line px-3 text-sm"
          disabled={!app.userTerms.length}
          onClick={() => {
            app.clearUserTerms();
            setNote("Đã xóa thuật ngữ bạn thêm cho cặp này.");
          }}
        >
          Xóa của tôi
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={share}
          onChange={(event) => {
            const on = event.target.checked;
            setShare(on);
            localStorage.setItem("gshare", on ? "1" : "0");
            setNote(on ? "Sẽ gửi bản sao thuật ngữ của bạn khi bạn thêm." : "Không gửi thuật ngữ lên phòng.");
          }}
        />
        Gửi thuật ngữ của tôi để phòng xem. Mặc định tắt. Phòng chưa dùng cho người khác cho đến khi Chủ nhận.
      </label>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
      <div className="grid max-h-48 gap-1 overflow-auto text-sm">
        {(app.glossaryInfo?.terms || [])
          .filter((t: { user?: boolean }) => t.user)
          .map((t: { source: string; target: string; user?: boolean }) => (
            <div key={"u-" + t.source} className="flex items-center gap-2 border-b border-line/50 py-0.5">
            <span className="min-w-0 flex-1 truncate font-medium">{t.source}</span>
            <span className="text-muted">→</span>
            <span className="min-w-0 flex-1 truncate">{t.target}</span>
            {t.user ? (
              <button type="button" className="shrink-0 text-xs text-muted" onClick={() => app.removeUserTerm(t.source)} aria-label="Xóa">
                xóa
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
const FONTS = [
  '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif',
  'Georgia, "Times New Roman", serif',
  '"Courier New", monospace',
  'Impact, "Arial Black", sans-serif',
  '"Segoe Print", cursive',
];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const ARS: Array<[string, string | number]> = [
  ["Vừa khung", "contain"],
  ["Lấp đầy", "cover"],
  ["Kéo giãn", "fill"],
  ["16:9", 16 / 9],
  ["4:3", 4 / 3],
  ["21:9", 21 / 9],
];

type SubStyle = { on: boolean; font: string; size: number; col: string; bgm: string; op: number; pos: number; off: number };
const SUB_LEGACY: SubStyle = { on: true, font: "0", size: 100, col: "#ffffff", bgm: "box", op: 70, pos: 12, off: 0 };
const SUB_DEF: SubStyle = { on: true, font: "0", size: 50, col: "#ffffff", bgm: "box", op: 0, pos: 3, off: 0 };
const STYLE_KEYS = ["on", "font", "size", "col", "bgm", "op", "pos", "off"] as const;

function loadSub(): SubStyle {
  try {
    const raw = localStorage.getItem("gset");
    if (!raw) return SUB_DEF;
    const parsed = JSON.parse(raw) as Partial<SubStyle>;
    if (localStorage.getItem("gset_v") === "2") return { ...SUB_DEF, ...parsed };
    localStorage.setItem("gset_v", "2");
    const untouched = STYLE_KEYS.every((key) => parsed[key] === undefined || parsed[key] === SUB_LEGACY[key]);
    return untouched ? SUB_DEF : { ...SUB_DEF, ...parsed };
  } catch {
    return SUB_DEF;
  }
}

function loadNarration(): NarrationSettings {
  try {
    const raw = localStorage.getItem("gnarr");
    const version = localStorage.getItem("gnarr_v");
    if (!raw) {
      localStorage.setItem("gnarr_v", "4");
      return NARRATION_DEFAULT;
    }
    const parsed = JSON.parse(raw) as Partial<NarrationSettings>;
    const merged = { ...NARRATION_DEFAULT, ...parsed };
    if (merged.engine === "edge" && merged.gender === "any") merged.gender = "female";
    if (version === "4") return merged;
    localStorage.setItem("gnarr_v", "4");
    if (parsed.enabled === undefined) merged.enabled = true;
    if (parsed.lead === undefined) merged.lead = 0;
    merged.lead = Math.min(2, Math.max(-1.5, Number(merged.lead) || 0));
    if (parsed.matchCast === undefined) merged.matchCast = true;
    return merged;
  } catch {
    return NARRATION_DEFAULT;
  }
}

const TOOLS = [
  ["key", "Key Sub"],
  ["phim", "Phim"],
  ["cast", "Nhân vật"],
  ["voice", "Nghe"],
  ["check", "Kiểm tra"],
] as const;

export function Studio() {
  const app = usePipeline();
  const online = useOnline();
  const linkCheck = useLinkCheck();
  const noSubs = app.segs.length === 0;
  const pickedFile = app.file || app.audioFile;
  const thumb = useFileThumb(pickedFile);
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (tourSeen()) return;
    const timer = window.setTimeout(() => setTourOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, []);
  const [showKey, setShowKey] = useState(false);
  // Câu đang sửa nhớ theo nội dung, không theo số thứ tự: câu mới chen vào danh sách thì ô sửa không nhảy sang câu khác.
  const [editKey, setEditKey] = useState<{ start: number; end: number; original: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [rule, setRule] = useState("");
  const editing = editKey ? app.segs.findIndex((item) => item.start === editKey.start && item.end === editKey.end && item.original === editKey.original) : -1;
  const openEdit = useCallback((seg: { start: number; end: number; original: string; translation: string | null; translationFailed?: boolean }) => {
    setEditKey({ start: seg.start, end: seg.end, original: seg.original });
    setDraft(seg.translation && !seg.translationFailed ? seg.translation : "");
    setRule("");
  }, []);
  const jumpTo = useCallback((start: number) => jump(app.videoRef.current, start), [app.videoRef]);
  const [narration, setNarration] = useState<NarrationSettings>(NARRATION_DEFAULT);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [sub, setSub] = useState<SubStyle>(SUB_DEF);
  const [current, setCurrent] = useState(-1);
  const [toolTab, setToolTab] = useState<(typeof TOOLS)[number][0]>("key");
  const [product, setProduct] = useState<"sub" | "account">("sub");
  const [menuOpen, setMenuOpen] = useState(false);
  const [payByRoom, setPayByRoom] = useState(false);
  const [turnLocked, setTurnLocked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const runDoor = useRunDoor();
  const rentShow = useRentShow();
  const [place, setPlace] = useState<MyPlace | null>(null);
  const [appeal, setAppeal] = useState("");
  const [appealNotice, setAppealNotice] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);
  const statusRef = useRef<HTMLDialogElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const narrator = useRef(createNarrator());
  const live = useRef({ segs: app.segs, narration, key: app.key, target: app.target, bible: app.bible });
  live.current = { segs: app.segs, narration, key: app.key, target: app.target, bible: app.bible };

  useEffect(() => {
    setNarration(loadNarration());
    setSub(loadSub());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("gnarr", JSON.stringify(narration));
    } catch {
      /* ignore */
    }
  }, [narration, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("gset", JSON.stringify(sub));
    } catch {
      /* ignore */
    }
  }, [sub, hydrated]);
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() || []);
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, []);
  useEffect(() => {
    if (!narration.enabled) narrator.current.stop(app.videoRef.current);
  }, [narration.enabled, app.videoRef]);
  useEffect(() => {
    const voice = narrator.current;
    return () => voice.stop(app.videoRef.current);
  }, [app.videoRef]);
  useEffect(() => {
    if (product !== "account") return;
    app.videoRef.current?.pause();
  }, [product, app.videoRef]);
  useEffect(() => {
    if (!runDoor.ready || runDoor.open) return;
    setPayByRoom(false);
    app.setRoomPay(false);
  }, [runDoor.ready, runDoor.open, app.setRoomPay]);

  const pasteKey = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      app.setKey(text);
    } catch {
      document.getElementById("key")?.focus();
    }
  };

  const speakAt = (index: number) => {
    const { segs, narration: settings, key, target } = live.current;
    const video = app.videoRef.current;
    if (!settings.enabled || !video || video.paused || index < 0) {
      if (!settings.enabled || video?.paused) narrator.current.stop(video);
      return;
    }
    const seg = segs[index];
    if (!seg) return;
    const choice = seg.voiceLock
      ? { gender: seg.voiceLock, locked: true }
      : narrationChoice(settings.matchCast, settings.gender, seg.original, cueText(seg), seg.voice, live.current.bible);
    void narrator.current.speak({
      text: cueText(seg),
      settings: {
        ...settings,
        gender: choice.gender,
        matchCast: choice.locked,
      },
      target,
      key: payByRoom ? "room" : key.trim(),
      video,
      playbackRate: video.playbackRate || 1,
    });
  };

  const previewVoice = () => {
    void narrator.current.speak({
      text: sampleLine(app.target),
      settings: { ...narration, enabled: true, matchCast: false },
      target: app.target,
      key: payByRoom ? "room" : app.key.trim(),
      video: app.videoRef.current,
      playbackRate: 1,
    });
  };

  const patchNarration = (patch: Partial<NarrationSettings>) => setNarration((prev) => ({ ...prev, ...patch }));
  const cloud = orpheusReady(app.target);
  const prefix = speechLang(app.target).slice(0, 2).toLowerCase();
  const langVoices = voices.filter((voice) => voice.lang.replace("_", "-").toLowerCase().startsWith(prefix));
  const shownVoices = (langVoices.length ? langVoices : voices).filter(
    (voice) => narration.gender === "any" || guessGender(voice) === "any" || guessGender(voice) === narration.gender,
  );
  const pickTool = (id: (typeof TOOLS)[number][0]) => {
    const sheet = isStudioSheet();
    setSheetOpen((open) => (sheet && id === toolTab ? !open : true));
    setToolTab(id);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Đọc quyền có thử lại. Lỗi tạm thời thì giữ quyền đã biết, không xóa nút Quản lý.
  const placeSeq = useRef(0);
  const loadPlace = useCallback(async () => {
    const my = ++placeSeq.current;
    try {
      const next = await retryLoad(() => getMyPlace());
      if (my === placeSeq.current) setPlace(next);
    } catch {
      /* giữ nguyên quyền cũ; lần sau (quay lại tab, dịch xong) sẽ đọc lại */
    }
  }, []);

  useEffect(() => {
    void loadPlace();
    const ping = () => void touchPresence().catch(() => undefined);
    ping();
    const timer = window.setInterval(ping, 60_000);
    const onShow = () => {
      if (document.visibilityState === "visible") void loadPlace();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      placeSeq.current++;
    };
  }, [loadPlace]);

  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !app.running) void loadPlace();
    wasRunning.current = app.running;
  }, [app.running, loadPlace]);

  useEffect(() => {
    if (!app.reviewHold) return;
    setToolTab("cast");
    setSheetOpen(true);
  }, [app.reviewHold]);

  const showRoomPrice = runDoor.open && payByRoom;
  const groqAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.groq ?? null) : null;
  const aliAllow = !showRoomPrice && rentShow.ready ? (rentShow.show?.alibaba ?? null) : null;
  const ownVoice = ownKeyAvailable(app.remoteIds, groqAllow);
  const lockTurnModels = showRoomPrice && turnLocked;

  return (
    <main className="studio-shell">
      <header className="grid shrink-0 gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <BrandMark small title="TyZo Sub" />
            <p className="text-xs font-semibold text-accent">Phòng chiếu TyZo Sub</p>
          </div>
          <div className="flex items-center gap-2">
            <VersionMark />
            <DisplayToggle />
            <NoticeBell />
          </div>
        </div>
        <h1 className="text-xl font-semibold">Dịch phụ đề video</h1>
        <AccountStrip payByRoom={payByRoom} />
      </header>

      <nav aria-label="Chức năng" className="room-nav">
        <div data-product="sub" ref={menuRef} className="room-menu">
          <button
            type="button"
            className="room-menu-button"
            aria-expanded={menuOpen}
            aria-controls="room-menu-list"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu className="size-4" aria-hidden="true" />
            <span>{product === "account" ? "Tài khoản" : "Phụ đề"}</span>
          </button>
          {menuOpen && (
            <div id="room-menu-list" role="tablist" className="room-menu-list">
            <button
              type="button"
              aria-current={product === "sub" ? "page" : undefined}
              onClick={() => {
                setProduct("sub");
                setMenuOpen(false);
              }}
            >
              Phụ đề
            </button>
            <button
              type="button"
              data-product="account"
              aria-current={product === "account" ? "page" : undefined}
              onClick={() => {
                setProduct("account");
                setMenuOpen(false);
              }}
            >
              Tài khoản
            </button>
            {place?.role && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}>
                Quản lý
              </Link>
            )}
          </div>
          )}
        </div>
      </nav>

      {place?.status === "banned" ? (
        <div className="grid gap-3 p-4">
          <p className="text-sm">Tài khoản đã bị cấm{place.reason ? `: ${place.reason}` : ""}.</p>
          <Link to="/yeu-cau" className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink">
            Gửi yêu cầu xem lại
          </Link>
          <button type="button" className="min-tap w-fit rounded-full border border-line px-4 text-sm" onClick={() => void signOut("/login")}>
            Đăng xuất
          </button>
        </div>
      ) : (
      <>
      <div className={product === "account" ? "hidden" : "contents"}>
      {place?.status === "locked" && (
        <form
          className="grid gap-2 rounded-xl border border-line bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAppeal({ data: appeal })
              .then(() => {
                setAppeal("");
                setAppealNotice("Đã gửi yêu cầu xem lại.");
              })
              .catch((error) => setAppealNotice(error instanceof Error && error.message ? error.message : "Chưa gửi được yêu cầu."));
          }}
        >
          <p className="text-sm">Tài khoản đang bị khóa{place.reason ? `: ${place.reason}` : ""}. Bạn vẫn gửi được yêu cầu, nhưng không dịch và không xuất file.</p>
          <textarea value={appeal} onChange={(event) => setAppeal(event.target.value)} rows={3} className="rounded-xl border border-line bg-raised px-3 py-2 outline-none" placeholder="Lý do cần mở lại" />
          <button type="submit" className="min-tap w-fit rounded-full border border-line px-4 text-sm">
            Gửi yêu cầu
          </button>
          {appealNotice && <p className="text-sm text-muted">{appealNotice}</p>}
        </form>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          role="status"
          className={"line-clamp-2 h-10 min-w-[11rem] flex-1 text-left text-sm " + (app.isError ? "text-danger" : "text-muted")}
          onClick={() => statusRef.current?.showModal()}
        >
          {app.status}
        </button>
        <span
          className="shrink-0"
          title={noSubs ? EXPORT_EMPTY : undefined}
          onClick={noSubs ? () => pushToast(EXPORT_EMPTY, "bad") : undefined}
        >
          <button
            type="button"
            data-tour="export"
            disabled={noSubs || !online}
            aria-disabled={noSubs || !online}
            className="min-tap rounded-xl border border-line px-3 text-sm disabled:pointer-events-none disabled:opacity-40"
            onClick={() => void app.exportSrt()}
          >
            Xuất file Vietsub
          </button>
        </span>
        <button
          type="button"
          disabled={!online}
          title="Lưu chữ gốc Whisper nhận ra, từng câu theo giờ, trước khi dịch"
          className="min-tap shrink-0 rounded-xl border border-line px-3 text-sm disabled:opacity-40"
          onClick={() => void app.exportRaw()}
        >
          Lưu bản Whisper
        </button>
        {app.reviewHold && (
          <button type="button" disabled={!online} className="min-tap shrink-0 rounded-xl bg-accent px-3 text-sm font-semibold text-ink disabled:opacity-40" onClick={app.approveBible}>
            Dịch tiếp
          </button>
        )}
        <button type="button" aria-label="Xem hướng dẫn nhanh" title="Hướng dẫn nhanh" className="min-tap grid shrink-0 place-items-center rounded-xl border border-line px-3" onClick={() => setTourOpen(true)}>
          <CircleHelp className="size-4" />
        </button>
      </div>
      <StepsBar report={app.stages} />
      <GuidedTour open={tourOpen} onClose={() => setTourOpen(false)} />
      <dialog ref={statusRef} className="studio-note">
        <p className="text-sm">{app.status}</p>
        <button type="button" className="min-tap mt-3 rounded-full border border-line px-4 text-sm" onClick={() => statusRef.current?.close()}>
          Đóng
        </button>
      </dialog>

      <div
        role="tablist"
        aria-label="Công cụ phụ đề"
        className="studio-tabs"
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
          event.preventDefault();
          const index = TOOLS.findIndex((tool) => tool[0] === toolTab);
          const next =
            event.key === "Home"
              ? TOOLS[0][0]
              : event.key === "End"
                ? TOOLS[TOOLS.length - 1][0]
                : TOOLS[(index + (event.key === "ArrowRight" ? 1 : TOOLS.length - 1)) % TOOLS.length][0];
          if (next !== toolTab) pickTool(next);
          (event.currentTarget.querySelector(`#tool-tab-${next}`) as HTMLButtonElement | null)?.focus();
        }}
      >
        {TOOLS.map(([id, label]) => (
          <button
            key={id}
            id={`tool-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={toolTab === id}
            aria-controls={`tool-${id}`}
            tabIndex={toolTab === id ? 0 : -1}
            className={"min-tap shrink-0 rounded-full px-4 text-sm font-semibold " + (toolTab === id ? "bg-accent text-ink" : "border border-line")}
            onClick={() => pickTool(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={"studio-stage" + (sheetOpen ? " is-sheet" : "")}>
      <section data-workspace className="studio-workspace">
        <div className="studio-video">
        <Stage
          videoRef={app.videoRef}
          segs={app.segs}
          sub={sub}
          setSub={setSub}
          narrationOn={narration.enabled}
          lead={narration.lead}
          onCue={setCurrent}
          onSpeak={speakAt}
          speechBusy={() => narrator.current.busy()}
          onPause={() => narrator.current.stop(app.videoRef.current)}
          file={pickedFile}
          thumb={thumb}
          url={app.url}
          onFile={app.setFile}
          onUrl={app.setUrl}
        />
        </div>
        <section className="studio-cues grid gap-2 rounded-2xl border border-line bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Bản dịch</h2>
          </div>
          <p className="text-sm text-muted">Chạm một câu để tua. Nút Sửa để chỉnh và thêm thuật ngữ.</p>
          <div className="studio-cue-scroll">
            {app.segs.length === 0 && <p className="py-6 text-sm text-muted">Chưa có phụ đề. Hãy chọn video và bấm Tải và dịch.</p>}
            {app.segs.map((seg, index) => (
              <CueRow key={`${seg.start}-${seg.end}-${index}`} seg={seg} index={index} active={index === current} onJump={jumpTo} onEdit={openEdit} onVoice={app.cycleVoiceLock} />
            ))}
          </div>
        </section>
      </section>

      <div className={"studio-tools" + (sheetOpen ? " is-open" : "")}>
        <div className="studio-tool-card">
        <div className="studio-sheet-bar">
          <button type="button" className="studio-sheet-close" aria-label="Đóng tab" onClick={() => setSheetOpen(false)}>
            <X className="size-4" />
          </button>
        </div>
      <section id="tool-key" role="tabpanel" aria-labelledby="tool-tab-key" hidden={toolTab !== "key"} className="grid gap-3 p-4">
        {!runDoor.ready ? (
          <p className="text-sm text-muted">Đang đọc cửa trả theo lượt…</p>
        ) : runDoor.open ? (
          <div className="grid gap-2">
            <h2 className="text-sm font-semibold">Cách trả</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" title={KEY_MODE_TIP} aria-describedby="pay-mode-note" className={"min-tap rounded-xl text-sm font-semibold " + (!payByRoom ? "bg-accent text-ink" : "border border-line")} onClick={() => { setPayByRoom(false); app.setRoomPay(false); }}>
                Key của tôi
              </button>
              <button type="button" title={TURN_MODE_TIP} aria-describedby="pay-mode-note" className={"min-tap rounded-xl text-sm font-semibold " + (payByRoom ? "bg-accent text-ink" : "border border-line")} onClick={() => { if (!runDoor.open) return; setPayByRoom(true); app.setRoomPay(true); }}>
                Trả theo lượt
              </button>
            </div>
            <p id="pay-mode-note" className="rounded-xl border border-line bg-card p-3 text-sm text-muted">
              {payByRoom ? (
                <>
                  <strong className="text-fg">Đang chọn: Trả theo lượt.</strong> {TURN_MODE_TIP} Giá từng gói bên dưới là ước tính; tiền trừ thật là số thực khi xong.
                </>
              ) : (
                <>
                  <strong className="text-fg">Đang chọn: Key của tôi.</strong> {KEY_MODE_TIP}
                </>
              )}
            </p>
            {payByRoom && (
              <TurnPackList
                videoRef={app.videoRef}
                narration={narration.enabled}
                onLocked={setTurnLocked}
                onPick={(pack) => {
                  const next = turnPackModels(pack);
                  if (next.asr) app.setAsrModel(next.asr);
                  if (next.chat) app.chooseVoice(next.chat);
                }}
              />
            )}
          </div>
        ) : (
          <RunDoorClosed note={runDoor.note} />
        )}
        {!(runDoor.open && payByRoom) && (
        <label className="grid gap-1 text-sm text-muted" htmlFor="key">
          Groq API key
          <span className="flex gap-2">
            <input
              id="key"
              className={FIELD}
              type={showKey ? "text" : "password"}
              placeholder="gsk_… chỉ lưu trên máy này"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={app.key}
              onChange={(event) => app.setKey(event.target.value)}
            />
            <IconButton label="Dán API key" onClick={() => void pasteKey()}>
              <ClipboardPaste />
            </IconButton>
            <IconButton label={showKey ? "Ẩn API key" : "Hiện API key"} onClick={() => setShowKey((value) => !value)}>
              {showKey ? <EyeOff /> : <Eye />}
            </IconButton>
          </span>
          {app.keyStatus.phase !== "idle" && (
            <span
              role="status"
              className={
                "flex items-start gap-1.5 text-xs " +
                (app.keyStatus.phase === "ok"
                  ? "text-success"
                  : app.keyStatus.phase === "bad"
                    ? "text-danger"
                    : app.keyStatus.phase === "warn"
                      ? "text-warning"
                      : "text-muted")
              }
            >
              {app.keyStatus.phase === "checking" && <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden="true" />}
              {app.keyStatus.phase === "ok" && <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
              {app.keyStatus.phase === "warn" && <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
              {app.keyStatus.phase === "bad" && <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
              <span>{app.keyStatus.text}</span>
            </span>
          )}
        </label>
        )}
        {app.asrModel === "qwen-audio-3.0-asr-flash-filetrans" && !(runDoor.open && payByRoom) && (
          <label className="grid gap-1 text-sm text-muted" htmlFor="ali-key">
            Key Alibaba
            <input
              id="ali-key"
              className={FIELD}
              type={showKey ? "text" : "password"}
              placeholder="sk-… chỉ lưu trên máy này"
              autoComplete="off"
              value={app.alibabaKey}
              onChange={(event) => app.setAlibabaKey(event.target.value)}
            />
          </label>
        )}
        {!lockTurnModels && (
        <>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted">Cách dịch</span>
          {!showRoomPrice && (
            <button
              type="button"
              className="inline-flex min-tap items-center gap-1 rounded-full border border-line px-3 text-sm text-fg disabled:opacity-50"
              onClick={() => void app.refreshModels()}
              disabled={app.modelBusy || !online}
            >
              {app.modelBusy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Đồng bộ key
            </button>
          )}
        </div>
        <VoiceLanes
          modelId={app.modelId}
          available={showRoomPrice ? (runDoor.offered ? new Set(runDoor.offered) : null) : ownVoice.ids}
          allowEnterprise={showRoomPrice ? true : app.allowEnterprise}
          known={showRoomPrice ? Boolean(runDoor.offered) : ownVoice.known}
          priceFor={(id) =>
            showRoomPrice
              ? modelFacts(app.board, runDoor, id, "").price
              : ownModelPrice(app.board, id)
          }
          onPick={(id) => app.chooseVoice(id)}
        />
        <p className="text-sm text-muted">Một lần dịch giữ một lối. Không trộn model nhỏ vào phim đang xem.</p>
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">Nhập mã model khác</summary>
          <div className="pt-2">
            <ModelPicker
              models={app.catalog}
              value={app.modelId}
              remote={showRoomPrice ? null : ownVoice.ids ? [...ownVoice.ids] : app.remoteIds}
              board={showRoomPrice ? app.board : null}
              door={showRoomPrice ? runDoor : null}
              onChange={app.chooseVoice}
            />
          </div>
        </details>
        <Select label="Nhận dạng giọng" value={app.asrModel} onChange={(value) => app.setAsrModel(value as typeof app.asrModel)}>
          <option value="whisper-large-v3-turbo" disabled={showRoomPrice ? roomHeld(runDoor, "whisper-large-v3-turbo") : !rentOpen(groqAllow, "whisper-large-v3-turbo")}>
            Whisper Turbo{showRoomPrice ? ` · ${roomAsrPrice(app.board, runDoor, "whisper-large-v3-turbo")}` : groqAllow && !groqAllow.includes("whisper-large-v3-turbo") ? " · Chủ chưa mở" : ""}
          </option>
          <option value="whisper-large-v3" disabled={showRoomPrice ? roomHeld(runDoor, "whisper-large-v3") : !rentOpen(groqAllow, "whisper-large-v3")}>
            Whisper Large{showRoomPrice ? ` · ${roomAsrPrice(app.board, runDoor, "whisper-large-v3")}` : groqAllow && !groqAllow.includes("whisper-large-v3") ? " · Chủ chưa mở" : ""}
          </option>
          <option value="qwen-audio-3.0-asr-flash-filetrans" disabled={showRoomPrice || !rentOpen(aliAllow, "qwen-audio-3.0-asr-flash-filetrans")}>
            Alibaba Filetrans{showRoomPrice ? " · chưa có ở cửa trả theo lượt" : aliAllow && !aliAllow.includes("qwen-audio-3.0-asr-flash-filetrans") ? " · Chủ chưa mở" : ""}
          </option>
        </Select>
        {app.asrModel === "qwen-audio-3.0-asr-flash-filetrans" && (
          <p className="text-sm text-muted">Alibaba nhận cả file từ link trực tiếp. Cần key Alibaba và link file công khai (không phải trang xem). Không cắt đoạn trên máy.</p>
        )}
        {(groqAllow || aliAllow) && (
          <p className="text-sm text-muted">Thuê phòng chỉ chọn model Chủ đã mở. Whisper cần key Groq của bạn. Filetrans cần key Alibaba của bạn. Dịch vẫn dùng model Groq đã mở.</p>
        )}
        </>
        )}
        {showRoomPrice && <p className="text-sm text-muted">Đơn giá là giá dịch vụ của phòng, đã gồm phần vận hành. Không dùng số này để so với tài khoản Groq riêng.</p>}
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={app.speechVad} onChange={(event) => app.setSpeechVad(event.target.checked)} />
          Chỉ gửi đoạn có tiếng người
        </label>
        <p className="text-sm text-muted">
          Tắt thì chỉ bỏ đoạn im. Bật thì lần đầu tải thêm khoảng 15 MB, rồi cắt phần không phải lời ở đầu và cuối mỗi đoạn. Không tải được thì dùng lại mức năng lượng. Mỗi đoạn vẫn là một lần gửi.
        </p>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={app.langCheck} onChange={(event) => app.setLangCheck(event.target.checked)} />
          Kiểm tra ngôn ngữ từng đoạn
        </label>
        <p className="text-sm text-muted">
          Hợp phim lẫn nhiều thứ tiếng. Đoạn có chữ lệch ngôn ngữ đã chọn hoặc độ tin thấp được nhận dạng lại một lần, không ép ngôn ngữ, và chỉ đổi khi kết quả tốt hơn rõ. Tốn thêm lượt nhận dạng, tối đa khoảng 2 phút âm thanh mỗi lần chạy. Tắt thì chạy như cũ.
        </p>
        <Select label="Số luồng nhận dạng" value={String(app.threads)} onChange={(value) => app.setThreads(Number(value))}>
          <option value="1">Ổn định · 1 luồng</option>
          <option value="3">Cân bằng · 3 luồng</option>
          <option value="4">Nhanh · 4 luồng</option>
          <option value="6">Mạnh · 6 luồng (hợp key trả phí)</option>
          <option value="8">Tối đa · 8 luồng (hợp key trả phí)</option>
        </Select>
        {app.threads >= 6 && (
          <p className="text-sm text-muted">6–8 luồng dễ chạm giới hạn key miễn phí. App sẽ tự chờ rồi gửi lại, không mất đoạn đã nhận dạng.</p>
        )}
      </section>

      <section id="tool-phim" role="tabpanel" aria-labelledby="tool-tab-phim" hidden={toolTab !== "phim"} className="grid gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Nhận diện ngôn ngữ" value={app.source} onChange={app.setSource}>
            {SRC_LANGS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select label="Dịch sang tiếng" value={app.target} onChange={app.setTarget}>
            {LANGS.filter(([value]) => value === "Vietnamese").map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Select label="Thể loại" value={app.genre} onChange={app.setGenre}>
          <option value="auto">Tự động</option>
          <option value="action">Hành động</option>
          <option value="adventure">Phiêu lưu</option>
          <option value="crime">Hình sự / giang hồ</option>
          <option value="scifi">Viễn tưởng / giả tưởng</option>
          <option value="horror">Kinh dị</option>
          <option value="romance">Tình cảm / lãng mạn</option>
          <option value="psychological">Tâm lý</option>
          <option value="comedy">Hài</option>
          <option value="costume">Cổ trang / kiếm hiệp</option>
          <option value="historical">Lịch sử / thời kỳ</option>
          <option value="mystery">Trinh thám / bí ẩn</option>
          <option value="sports">Thể thao</option>
          <option value="adult">Phim gắn nhãn 18+</option>
          <option value="sex">Phim thoại kín</option>
          <option value="series">Phim bộ / phim mới chiếu</option>
          <option value="daily">Hằng ngày</option>
        </Select>
        {usesBaseGlossary(app.genre) && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={app.baseGloss} onChange={(event) => app.setBaseGloss(event.target.checked)} />
            Tự thêm thuật ngữ nền của ngôn ngữ nguồn
          </label>
        )}
        <p className="text-sm text-muted">
          {app.glossaryInfo?.failed ? (
            "Không tải được thuật ngữ có sẵn. Hãy thử lại."
          ) : app.glossaryInfo?.count > 0 ? (
            <>
              Đã nạp <strong className="studio-count">{app.glossaryInfo.count}</strong> thuật ngữ{app.glossaryInfo?.sources?.length > 1 ? " (thể loại này và bộ nền)" : " của thể loại này"}.
            </>
          ) : (
            "Chọn thể loại để nạp thuật ngữ. Thêm tay hoặc nhập CSV ở dưới."
          )}
        </p>
        <details className="rounded-xl border border-line bg-raised px-3 py-2">
          <summary className="min-tap cursor-pointer text-sm font-medium">
            Thuật ngữ thể loại <span className="studio-count">{app.glossaryInfo?.count || 0}</span>
          </summary>
          <p className="pb-2 text-sm text-muted">
            Mỗi thể loại một bộ riêng, không dùng chung. Thêm tay hoặc nhập CSV vẫn lưu trên máy này, theo đúng cặp ngôn ngữ × thể loại.
            {app.glossaryInfo?.userCount ? ` Trong đó ${app.glossaryInfo.userCount} do bạn thêm.` : ""}
            {app.glossaryInfo?.sources?.length ? ` ${app.glossaryInfo.sources.map((s: string) => s.replace(/^\/glossaries\//, "")).join(", ")}.` : ""}
          </p>
          <GlossaryEditor app={app} />
        </details>

        <div className="grid gap-2 sm:grid-cols-2">
          <FileTile icon={<Clapperboard className="size-5" />} image={app.file ? thumb.image : null} title="Video" name={app.file?.name} hint="mp4, mkv, webm…" accept="video/*,audio/*" onFile={app.setFile} />
          <FileTile icon={<FileAudio className="size-5" />} title="Âm thanh riêng" name={app.audioFile?.name} hint="Khi file quá lớn" accept="audio/*,video/*" onFile={app.setAudioFile} />
        </div>
        <label className="grid gap-1 text-sm text-muted">
          Hoặc link file trực tiếp
          <span className="relative">
            <Link2 className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" />
            <input
              className={FIELD + " pl-9"}
              type="url"
              placeholder="https://…/phim.mp4"
              value={app.url}
              aria-invalid={Boolean(linkCheck.problem)}
              onChange={(event) => {
                if (linkCheck.problem) linkCheck.check(event.target.value);
                app.setUrl(event.target.value);
              }}
              onBlur={(event) => linkCheck.check(event.target.value)}
              onPaste={(event) => linkCheck.check(event.clipboardData.getData("text"))}
            />
          </span>
          {linkCheck.problem && (
            <span role="alert" className="text-xs text-danger">
              {linkCheck.problem}
            </span>
          )}
        </label>
        <details className="text-sm text-muted">
          <summary className="min-tap cursor-pointer">File lớn hơn 1 GB, MKV, AC3/DTS?</summary>
          <p className="pb-2">
            Tách âm thanh nhỏ bằng ffmpeg rồi chọn vào Âm thanh riêng. Video vẫn phát từ file gốc. Lệnh:{" "}
            <code className="text-fg">ffmpeg -i phim.mkv -vn -ac 1 -ar 16000 -c:a aac -b:a 48k -movflags +faststart am-thanh.m4a</code>
          </p>
        </details>

        <div className="grid gap-2">
          <button
            type="button"
            disabled={!app.running && !online}
            className={"min-tap rounded-xl font-semibold disabled:opacity-40 " + (app.running ? "border border-danger bg-raised text-danger" : "bg-accent text-ink")}
            onClick={() => (app.running ? app.cancel() : void app.start())}
          >
            {app.buttonLabel}
          </button>
          <button type="button" className="min-tap rounded-xl border border-line" onClick={app.reset}>
            Làm lại
          </button>
        </div>
      </section>

      <section id="tool-cast" role="tabpanel" aria-labelledby="tool-tab-cast" hidden={toolTab !== "cast"} className="grid gap-3 p-4">
          <details className="rounded-xl border border-line bg-raised px-3 py-2">
            <summary className="min-tap cursor-pointer text-sm font-medium">Ngữ cảnh phim</summary>
            <div className="grid gap-2 pb-2">
              <input className={FIELD} placeholder="Tên phim + năm" value={app.title} onChange={(event) => app.setTitle(event.target.value)} />
              <textarea className={FIELD} rows={3} placeholder="Dàn diễn viên hoặc tóm tắt cốt truyện" value={app.notes} onChange={(event) => app.setNotes(event.target.value)} />
              <textarea className={FIELD} rows={4} placeholder="Bảng thuật ngữ, mỗi dòng: tên gốc = cách dịch" value={app.gloss} onChange={(event) => app.setGloss(event.target.value)} />
            </div>
          </details>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Phân tích phim</h2>
              <p className="text-sm text-muted">Bước riêng, trước khi dịch. Bảng nhân vật khóa tên, giới và cách xưng hô.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={app.pre}
              className={"min-tap shrink-0 rounded-full px-4 text-sm font-semibold " + (app.pre ? "bg-accent text-ink" : "border border-line")}
              onClick={() => app.setPre(!app.pre)}
            >
              {app.pre ? "Đang bật" : "Tắt"}
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={app.reviewBefore} onChange={(event) => app.setReviewBefore(event.target.checked)} />
            Dừng lại để xem và sửa bảng nhân vật trước khi dịch.
          </label>
          <div className="grid gap-2">
            <button
              type="button"
              className="min-tap rounded-xl border border-line text-sm disabled:opacity-50"
              disabled={app.running || app.segs.length === 0}
              onClick={() => (app.analyzing ? app.cancel() : void app.analyzeNow())}
            >
              {app.analyzing ? "Hủy phân tích" : "Phân tích ngay"}
            </button>
            {!app.segs.length && <p className="text-xs text-muted">Chưa có lời thoại. Bật phân tích rồi bấm Tải và dịch — app sẽ dừng để bạn xem bảng trước khi dịch.</p>}
          </div>
          {app.bible?.failed && <p className="text-sm text-danger">Không tạo được bảng: {app.bible.failed}</p>}
          {app.bible && !app.bible.failed && (
            <div className="grid gap-2">
              <label className="grid gap-1 text-sm text-muted">
                Tóm tắt
                <textarea className={FIELD} rows={3} value={app.bible.summary || ""} onChange={(event) => app.patchSummary(event.target.value)} />
              </label>
              <div className="grid max-h-80 gap-2 overflow-auto">
                {(app.bible.characters || []).map((character, index) => (
                  // key chỉ theo vị trí: key có tên thì gõ một chữ là hàng bị dựng lại, mất focus, bàn phím ảo tắt
                  <div key={`character-${index}`} className="grid gap-2 rounded-xl border border-line bg-card p-3">
                    <p className="text-xs font-semibold text-muted">Nhân vật {index + 1}</p>
                    <label className="grid gap-1 text-xs text-muted">
                      Tên nhân vật
                      <input
                        className={FIELD}
                        aria-label="Tên nhân vật"
                        placeholder="Tên nhân vật"
                        value={character.name || ""}
                        onChange={(event) => app.patchCharacter(index, { name: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted">
                      Nam / nữ
                      <select
                        className={FIELD}
                        aria-label="Giới"
                        value={character.gender === "male" || character.gender === "female" ? character.gender : "unknown"}
                        onChange={(event) => app.patchCharacter(index, { gender: event.target.value })}
                      >
                        <option value="female">Nữ</option>
                        <option value="male">Nam</option>
                        <option value="unknown">Chưa rõ</option>
                      </select>
                    </label>
                    <p className="text-xs text-muted">Giới này được giữ khi phân tích lại, và thắng cao độ lúc đọc.</p>
                    <label className="grid gap-1 text-xs text-muted">
                      Tự xưng
                      <input
                        className={FIELD}
                        aria-label="Tự xưng"
                        placeholder="Tự xưng, ví dụ: tôi / em"
                        value={character.self || ""}
                        onChange={(event) => app.patchCharacter(index, { self: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-muted">
                      Được gọi
                      <input
                        className={FIELD}
                        aria-label="Được gọi"
                        placeholder="Được gọi, ví dụ: anh / chị"
                        value={character.addressed || ""}
                        onChange={(event) => app.patchCharacter(index, { addressed: event.target.value })}
                      />
                    </label>
                  </div>
                ))}
              </div>
              {(app.bible.terms || []).length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm text-muted">Thuật ngữ trong phim</p>
                  {(app.bible.terms || []).slice(0, 24).map((term, index) => (
                    <label key={`${term.src || "t"}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-sm">
                      <span className="truncate text-muted">{term.src}</span>
                      <input className={FIELD} aria-label="Cách dịch" value={term.tgt || ""} onChange={(event) => app.patchTerm(index, event.target.value)} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

      <section id="tool-voice" role="tabpanel" aria-labelledby="tool-tab-voice" hidden={toolTab !== "voice"} className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Thuyết minh bản dịch</h2>
            <p className="text-sm text-muted">Giọng neural miễn phí đọc tự nhiên hơn. Lỗi mạng thì máy đọc bằng giọng có sẵn.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={narration.enabled}
            className={"min-tap shrink-0 rounded-full px-4 text-sm font-semibold " + (narration.enabled ? "bg-accent text-ink" : "border border-line")}
            onClick={() => patchNarration({ enabled: !narration.enabled })}
          >
            {narration.enabled ? "Đang bật" : "Tắt"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Choice on={narration.engine === "edge"} onClick={() => patchNarration({ engine: "edge", gender: narration.gender === "any" ? "female" : narration.gender })} title="Neural" text="Miễn phí, tự nhiên" />
          <Choice on={narration.engine === "browser"} onClick={() => patchNarration({ engine: "browser" })} title="Giọng máy" text="Có sẵn trên máy" />
          <Choice
            on={narration.engine === "orpheus"}
            onClick={() => patchNarration({ engine: "orpheus", orpheusVoice: defaultOrpheusVoice(app.target, narration.gender) })}
            title="Orpheus"
            text={cloud ? "Có phí" : "Anh, Ả Rập"}
          />
        </div>
        {narration.engine === "edge" && (
          <p className="text-sm text-muted">
            {narration.matchCast
              ? `Theo tiếng trong video: ${edgeVoice(app.target, "female").label} (nữ) và ${edgeVoice(app.target, "male").label} (nam). `
              : `Giọng ${edgeVoice(app.target, narration.gender === "any" ? "female" : narration.gender).label}. `}
            Không cần API key. Nếu dịch vụ giọng tắt, app tự chuyển sang giọng máy khoảng 20 giây.
          </p>
        )}
        {narration.engine === "orpheus" && !cloud && <p className="text-sm text-danger">Orpheus chưa đọc tiếng này. Máy sẽ dùng giọng có sẵn.</p>}
        <p className="text-sm text-muted">Giọng dự phòng khi không đo được cao độ, hoặc khi tắt đọc theo video.</p>
        <div className={"grid gap-2 " + (narration.engine === "edge" ? "grid-cols-2" : "grid-cols-3")}>
          {(
            [
              ["female", "Nữ"],
              ["male", "Nam"],
              ["any", "Bất kỳ"],
            ] as const
          )
            .filter(([id]) => narration.engine === "browser" || narration.engine === "orpheus" || id !== "any")
            .map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={"min-tap rounded-xl border text-sm " + (narration.gender === id ? "border-accent bg-accent text-ink" : "border-line")}
              onClick={() => patchNarration({ gender: id, orpheusVoice: defaultOrpheusVoice(app.target, id) })}
            >
              {label}
            </button>
          ))}
        </div>
        {narration.engine === "browser" ? (
          <Select label="Giọng trên máy" value={narration.voiceURI} onChange={(voiceURI) => patchNarration({ voiceURI })}>
            <option value="">Tự chọn theo ngôn ngữ</option>
            {(shownVoices.length ? shownVoices : voices).map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} · {voice.lang}
              </option>
            ))}
          </Select>
        ) : narration.engine === "orpheus" ? (
          <Select label="Giọng Orpheus" value={narration.orpheusVoice} onChange={(orpheusVoice) => patchNarration({ orpheusVoice })}>
            {orpheusVoices(app.target)
              .filter((voice) => narration.gender === "any" || voice.gender === narration.gender)
              .map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} · {voice.gender === "female" ? "nữ" : "nam"}
                </option>
              ))}
          </Select>
        ) : null}
        <DragSlider label="Tốc độ nói" value={narration.rate} min={0.6} max={1.8} step={0.1} defaultValue={1} marks={[1]} format={(value) => `${value.toFixed(1)}×`} onCommit={(rate) => patchNarration({ rate })} />
        {narration.engine !== "orpheus" && (
          <DragSlider label="Cao độ" value={narration.pitch} min={0.6} max={1.6} step={0.1} defaultValue={1} marks={[1]} format={(value) => value.toFixed(1)} onCommit={(pitch) => patchNarration({ pitch })} />
        )}
        <DragSlider label="Âm lượng thuyết minh" value={narration.volume} min={0.2} max={1} step={0.05} defaultValue={1} format={(value) => `${Math.round(value * 100)}%`} onCommit={(volume) => patchNarration({ volume })} />
        <DragSlider
          label="Đọc trước / sau phụ đề"
          value={narration.lead}
          min={-1.5}
          max={2}
          step={0.1}
          defaultValue={0}
          marks={[0]}
          format={(value) => (value === 0 ? "Đúng lúc" : value < 0 ? `Trước ${(-value).toFixed(1)} giây` : `Sau ${value.toFixed(1)} giây`)}
          onCommit={(lead) => patchNarration({ lead })}
        />
        <p className="text-sm text-muted">Kéo núm để chỉnh. Đúng lúc là đọc khi câu hiện. Trước là đọc sớm, sau là đọc muộn.</p>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.matchCast} onChange={(event) => patchNarration({ matchCast: event.target.checked })} />
          Đọc theo nhân vật, rồi theo cao độ
        </label>
        <p className="text-sm text-muted">
          Câu có tên hoặc tự xưng rõ trong bảng nhân vật thì dùng giới đó. Không chắc thì so cao độ trong video: nhóm thấp là nam, nhóm cao là nữ. Bấm Đổi giọng trên một câu để khóa nam hoặc nữ. Không đoán anh/em.
        </p>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.duck} onChange={(event) => patchNarration({ duck: event.target.checked })} />
          Hạ tiếng phim khi đang đọc
        </label>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.muteVideo} onChange={(event) => patchNarration({ muteVideo: event.target.checked })} />
          Tắt hẳn tiếng gốc lúc thuyết minh
        </label>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.followPlayback} onChange={(event) => patchNarration({ followPlayback: event.target.checked })} />
          Bám tốc độ phát của video
        </label>
        <label className="flex min-tap items-center gap-2 text-sm">
          <input type="checkbox" checked={narration.skipCues} onChange={(event) => patchNarration({ skipCues: event.target.checked })} />
          Bỏ qua chú thích trong ngoặc, ví dụ [nhạc]
        </label>
        <button type="button" className="min-tap rounded-xl border border-line" onClick={previewVoice}>
          Nghe thử một câu
        </button>
      </section>

      <section id="tool-check" role="tabpanel" aria-labelledby="tool-tab-check" hidden={toolTab !== "check"} className="grid gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-tap rounded-xl border border-line px-3 text-sm" disabled={app.running || app.segs.length === 0} onClick={() => void app.scanGaps()}>
            Dò khoảng trống
          </button>
          {app.segs.some((seg) => seg.translationFailed) && (
            <button type="button" className="min-tap rounded-xl border border-danger px-3 text-sm font-semibold text-danger" onClick={app.retryFailed}>
              Dịch lại các câu lỗi
            </button>
          )}
        </div>
        {app.gapPlan && (app.gapPlan.selected.length > 0 || app.gapPlan.deferred.length > 0) && (
          <div className="grid gap-2 rounded-xl border border-line bg-bg p-3 text-sm">
            <p>
              {app.gapPlan.selected.length
                ? `${app.gapPlan.selected.length} khoảng có tiếng nhưng chưa có câu, ${app.gapPlan.audioSeconds.toFixed(1)} giây. Chưa gửi.`
                : "Không còn khoảng nào vừa ngân sách."}
              {app.gapPlan.deferred.length ? ` ${app.gapPlan.deferred.length} khoảng vượt ngân sách ${app.gapPlan.budgetSeconds} giây, không gửi.` : ""}
            </p>
            {app.gapPlan.selected.length > 0 && (
              <ul className="grid gap-1 text-muted">
                {app.gapPlan.selected.slice(0, 6).map((span) => (
                  <li key={`${span.start}-${span.end}`}>
                    {fmt(span.start)}–{fmt(span.end)}
                  </li>
                ))}
              </ul>
            )}
            {app.gapPlan.selected.length > 0 && (
              <button type="button" className="min-tap rounded-xl bg-accent font-semibold text-ink" disabled={app.running} onClick={() => void app.fillGaps()}>
                Nhận dạng các khoảng này
              </button>
            )}
          </div>
        )}
        <AsrDiag
          raw={app.diag.raw}
          rejects={app.diag.rejects}
          kept={app.segs.length}
          fileName={app.file?.name || app.audioFile?.name}
          retry={app.asrRetry}
          filterRetry={app.filterRetry}
          lang={app.langReport}
          onPlay={app.playReject}
          onKeep={app.keepReject}
          onDrop={app.dropReject}
        />
        {!app.diag.raw.length && !app.diag.rejects.length && !app.gapPlan && <p className="text-sm text-muted">Chưa có gì để kiểm tra. Hãy nhận dạng một phim trước.</p>}
      </section>
        </div>
      </div>
      </div>

      {editing >= 0 && app.segs[editing] && (
        <div className="fixed inset-0 z-50 flex items-end bg-bg/80" onClick={() => setEditKey(null)}>
          <form
            className="mx-auto grid w-full max-w-3xl gap-3 rounded-t-2xl border border-line bg-card p-4"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              app.editSeg(editing, draft, rule);
              setEditKey(null);
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Sửa câu</h3>
              <button type="button" aria-label="Đóng" className="min-tap rounded-full border border-line px-3" onClick={() => setEditKey(null)}>
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-muted">{app.segs[editing].original}</p>
            <textarea className={FIELD} rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} />
            <input className={FIELD} placeholder="Áp cho cả phim: tên gốc = cách dịch" value={rule} onChange={(event) => setRule(event.target.value)} />
            <button type="submit" className="min-tap rounded-xl bg-accent font-semibold text-ink">
              Lưu
            </button>
          </form>
        </div>
      )}
      </div>
      {product === "account" && <AccountPanel />}
      </>
      )}
    </main>
  );
}

type CueRowProps = {
  seg: Seg;
  index: number;
  active: boolean;
  onJump: (start: number) => void;
  onEdit: (seg: Seg) => void;
  onVoice: (index: number) => void;
};

/** Một câu trong bản dịch. Chỉ vẽ lại khi chính câu đó đổi, nên phim dài không còn giật mỗi lần có câu mới. */
const CueRow = memo(
  function CueRow({ seg, index, active, onJump, onEdit, onVoice }: CueRowProps) {
    return (
      <div
        className={"grid grid-cols-[1fr_auto] gap-2 border-b border-line py-3 " + (active ? "rounded-xl bg-raised px-2" : "")}
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 96px" }}
      >
        <button type="button" className="grid gap-1 text-left" onClick={() => onJump(seg.start)}>
          <span className="text-xs font-semibold text-accent">
            {fmt(seg.start)}
            {seg.model ? ` · ${modelLabel(seg.model)}` : ""}
            {seg.voiceLock === "male" ? " · khóa nam" : seg.voiceLock === "female" ? " · khóa nữ" : seg.voice === "male" ? " · đo nam" : seg.voice === "female" ? " · đo nữ" : ""}
          </span>
          <span className={seg.translationFailed ? "font-medium text-danger" : seg.translation === null ? "text-muted italic" : "font-medium"}>
            {seg.translationFailed ? "Không dịch được" : seg.translation === null ? "Đang chờ dịch…" : seg.translation}
          </span>
          <span className="text-sm text-muted">{seg.original}</span>
        </button>
        <div className="grid gap-2">
          <button type="button" className="min-tap self-start rounded-full border border-line px-3 text-sm" onClick={() => onEdit(seg)}>
            Sửa
          </button>
          <button type="button" className="min-tap self-start rounded-full border border-line px-3 text-sm" onClick={() => onVoice(index)}>
            Đổi giọng
          </button>
        </div>
      </div>
    );
  },
  (a, b) =>
    a.active === b.active &&
    a.index === b.index &&
    a.onJump === b.onJump &&
    a.onEdit === b.onEdit &&
    a.onVoice === b.onVoice &&
    a.seg.start === b.seg.start &&
    a.seg.end === b.seg.end &&
    a.seg.original === b.seg.original &&
    a.seg.translation === b.seg.translation &&
    a.seg.translationFailed === b.seg.translationFailed &&
    a.seg.model === b.seg.model &&
    a.seg.voice === b.seg.voice &&
    a.seg.voiceLock === b.seg.voiceLock,
);

function jump(video: HTMLVideoElement | null, start: number) {
  if (!video) return;
  video.currentTime = start;
  void video.play().catch(() => {});
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} className="inline-flex min-tap w-11 shrink-0 items-center justify-center rounded-xl border border-line [&_svg]:size-5" onClick={onClick}>
      {children}
    </button>
  );
}

function ownModelPrice(board: GroqBoard | null, id: string) {
  const row = board?.rows.find((item) => item.id === id);
  if (!board || !row) return board ? "Chưa niêm yết" : "";
  return formatRoomPrice(row, board.rate, 0);
}

function VoiceLanes({
  modelId,
  available,
  allowEnterprise,
  known,
  priceFor,
  onPick,
}: {
  modelId: string;
  available: Set<string> | null;
  allowEnterprise: boolean;
  known: boolean;
  priceFor: (id: string) => string;
  onPick: (id: string) => void;
}) {
  const selected = voiceLaneOf(modelId);
  return (
    <div className="grid min-w-0 gap-2">
      {VOICE_LANES.map((lane) => {
        const id = resolveVoiceLane(lane.id, available, allowEnterprise);
        const closed = known && !id;
        const on = selected === lane.id;
        const price = id ? priceFor(id) : "";
        return (
          <button
            key={lane.id}
            type="button"
            disabled={closed}
            aria-disabled={closed}
            onClick={() => id && onPick(id)}
            className={
              "min-tap min-w-0 rounded-xl border px-3 py-2 text-left " +
              (closed ? "cursor-not-allowed border-line bg-raised text-muted opacity-50 grayscale" : on ? "border-accent bg-accent text-ink" : "border-line bg-bg")
            }
          >
            <span className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>{lane.title}</span>
              {closed && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-medium">Key chưa mở</span>}
            </span>
            <span className={"block text-xs " + (on ? "text-ink/80" : "text-muted")}>{lane.fit}</span>
            <span className={"block text-xs " + (on ? "text-ink/80" : "text-muted")}>
              {lane.pace}
              {price ? ` · ${price}` : ""}
            </span>
            <span className={"block text-xs " + (on ? "text-ink/70" : "text-muted")}>
              {closed ? "" : id ? modelLabel(id) : "Chưa đối chiếu được key"}
            </span>
          </button>
        );
      })}
      {!known && <p className="text-xs text-muted">Bấm Đồng bộ key để tắt lối mà key không mở được.</p>}
    </div>
  );
}

function Choice({ on, onClick, title, text }: { on: boolean; onClick: () => void; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} className={"min-tap rounded-xl border px-3 py-2 text-left " + (on ? "border-accent bg-accent text-ink" : "border-line bg-bg")}>
      <span className="block text-sm font-semibold">{title}</span>
      <span className={"block text-xs " + (on ? "text-ink/80" : "text-muted")}>{text}</span>
    </button>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm text-muted">
      {label}
      <select className={FIELD} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function FileTile({ icon, image, title, name, hint, accept, onFile }: { icon: ReactNode; image?: string | null; title: string; name?: string; hint: string; accept: string; onFile: (file: File | null) => void }) {
  return (
    <label
      className="relative grid min-tap cursor-pointer grid-cols-[auto_1fr] items-center gap-3 rounded-xl border border-dashed border-line bg-bg px-3 py-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFile(event.dataTransfer.files?.[0] || null);
      }}
    >
      {image ? <img src={image} alt="" className="h-9 w-16 rounded-md object-cover" /> : <span className="text-accent">{icon}</span>}
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block truncate text-xs text-muted">{name || hint}</span>
      </span>
      <input
        className="absolute inset-0 cursor-pointer opacity-0"
        type="file"
        accept={accept}
        onChange={(event) => {
          onFile(event.target.files?.[0] || null);
          event.currentTarget.blur();
          window.scrollTo(0, 0);
        }}
      />
    </label>
  );
}

function ModelPicker({
  models,
  value,
  remote,
  board,
  door,
  onChange,
}: {
  models: ChatModel[];
  value: string;
  remote: string[] | null;
  board: GroqBoard | null;
  door: { markup: number; custom: Record<string, { hour: number; inn: number; out: number }>; offered: string[] | null } | null;
  onChange: (id: string) => void;
}) {
  const remoteSet = remote ? new Set(remote) : null;
  const groups = ["standard", "preview", "enterprise", "safety", "key"] as const;
  return (
    <div className="grid gap-3">
      {groups.map((tier) => {
        const list = models.filter((model) => model.tier === tier);
        if (!list.length) return null;
        return (
          <div key={tier} className="grid gap-2">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{TIER_LABEL[tier]}</p>
            <div className="grid gap-2">
              {list.map((model) => {
                const on = value === model.id;
                const missing = remoteSet ? !remoteSet.has(model.id) : false;
                const held = Boolean(door?.offered && !door.offered.includes(model.id));
                const facts = held ? { price: "Chưa cập nhật", detail: "" } : modelFacts(board, door, model.id, model.note);
                return (
                  <button
                    key={model.id}
                    type="button"
                    disabled={held || missing}
                    aria-disabled={held || missing}
                    onClick={() => onChange(model.id)}
                    className={
                      "min-tap rounded-xl border px-3 py-2 text-left " +
                      (missing ? "cursor-not-allowed border-line bg-raised text-muted opacity-50 grayscale" : "disabled:opacity-60 " + (on ? "border-accent bg-accent text-ink" : "border-line bg-bg"))
                    }
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                      <span>{model.name}</span>
                      {missing && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-xs font-medium">Key chưa mở</span>}
                    </span>
                    {facts.price ? <span className={"block text-xs " + (on ? "text-ink/80" : "text-muted")}>{facts.price}</span> : null}
                    {facts.detail ? <span className={"block text-xs " + (on ? "text-ink/70" : "text-muted")}>{facts.detail}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <label className="grid gap-1 text-sm text-muted">
        Hoặc nhập mã model khác
        <input className={FIELD} value={value} spellCheck={false} autoCapitalize="off" onChange={(event) => onChange(event.target.value.trim())} />
      </label>
    </div>
  );
}

function modelFacts(
  board: GroqBoard | null,
  door: { markup: number; custom: Record<string, { hour: number; inn: number; out: number }>; offered: string[] | null } | null,
  id: string,
  note: string,
): { price: string; detail: string } {
  if (!door) return { price: "", detail: "" };
  const row = board?.rows.find((item) => item.id === id);
  if (!board) return { price: "Đang lấy đơn giá phòng…", detail: "" };
  if (!row) return { price: "Chưa niêm yết", detail: note };
  return { price: formatRoomPrice(row, board.rate, door.markup, roomCustom(door.custom, id)), detail: "" };
}

function roomHeld(door: { offered: string[] | null }, id: string) {
  return groqListHolds(door.offered, id);
}

function roomAsrPrice(board: GroqBoard | null, door: { markup: number; custom: Record<string, { hour: number; inn: number; out: number }>; offered: string[] | null }, id: string): string {
  if (roomHeld(door, id)) return "Chưa cập nhật";
  const row = board?.rows.find((item) => item.id === id);
  if (!board) return "đang lấy đơn giá";
  if (!row) return "chưa niêm yết";
  return formatRoomPrice(row, board.rate, door.markup, roomCustom(door.custom, id));
}

function Stage({
  videoRef,
  segs,
  sub,
  setSub,
  narrationOn,
  lead,
  onCue,
  onSpeak,
  speechBusy,
  onPause,
  file,
  thumb,
  url,
  onFile,
  onUrl,
}: {
  file: File | null;
  thumb: FileThumb;
  url: string;
  onFile: (file: File | null) => void;
  onUrl: (value: string) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  segs: Seg[];
  sub: SubStyle;
  setSub: (next: SubStyle) => void;
  narrationOn: boolean;
  lead: number;
  onCue: (index: number) => void;
  onSpeak: (index: number) => void;
  speechBusy: () => boolean;
  onPause: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const panelBoxRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const tdRef = useRef<HTMLSpanElement>(null);
  const [ui, setUi] = useState(true);
  const [panel, setPanel] = useState(false);
  const [paused, setPaused] = useState(true);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [idx, setIdx] = useState(-1);
  const [ar, setAr] = useState(0);
  const [full, setFull] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fit, setFit] = useState<CSSProperties>({});
  const [bright, setBright] = useState(1);
  const segsRef = useRef(segs);
  const subRef = useRef(sub);
  const leadRef = useRef(lead);
  const narrRef = useRef(narrationOn);
  const onCueRef = useRef(onCue);
  const onSpeakRef = useRef(onSpeak);
  const busyRef = useRef(speechBusy);
  const onPauseRef = useRef(onPause);
  segsRef.current = segs;
  subRef.current = sub;
  leadRef.current = lead;
  narrRef.current = narrationOn;
  onCueRef.current = onCue;
  onSpeakRef.current = onSpeak;
  busyRef.current = speechBusy;
  onPauseRef.current = onPause;
  const idxRef = useRef(-1);
  const speakRef = useRef("");
  const hideT = useRef(0);
  const mediaRef = useRef(false);
  const drag = useRef(false);
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const brightRef = useRef(1);
  brightRef.current = bright;
  const hudRef = useRef<HTMLDivElement>(null);
  const hudT = useRef(0);
  const tapT = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let raf = 0;
    const paint = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (tcRef.current) tcRef.current.textContent = fmt(video.currentTime);
      if (tdRef.current) tdRef.current.textContent = fmt(duration);
      if (!drag.current && seekRef.current) seekRef.current.value = duration ? String((video.currentTime / duration) * 100000) : "0";
      if (video.currentSrc && !mediaRef.current) {
        mediaRef.current = true;
        setHasMedia(true);
      }
      const clock = video.currentTime - subRef.current.off;
      const shown = findCueIndex(segsRef.current, clock);
      if (shown !== idxRef.current) {
        idxRef.current = shown;
        setIdx(shown);
        onCueRef.current(shown);
      }
      if (narrRef.current && !video.paused) {
        const offset = leadRef.current;
        const spoken = speechIndex(segsRef.current, clock, offset);
        const seg = spoken >= 0 ? segsRef.current[spoken] : undefined;
        const waitEarly = Boolean(seg && offset < 0 && busyRef.current() && clock < seg.start);
        if (spoken >= 0 && seg && !waitEarly) {
          const text = cueText(seg);
          const token = text ? `${spoken}\n${text}` : "";
          if (token && token !== speakRef.current) {
            speakRef.current = token;
            onSpeakRef.current(spoken);
          }
        } else if (spoken < 0 && shown < 0 && speakRef.current !== "-") {
          speakRef.current = "-";
        }
      }
    };
    const loop = () => {
      paint();
      raf = requestAnimationFrame(loop);
    };
    const show = () => {
      setUi(true);
      clearTimeout(hideT.current);
      if (!video.paused && !panelRef.current) hideT.current = window.setTimeout(() => setUi(false), 3200);
    };
    const onPlay = () => {
      setPaused(false);
      setHasMedia(Boolean(video.currentSrc));
      cancelAnimationFrame(raf);
      loop();
      show();
    };
    const onPauseVideo = () => {
      setPaused(true);
      cancelAnimationFrame(raf);
      paint();
      speakRef.current = "";
      onPauseRef.current();
      show();
    };
    const onVolume = () => setMuted(video.muted || video.volume === 0);
    const onRate = () => setRate(video.playbackRate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPauseVideo);
    video.addEventListener("ended", onPauseVideo);
    video.addEventListener("timeupdate", paint);
    video.addEventListener("loadedmetadata", paint);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("ratechange", onRate);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPauseVideo);
      video.removeEventListener("ended", onPauseVideo);
      video.removeEventListener("timeupdate", paint);
      video.removeEventListener("loadedmetadata", paint);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("ratechange", onRate);
    };
  }, [videoRef]);

  const applyAspect = () => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) return;
    const mode = ARS[ar][1];
    if (typeof mode === "string") setFit({ objectFit: mode as CSSProperties["objectFit"], width: "100%", height: "100%" });
    else {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (w / h > mode) setFit({ objectFit: "fill", height: h, width: h * mode });
      else setFit({ objectFit: "fill", width: w, height: w / mode });
    }
  };

  useEffect(() => {
    applyAspect();
    const onFs = () => setFull(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("resize", applyAspect);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("resize", applyAspect);
    };
  }, [ar]);

  useEffect(() => {
    if (panel && !full) panelBoxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [panel, full]);

  const toggleFull = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      if (document.fullscreenElement === stage || full) {
        if (document.fullscreenElement) await document.exitFullscreen();
        setFull(false);
        return;
      }
      await stage.requestFullscreen();
    } catch {
      setFull((value) => !value);
    }
  };

  const currentSeg = idx >= 0 ? segs[idx] : undefined;
  const line = currentSeg ? (currentSeg.translationFailed ? "Không dịch được" : cueText(currentSeg)) : panel ? "Đây là phụ đề xem thử" : "";
  const renderedCue = cueStyle(sub, full);
  type Gesture = {
    x: number;
    y: number;
    w: number;
    h: number;
    left: boolean;
    rx: number;
    t0: number;
    v0: number;
    b0: number;
    mode: "" | "seek" | "vol" | "bri";
    tgt: number;
  };
  const gesture = useRef<Gesture | null>(null);
  const showHud = (text: string) => {
    const el = hudRef.current;
    if (!el) return;
    el.textContent = text;
    el.dataset.on = "1";
    clearTimeout(hudT.current);
    hudT.current = window.setTimeout(() => {
      el.dataset.on = "0";
    }, 900);
  };
  const armUi = () => {
    setUi(true);
    clearTimeout(hideT.current);
    const video = videoRef.current;
    if (video && !video.paused && !panelRef.current) hideT.current = window.setTimeout(() => setUi(false), 3200);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest("input,textarea,select,[contenteditable=true],button,a,[role=tab],[role=tablist],dialog")) return;
      if (document.querySelector("dialog[open]")) return;
      const video = videoRef.current;
      if (!video?.currentSrc) return;
      const key = event.key;
      if (key === " " || key === "k") {
        if (el?.closest("button,a")) return;
        event.preventDefault();
        video.paused ? void video.play().catch(() => {}) : video.pause();
      } else if (key === "ArrowLeft") {
        event.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        showHud(`Tua −5 giây · ${fmt(video.currentTime)}`);
      } else if (key === "ArrowRight") {
        event.preventDefault();
        const duration = Number.isFinite(video.duration) ? video.duration : 1e9;
        video.currentTime = Math.min(duration, video.currentTime + 5);
        showHud(`Tua +5 giây · ${fmt(video.currentTime)}`);
      } else if (key === "ArrowUp") {
        event.preventDefault();
        video.muted = false;
        video.volume = Math.min(1, video.volume + 0.05);
        showHud(`Âm lượng ${Math.round(video.volume * 100)}%`);
      } else if (key === "ArrowDown") {
        event.preventDefault();
        video.volume = Math.max(0, video.volume - 0.05);
        showHud(`Âm lượng ${Math.round(video.volume * 100)}%`);
      } else if (key === "f") {
        event.preventDefault();
        void toggleFull();
      } else if (key === "m") {
        event.preventDefault();
        video.muted = !video.muted;
      } else if (key === "[") {
        event.preventDefault();
        const next = Math.max(0.3, Math.round((brightRef.current - 0.1) * 100) / 100);
        brightRef.current = next;
        setBright(next);
        showHud(`Độ sáng ${Math.round(next * 100)}%`);
      } else if (key === "]") {
        event.preventDefault();
        const next = Math.min(2, Math.round((brightRef.current + 0.1) * 100) / 100);
        brightRef.current = next;
        setBright(next);
        showHud(`Độ sáng ${Math.round(next * 100)}%`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [videoRef, full]);

  const panelNode = (
      <div
        ref={panelBoxRef}
        data-nogesture
        className={
          full
            ? "absolute inset-x-0 bottom-0 z-30 flex max-h-[75%] touch-auto flex-col overflow-hidden rounded-t-2xl border-t border-line bg-card"
            : "flex max-h-[80dvh] touch-auto flex-col overflow-hidden rounded-2xl border border-line bg-card"
        }
      >
          <div className="flex items-center justify-between px-4 pt-3">
            <h3 className="font-semibold">Phụ đề</h3>
            <button type="button" aria-label="Đóng" className="min-tap rounded-full border border-line px-3" onClick={() => setPanel(false)}>
              <X className="size-4" />
            </button>
          </div>
          <div className="mx-4 mt-2 shrink-0 overflow-hidden rounded-xl border border-accent/50 bg-black shadow-lg">
            <p className="px-3 pt-2 text-xs text-muted">Mẫu nổi — nằm yên khi kéo các thanh bên dưới</p>
            <div className="relative h-28">
              <div className="absolute inset-x-[6%] text-center" style={{ bottom: sampleBottom(sub.pos) }}>
                <span className="rounded-md px-2" style={{ ...cueStyle(sub, false), opacity: sub.on ? 1 : 0.4 }}>
                  Đây là phụ đề xem thử
                </span>
              </div>
            </div>
            {!sub.on && <p className="px-3 pb-2 text-xs text-muted">Phụ đề đang tắt trên video. Mẫu vẫn hiện để xem kiểu chữ.</p>}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 overflow-auto px-4 pt-3 pb-4" style={{ overflowAnchor: "none", overscrollBehavior: "contain" }}>
            <label className="col-span-2 flex min-tap items-center gap-2 text-sm">
              <input type="checkbox" checked={sub.on} onChange={(event) => setSub({ ...sub, on: event.target.checked })} />
              Hiện phụ đề
            </label>
            <Select label="Phông" value={sub.font} onChange={(font) => setSub({ ...sub, font })}>
              <option value="0">Mặc định</option>
              <option value="1">Có chân</option>
              <option value="2">Đơn cách</option>
              <option value="3">Đậm</option>
              <option value="4">Viết tay</option>
            </Select>
            <Select label="Màu chữ" value={sub.col} onChange={(col) => setSub({ ...sub, col })}>
              <option value="#ffffff">Trắng</option>
              <option value="#ffe14d">Vàng</option>
              <option value="#7cfc9a">Xanh lá</option>
              <option value="#6fe7ff">Xanh lơ</option>
              <option value="#ff9ecb">Hồng</option>
            </Select>
            <label className="col-span-2 grid gap-1 text-sm text-muted">
              Kiểu nền
              <select className={FIELD} value={sub.bgm} onChange={(event) => setSub({ ...sub, bgm: event.target.value })}>
                <option value="box">Hộp nền mờ</option>
                <option value="solid">Hộp nền đen</option>
                <option value="none">Không nền</option>
                <option value="outline">Viền chữ</option>
              </select>
            </label>
            <div className="col-span-2">
              <DragSlider label="Độ mờ nền" value={sub.op} min={0} max={100} step={5} defaultValue={0} format={(value) => `${value}%`} onCommit={(op) => setSub({ ...sub, op })} />
              <DragSlider label="Cỡ chữ" value={sub.size} min={50} max={250} step={10} defaultValue={50} format={(value) => `${value}%`} onCommit={(size) => setSub({ ...sub, size })} />
              <DragSlider label="Vị trí từ đáy" value={sub.pos} min={2} max={85} step={1} defaultValue={3} format={(value) => `${value}%`} onCommit={(pos) => setSub({ ...sub, pos })} />
              <DragSlider label="Lệch thời gian" value={sub.off} min={-10} max={10} step={0.1} defaultValue={0} marks={[0]} format={(value) => `${value > 0 ? "+" : ""}${value.toFixed(1)} giây`} onCommit={(off) => setSub({ ...sub, off })} />
            </div>
            <button type="button" className="col-span-2 min-tap rounded-xl border border-line" onClick={() => setSub(SUB_DEF)}>
              Đặt lại mặc định
            </button>
          </div>
        </div>
  );

  return (
    <div className="player-stack">
    <div
      ref={stageRef}
      className={"relative touch-none overflow-hidden bg-black select-none " + (full ? "fixed inset-0 z-40 h-dvh rounded-none" : "aspect-video rounded-2xl")}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        setDragging(false);
        const dropped = event.dataTransfer.files?.[0];
        if (!dropped) return;
        event.preventDefault();
        if (isMediaFile(dropped)) onFile(dropped);
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button,input,select,textarea,label,a,[data-nogesture]")) return;
        const rect = stageRef.current?.getBoundingClientRect();
        const video = videoRef.current;
        if (!rect || !video) return;
        if (event.cancelable) event.preventDefault();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* một số trình duyệt từ chối capture */
        }
        gesture.current = {
          x: event.clientX,
          y: event.clientY,
          w: rect.width,
          h: rect.height,
          left: event.clientX < rect.left + rect.width / 2,
          rx: (event.clientX - rect.left) / rect.width,
          t0: video.currentTime || 0,
          v0: video.muted ? 0 : video.volume,
          b0: brightRef.current,
          mode: "",
          tgt: video.currentTime || 0,
        };
      }}
      onPointerMove={(event) => {
        const g = gesture.current;
        const video = videoRef.current;
        if (!g || !video) {
          if (event.pointerType === "mouse") armUi();
          return;
        }
        const dx = event.clientX - g.x;
        const dy = event.clientY - g.y;
        if (!g.mode) {
          if (Math.hypot(dx, dy) < 14) return;
          g.mode = Math.abs(dx) > Math.abs(dy) ? "seek" : g.left ? "bri" : "vol";
        }
        if (event.cancelable) event.preventDefault();
        if (g.mode === "seek") {
          const duration = Number.isFinite(video.duration) ? video.duration : 0;
          const span = Math.min(180, Math.max(30, (duration || 60) / 10));
          g.tgt = Math.max(0, Math.min(duration || 1e9, g.t0 + (dx / Math.max(g.w, 1)) * span));
          const diff = Math.round(g.tgt - g.t0);
          if (tcRef.current) tcRef.current.textContent = fmt(g.tgt);
          showHud(`${diff >= 0 ? "Tua tới" : "Tua lui"} ${fmt(g.tgt)} (${diff >= 0 ? "+" : "−"}${Math.abs(diff)} giây)`);
        } else if (g.mode === "vol") {
          video.muted = false;
          video.volume = Math.max(0, Math.min(1, g.v0 - dy / (g.h * 0.7)));
          showHud(`Âm lượng ${Math.round(video.volume * 100)}%`);
        } else {
          const next = Math.max(0.3, Math.min(2, g.b0 - (dy / (g.h * 0.7)) * 1.5));
          brightRef.current = next;
          setBright(next);
          showHud(`Độ sáng ${Math.round(next * 100)}%`);
        }
      }}
      onPointerUp={(event) => {
        const stage = stageRef.current;
        if (stage?.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
        const g = gesture.current;
        gesture.current = null;
        const video = videoRef.current;
        if (!g || !video) return;
        if (g.mode === "seek") {
          video.currentTime = g.tgt;
          return;
        }
        if (g.mode) return;
        const now = Date.now();
        const last = Number(stageRef.current?.dataset.tap || 0);
        if (now - last < 300) {
          clearTimeout(tapT.current);
          if (g.rx < 0.33) {
            video.currentTime = Math.max(0, video.currentTime - 10);
            showHud(`−10 giây · ${fmt(video.currentTime)}`);
          } else if (g.rx > 0.67) {
            video.currentTime = video.currentTime + 10;
            showHud(`+10 giây · ${fmt(video.currentTime)}`);
          } else video.paused ? void video.play().catch(() => {}) : video.pause();
          if (stageRef.current) stageRef.current.dataset.tap = "0";
          return;
        }
        if (stageRef.current) stageRef.current.dataset.tap = String(now);
        clearTimeout(tapT.current);
        tapT.current = window.setTimeout(() => setUi((open) => !open), 280);
      }}
      onPointerCancel={(event) => {
        const stage = stageRef.current;
        if (stage?.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
        gesture.current = null;
      }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 m-auto bg-black"
        style={{ ...fit, filter: bright === 1 ? undefined : `brightness(${bright})` }}
        playsInline
        preload="metadata"
      />
      {sub.on && line && (
        <div className="pointer-events-none absolute inset-x-[4%] z-10 text-center" style={{ bottom: `${sub.pos}%` }}>
          <span className="rounded-md px-2" style={renderedCue}>
            {line}
          </span>
        </div>
      )}
      <div
        ref={hudRef}
        data-on="0"
        className="pointer-events-none absolute top-[18%] left-1/2 z-30 max-w-[92%] -translate-x-1/2 truncate rounded-full bg-black/80 px-4 py-2 text-sm font-semibold text-white opacity-0 transition-opacity data-[on=1]:opacity-100"
      />
      {!hasMedia && <PlayerDrop file={file} thumb={thumb} url={url} onFile={onFile} onUrl={onUrl} />}
      {hasMedia && dragging && (
        <div className="pointer-events-none absolute inset-2 z-[26] grid place-items-center rounded-xl border-2 border-dashed border-accent bg-black/70 text-sm font-semibold text-white">
          Thả để đổi video
        </div>
      )}
      <div className={"absolute inset-0 z-20 flex flex-col justify-between transition-opacity " + (ui || panel ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div className="flex justify-end gap-2 p-2">
          <Tiny label="Tỷ lệ khung hình" onClick={() => setAr((n) => (n + 1) % ARS.length)}>
            {ARS[ar][0]}
          </Tiny>
          <Tiny
            label="Xoay"
            onClick={() => {
              const next = full && ar % 2 === 0 ? "portrait" : "landscape";
              const orientation = typeof screen !== "undefined" ? (screen.orientation as (ScreenOrientation & { lock?: (type: string) => Promise<void> }) | undefined) : undefined;
              void orientation?.lock?.(next).catch(() => {});
            }}
          >
            <RotateCw className="size-4" />
          </Tiny>
          <Tiny label="Cài đặt phụ đề" onClick={() => setPanel((open) => !open)}>
            <Settings className="size-4" />
          </Tiny>
          <Tiny label="Toàn màn hình" onClick={() => void toggleFull()}>
            <Square className="size-4" />
          </Tiny>
        </div>
        <button
          type="button"
          aria-label={paused ? "Phát" : "Tạm dừng"}
          className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.paused ? void video.play().catch(() => {}) : video.pause();
          }}
        >
          {paused ? <Play className="size-7" /> : <Pause className="size-7" />}
        </button>
        <div className="flex items-center gap-2 px-3 pb-3">
          <span ref={tcRef} className="w-12 text-center text-xs text-white">
            0:00
          </span>
          <input
            ref={seekRef}
            className="min-tap flex-1 accent-accent"
            type="range"
            min={0}
            max={100000}
            defaultValue={0}
            aria-label="Tua video"
            onInput={(event) => {
              drag.current = true;
              const video = videoRef.current;
              const duration = video && Number.isFinite(video.duration) ? video.duration : 0;
              if (tcRef.current) tcRef.current.textContent = fmt((Number((event.target as HTMLInputElement).value) / 100000) * duration);
            }}
            onChange={(event) => {
              const video = videoRef.current;
              const duration = video && Number.isFinite(video.duration) ? video.duration : 0;
              if (video) video.currentTime = (Number(event.target.value) / 100000) * duration;
              drag.current = false;
            }}
          />
          <span ref={tdRef} className="w-12 text-center text-xs text-white">
            0:00
          </span>
          <Tiny
            label="Tắt hoặc bật tiếng"
            onClick={() => {
              const video = videoRef.current;
              if (video) video.muted = !video.muted;
            }}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Tiny>
          <Tiny
            label="Tốc độ phát"
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              video.playbackRate = SPEEDS[(SPEEDS.indexOf(video.playbackRate) + 1) % SPEEDS.length] ?? 1;
            }}
          >
            {rate}×
          </Tiny>
        </div>
      </div>
      {panel && full && panelNode}
    </div>
    {panel && !full && panelNode}
    <p className="gesture-hint">Kéo ngang để tua. Kéo dọc bên phải chỉnh tiếng, bên trái chỉnh sáng. Chạm đúp hai mé để nhảy 10 giây.</p>
    </div>
  );
}

const SAMPLE_STROKE = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";

function sampleBottom(pos: number) {
  return `${Math.min(62, Math.max(8, pos))}%`;
}

function cueStyle(sub: SubStyle, full: boolean): CSSProperties {
  const background = sub.bgm === "box" ? `rgba(0,0,0,${sub.op / 100})` : sub.bgm === "solid" ? "#000" : "transparent";
  const textShadow = sub.bgm === "outline" ? SAMPLE_STROKE : sub.bgm === "none" ? "0 1px 4px #000, 0 0 8px #000" : "0 1px 2px #000";
  return {
    fontFamily: FONTS[Number(sub.font)] || FONTS[0],
    fontWeight: sub.font === "3" ? 400 : 700,
    fontSize: `calc(${sub.size / 100} * ${full ? "clamp(18px, 3.4vw, 44px)" : "clamp(15px, 4.4vw, 26px)"})`,
    color: sub.col,
    background,
    textShadow,
    lineHeight: 1.4,
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  };
}

function Tiny({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} className="inline-flex min-tap items-center justify-center rounded-full border border-white/30 bg-black/50 px-3 text-sm text-white" onClick={onClick}>
      {children}
    </button>
  );
}
