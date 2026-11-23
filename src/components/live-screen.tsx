import { MENU_GROUP, MENU_ITEM } from "@/lib/customer-menu";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LiveCaptionView } from "@/components/live-caption-view";
import { useCaptionWindow } from "@/components/use-caption-window";
import {
  CAPTION_DEFAULT,
  CAPTION_SIZE_LABEL,
  HOTWORD_MAX,
  packSavedLive,
  parseCaptionPrefs,
  parseHotwords,
  parseSavedLive,
  type CaptionPrefs,
  type CaptionSize,
  type SavedLive,
} from "@/lib/live/live-caption";
import { BackButton } from "@/components/back-button";
import { Icon } from "@/components/ui/icon";
import { AppShell, RailToggle, SideRail, type RailItem } from "@/components/side-rail";
import { BrandMark } from "@/components/brand-mark";
import { DisplayToggle } from "@/components/display-toggle";
import { ExportMenu, type ExportFormat } from "@/components/export-menu";
import { NoticeBell } from "@/components/notice-bell";
import { Link } from "@tanstack/react-router";
import { VersionMark } from "@/components/version-mark";
import { pushToast } from "@/components/toast";
import { useCaps, useWakeLock } from "@/components/use-caps";
import { useLive, type LiveInput } from "@/components/use-live";
import { MaintenanceNotice, ServiceSwitch } from "@/components/service-notice";
import { useServiceStatus } from "@/components/use-service-status";
import { railBadge } from "@/lib/service-status";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { TourHost } from "@/components/tour-host";
import { LIVE_LANGS, liveLang, targetHasVoice } from "@/lib/live/langs";
import { downloadLiveFile, hasLiveCues, liveExportFile } from "@/lib/live/live-export";
import { getLiveShow } from "@/lib/live/live-show-room";
import { liveOpenModels } from "@/lib/live/live-show";
import { LIVE_MODELS } from "@/lib/live/live-open-rules";
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "@/lib/live/live-price";
import { elapsedLabel, liveBalanceLine, liveButton, liveStateText, liveWarnText } from "@/lib/live/live-view";

const MODEL_NAME: Record<string, string> = {
  [LIVE_MODEL_38]: "Qwen 3.8 (mới nhất)",
  [LIVE_MODEL_35]: "Qwen 3.5",
};

const SAVED = "tyzo-live-settings";
/** Chữ của phiên gần nhất, chỉ lưu trên máy khách: tải lại trang vẫn tải được phụ đề. */
const LAST = "tyzo-live-last";

type Saved = { model: string; target: string; source: string; audio: boolean; input: LiveInput; caption: CaptionPrefs; words: string };
const DEFAULTS: Saved = { model: LIVE_MODELS[0], target: "vi", source: "", audio: true, input: "tab", caption: CAPTION_DEFAULT, words: "" };

function readLast(): SavedLive | null {
  try {
    return parseSavedLive(localStorage.getItem(LAST));
  } catch {
    return null;
  }
}

function writeLast(value: SavedLive | null) {
  try {
    if (value) localStorage.setItem(LAST, JSON.stringify(value));
    else localStorage.removeItem(LAST);
  } catch {
    /* máy đầy hoặc không cho lưu */
  }
}

function stampOf(at: number) {
  const date = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

function readSaved(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED) ?? "null") as Partial<Saved> | null;
    if (!raw) return DEFAULTS;
    return {
      model: LIVE_MODELS.includes(String(raw.model)) ? String(raw.model) : DEFAULTS.model,
      target: liveLang(String(raw.target)) ? String(raw.target) : DEFAULTS.target,
      source: raw.source && liveLang(String(raw.source)) ? String(raw.source) : "",
      audio: raw.audio !== false,
      input: raw.input === "mic" ? "mic" : "tab",
      caption: parseCaptionPrefs(raw.caption),
      words: typeof raw.words === "string" ? raw.words.slice(0, 4000) : "",
    };
  } catch {
    return DEFAULTS;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

const SELECT = "min-tap w-full rounded-[var(--radius-ctl)] border border-line bg-raised px-3 text-sm outline-none disabled:opacity-50";

/** Màn hình Dịch trực tiếp: chọn ngôn ngữ, bắt đầu/dừng, chữ gốc và chữ dịch chạy theo thời gian thực, số giây, tải SRT/VTT/TXT. */
export function LiveScreen() {
  const live = useLive();
  const caps = useCaps();
  const service = useServiceStatus();
  const { user } = useCurrentUserState();
  const [settings, setSettings] = useState<Saved>(DEFAULTS);
  // Model Chủ đã mở cho dịch trực tiếp (null = chưa lưu, mở hết model làm được).
  const [liveShow, setLiveShow] = useState<string[] | null>(null);
  useEffect(() => {
    void getLiveShow()
      .then(setLiveShow)
      .catch(() => setLiveShow(null));
  }, []);
  const openModels = useMemo(() => liveOpenModels(liveShow, LIVE_MODELS), [liveShow]);
  // Chủ đã lưu danh sách mà không mở model nào: báo rõ và không cho bắt đầu.
  const noModel = liveShow !== null && openModels.length === 0;
  useEffect(() => {
    if (openModels.length && !openModels.includes(settings.model)) setSettings((s) => ({ ...s, model: openModels[0] }));
  }, [openModels, settings.model]);
  const [loaded, setLoaded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);
  const captionWin = useCaptionWindow();
  const [big, setBig] = useState(false);
  const bigRef = useRef<HTMLDivElement>(null);
  const [last, setLast] = useState<SavedLive | null>(null);
  const cuesRef = useRef(live.cues);
  cuesRef.current = live.cues;
  const words = useMemo(() => parseHotwords(settings.words), [settings.words]);
  const caption = settings.caption;
  const setCaption = (patch: Partial<CaptionPrefs>) => setSettings((s) => ({ ...s, caption: { ...s.caption, ...patch } }));

  useEffect(() => {
    setSettings(readSaved());
    setLast(readLast());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SAVED, JSON.stringify(settings));
    } catch {
      /* máy không cho lưu */
    }
  }, [settings, loaded]);

  const running = live.state === "live" || live.state === "connecting" || live.state === "closing";
  const locked = running || live.state === "opening";
  useWakeLock(running || big);

  // Lưu chữ của phiên trên máy: mỗi 5 giây khi đang dịch và một lần khi dừng. Phiên mới thay bản cũ.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const packed = packSavedLive(cuesRef.current, Date.now());
      if (packed) writeLast(packed);
    }, 5000);
    return () => window.clearInterval(id);
  }, [running]);
  useEffect(() => {
    if (live.state !== "closed") return;
    const packed = packSavedLive(cuesRef.current, Date.now());
    if (packed) {
      writeLast(packed);
      setLast(packed);
    }
  }, [live.state]);

  // Màn chữ lớn: xin toàn màn hình khi trình duyệt cho; thoát toàn màn hình (Esc) thì đóng màn này.
  useEffect(() => {
    if (!big) return;
    const node = bigRef.current;
    if (node?.requestFullscreen && !document.fullscreenElement) void node.requestFullscreen().catch(() => undefined);
    const onChange = () => {
      if (!document.fullscreenElement) setBig(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [big]);
  const closeBig = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setBig(false);
  };
  const waiting = running ? "Đang nghe… chữ dịch sẽ hiện ở đây." : "Chưa bắt đầu. Bấm Bắt đầu để nghe và dịch.";
  const openFloat = () => {
    void captionWin.open().then((problem) => {
      if (problem) pushToast(problem, "bad");
    });
  };

  // Máy chỉ có micro (điện thoại) thì đổi sang micro. Máy chưa đo xong thì giữ lựa chọn.
  const input: LiveInput = settings.input === "tab" && !caps.tabAudio && caps.mic ? "mic" : settings.input;

  const voice = targetHasVoice(settings.target);
  const button = liveButton(live.state);
  // Bảo trì chỉ chặn phiên MỚI. Đang chạy thì nút vẫn là Dừng và bấm được.
  const down = service.status.live.state === "maintenance";
  const startBlocked = down && !button.stops;
  const warnText = liveWarnText(live.warn, live.minutes);
  const hasText = hasLiveCues(live.cues);

  // Cuộn theo chữ mới, trừ khi khách đang cuộn lên đọc lại.
  useEffect(() => {
    const node = logRef.current;
    if (node && stuck.current) node.scrollTop = node.scrollHeight;
  }, [live.lines]);

  function pick(format: ExportFormat) {
    const file = liveExportFile(live.cues, format);
    if (!file) return pushToast("Chưa có chữ nào để tải.", "bad");
    downloadLiveFile(file);
  }

  const railItems: RailItem[] = useMemo(
    () => [
      { id: "home", label: MENU_ITEM.home, href: "/" },
      { id: "dich-truc-tiep", label: MENU_GROUP.live, current: true, badge: railBadge(service.status, "live") },
      {
        id: "vi-goi",
        label: MENU_GROUP.wallet,
        children: [
          { id: "so-du", label: MENU_ITEM.tokens, href: "/", hash: "vi" },
          { id: "goi", label: MENU_ITEM.plans, href: "/goi" },
          { id: "ctv", label: MENU_ITEM.partner, href: "/ctv" },
        ],
      },
      {
        id: "tro-giup",
        label: MENU_GROUP.help,
        children: [
          { id: "huong-dan", label: MENU_ITEM.guide, href: "/huong-dan" },
          { id: "yeu-cau", label: MENU_ITEM.appeal, href: "/yeu-cau" },
        ],
      },
    ],
    [service.status],
  );

  const noInput = loaded && !caps.mic && !caps.tabAudio;

  return (
    <AppShell className="contents">
      <TourHost page="/dich-truc-tiep" />
      <SideRail label="Chức năng" items={railItems} who={{ name: user?.displayName, email: user?.primaryEmail }} />
      <main className="room-wide mx-auto flex h-dvh flex-col gap-3 overflow-y-auto bg-bg px-4 py-4 text-fg">
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <BackButton />
            <RailToggle />
            <BrandMark small title="TyZo Sub" />
          </div>
          <div className="flex items-center gap-2">
            <VersionMark />
            <DisplayToggle />
            <NoticeBell />
          </div>
        </header>

        <ServiceSwitch current="live" status={service.status} />

        <div>
          <h1 className="text-xl font-semibold">Dịch trực tiếp</h1>
          <p className="mt-1 text-sm text-muted">Nghe tiếng nói rồi hiện chữ gốc và chữ dịch ngay khi đang nói, kèm tiếng dịch nếu bạn bật.</p>
        </div>

        <MaintenanceNotice group="live" entry={service.status.live} running={running} />

        <section className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-card p-3" aria-label="Cài đặt dịch trực tiếp">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Nguồn âm thanh" data-tour="live-source">
            <button
              type="button"
              disabled={locked || !caps.tabAudio}
              aria-pressed={input === "tab"}
              onClick={() => setSettings((s) => ({ ...s, input: "tab" }))}
              className={"min-tap inline-flex items-center justify-center gap-2 rounded-[var(--radius-ctl)] border px-3 text-sm font-semibold disabled:opacity-40 " + (input === "tab" ? "border-accent bg-accent text-ink" : "border-line")}
            >
              <Icon slot="ui.tab" className="size-4" />
              Âm thanh tab
            </button>
            <button
              type="button"
              disabled={locked || !caps.mic}
              aria-pressed={input === "mic"}
              onClick={() => setSettings((s) => ({ ...s, input: "mic" }))}
              className={"min-tap inline-flex items-center justify-center gap-2 rounded-[var(--radius-ctl)] border px-3 text-sm font-semibold disabled:opacity-40 " + (input === "mic" ? "border-accent bg-accent text-ink" : "border-line")}
            >
              <Icon slot="ui.mic" className="size-4" />
              Micro
            </button>
          </div>
          {!caps.tabAudio && loaded && <p className="text-xs text-muted">Thu âm thanh của tab chỉ có trên Chrome hoặc Edge ở máy tính. Trên điện thoại hãy dùng micro.</p>}
          {input === "tab" && caps.tabAudio && <p className="text-xs text-muted">Khi bấm Bắt đầu, chọn tab trình duyệt và bật mục chia sẻ âm thanh của tab.</p>}
          {noInput && <p className="text-sm text-danger">Trình duyệt này không thu được âm thanh. Hãy mở trang bằng https trên Chrome, Edge hoặc Safari mới.</p>}

          <div className="grid gap-3 sm:grid-cols-2" data-tour="live-lang">
            <Field label="Ngôn ngữ đang nói">
              <select className={SELECT} disabled={locked} value={settings.source} onChange={(event) => setSettings((s) => ({ ...s, source: event.target.value }))}>
                <option value="">Tự nhận biết</option>
                {LIVE_LANGS.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dịch sang">
              <select
                className={SELECT}
                disabled={locked}
                value={settings.target}
                onChange={(event) => setSettings((s) => ({ ...s, target: event.target.value }))}
              >
                {LIVE_LANGS.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                    {lang.audio ? "" : " (chỉ chữ)"}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Model">
              <select className={SELECT} disabled={locked} value={settings.model} onChange={(event) => setSettings((s) => ({ ...s, model: event.target.value }))}>
                {openModels.map((id) => (
                  <option key={id} value={id}>
                    {MODEL_NAME[id] ?? id}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex min-h-11 items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                className="size-5"
                disabled={locked || !voice}
                checked={voice && settings.audio}
                onChange={(event) => setSettings((s) => ({ ...s, audio: event.target.checked }))}
              />
              <span>{voice ? "Phát tiếng dịch qua loa" : "Ngôn ngữ này chỉ có chữ, không có tiếng"}</span>
            </label>
          </div>
          {voice && settings.audio && input === "tab" && <p className="text-xs text-muted">Nên đeo tai nghe để tiếng dịch không lẫn vào âm thanh đang thu.</p>}
          <details className="rounded-[var(--radius-ctl)] border border-line px-3 py-2" data-tour="live-words">
            <summary className="min-tap flex cursor-pointer items-center text-sm font-semibold">
              Từ cần giữ đúng{Object.keys(words).length ? ` (${Object.keys(words).length})` : ""}
            </summary>
            <div className="grid gap-2 pb-1 pt-2">
              <p className="text-xs text-muted">
                Tên nhân vật, địa danh, thuật ngữ hay bị dịch sai. Mỗi dòng một từ, dạng «gốc = cách dịch», ví dụ «李逍遥 = Lý Tiêu Dao». Chỉ ghi «gốc» là giữ nguyên. Tối đa {HOTWORD_MAX} dòng, áp dụng khi bấm Bắt đầu.
              </p>
              <textarea
                className="min-h-24 w-full rounded-[var(--radius-ctl)] border border-line bg-raised px-3 py-2 text-sm outline-none disabled:opacity-50"
                disabled={locked}
                value={settings.words}
                placeholder={"李逍遥 = Lý Tiêu Dao\n灵儿 = Linh Nhi"}
                onChange={(event) => setSettings((s) => ({ ...s, words: event.target.value.slice(0, 4000) }))}
              />
            </div>
          </details>
        </section>


        <section className="grid gap-2 rounded-[var(--radius-card)] border border-line bg-card p-3" aria-label="Số giây" data-tour="live-balance">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm">
              <Icon slot="nav.wallet" className="size-4 text-muted" />
              <span data-testid="live-balance">{live.money == null ? "Đang xem số giây…" : liveBalanceLine(live.money, live.minutes)}</span>
            </p>
            <Link to="/tai-khoan" className="min-tap inline-flex items-center justify-center rounded-full border border-line px-4 text-sm font-semibold">
              Mua Token dịch
            </Link>
          </div>
          {live.perMinute != null && <p className="text-xs text-muted">Khoảng {new Intl.NumberFormat("vi-VN").format(live.perMinute)} giây mỗi phút. Chỉ trừ phần đã dịch.</p>}
          {warnText && (
            <p role="alert" className={"flex items-start gap-2 rounded-[var(--radius-ctl)] border px-3 py-2 text-sm " + (live.warn === "out" ? "border-error text-danger" : "border-warning text-warning")}>
              <Icon slot="st.warn" className="mt-0.5 size-4 shrink-0" />
              <span>{warnText}</span>
            </p>
          )}
        </section>

        <section className="grid gap-2" aria-label="Điều khiển">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-tour="live-start"
              disabled={button.disabled || startBlocked || (noModel && !button.stops)}
              title={startBlocked ? "Dịch trực tiếp đang bảo trì" : undefined}
              onClick={() => (button.stops ? live.stop() : live.start({ model: settings.model, target: settings.target, source: settings.source, input, audio: voice && settings.audio, words }))}
              className={"min-tap inline-flex min-w-40 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold disabled:opacity-50 " + (button.stops ? "border border-error text-danger" : "bg-accent text-ink")}
            >
              {button.stops ? <Icon slot="act.stop" className="size-4" /> : <Icon slot="act.start" className="size-4" />}
              {button.label}
            </button>
            {running && live.state !== "closing" && (
              <button
                type="button"
                onClick={live.togglePause}
                aria-pressed={live.paused}
                className="min-tap inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 text-base font-semibold"
              >
                <Icon slot={live.paused ? "act.start" : "act.pause"} className="size-4" />
                {live.paused ? "Tiếp tục" : "Tạm dừng"}
              </button>
            )}
            <ExportMenu disabled={!hasText} onPick={pick} />
          </div>
          {noModel && <p className="text-sm text-warning" role="status">Hiện chưa mở model nào cho Dịch trực tiếp. Bạn tạm dùng Dịch bình thường, hoặc liên hệ hỗ trợ.</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted" aria-live="polite">
            <span>{liveStateText(live.state, live.reconnecting, live.paused)}</span>
            {(running || live.elapsedMs > 0) && <span>{elapsedLabel(live.elapsedMs)}</span>}
          </div>
          {live.state === "live" && (
            <div className="h-1.5 overflow-hidden rounded-full bg-raised" role="meter" aria-label="Mức âm thanh đang thu" aria-valuemin={0} aria-valuemax={1} aria-valuenow={Math.min(1, live.level)}>
              <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${Math.round(Math.min(1, live.level) * 100)}%` }} />
            </div>
          )}
          {live.error && (
            <p role="alert" className="rounded-[var(--radius-ctl)] border border-error px-3 py-2 text-sm text-danger">
              {live.error}
            </p>
          )}
        </section>

        <section className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-card p-3" aria-label="Hiển thị phụ đề" data-tour="live-caption">
          <div className="flex flex-wrap items-center gap-2">
            {captionWin.kind && (
              <button
                type="button"
                onClick={() => (captionWin.isOpen ? captionWin.close() : openFloat())}
                aria-pressed={captionWin.isOpen}
                className={"min-tap inline-flex items-center gap-2 rounded-full px-4 text-sm font-semibold " + (captionWin.isOpen ? "border border-accent" : "bg-accent text-ink")}
              >
                {captionWin.isOpen ? "Đóng phụ đề nổi" : "Phụ đề nổi"}
              </button>
            )}
            <button type="button" onClick={() => setBig(true)} className="min-tap inline-flex items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold">
              Chữ lớn toàn màn hình
            </button>
          </div>
          <p className="text-xs text-muted">
            {captionWin.kind === "pip"
              ? "Phụ đề nổi là khung nhỏ luôn nằm trên cùng: mở video ở tab khác (kể cả toàn màn hình), kéo khung tới chỗ muốn đặt. Tab này phải còn mở."
              : captionWin.kind === "popup"
                ? "Phụ đề nổi mở trong cửa sổ riêng, đặt cạnh video. Chrome và Edge trên máy tính có khung luôn nằm trên cùng."
                : "Chữ lớn hợp khi dùng điện thoại cạnh TV hay loa."}
          </p>
          <details className="rounded-[var(--radius-ctl)] border border-line px-3 py-2">
            <summary className="min-tap flex cursor-pointer items-center text-sm font-semibold">Tùy chỉnh chữ: {CAPTION_SIZE_LABEL[caption.size].toLowerCase()}, {caption.lines} dòng</summary>
            <div className="grid gap-3 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-muted">Cỡ chữ</span>
              <div className="grid grid-cols-4 gap-1" role="group" aria-label="Cỡ chữ phụ đề">
                {(Object.keys(CAPTION_SIZE_LABEL) as CaptionSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={caption.size === size}
                    onClick={() => setCaption({ size })}
                    className={"min-tap rounded-[var(--radius-ctl)] border px-1 text-xs font-semibold " + (caption.size === size ? "border-accent bg-accent text-ink" : "border-line")}
                  >
                    {CAPTION_SIZE_LABEL[size]}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Số dòng hiện">
              <select className={SELECT} value={caption.lines} onChange={(event) => setCaption({ lines: Number(event.target.value) })}>
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count} dòng
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={caption.source} onChange={(event) => setCaption({ source: event.target.checked })} />
              <span>Hiện chữ gốc</span>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={caption.solid} onChange={(event) => setCaption({ solid: event.target.checked })} />
              <span>Nền đậm</span>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-5" checked={caption.finalOnly} onChange={(event) => setCaption({ finalOnly: event.target.checked })} />
              <span>Chỉ hiện câu đã xong (đọc êm, chậm hơn khoảng 1 giây)</span>
            </label>
          </div>
            </div>
          </details>
        </section>

        {last && !hasText && !running && (
          <section className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-line bg-card px-3 py-2 text-sm" aria-label="Phiên trước">
            <span>
              Phiên trước lúc {stampOf(last.at)}: {last.cues.length} câu, lưu trên máy này.
            </span>
            <span className="flex flex-wrap gap-2">
              <ExportMenu
                disabled={false}
                onPick={(format) => {
                  const file = liveExportFile(last.cues, format);
                  if (file) downloadLiveFile(file);
                }}
              />
              <button
                type="button"
                className="min-tap rounded-full border border-line px-3 text-sm"
                onClick={() => {
                  writeLast(null);
                  setLast(null);
                }}
              >
                Xóa bản lưu
              </button>
            </span>
          </section>
        )}

        <section className="flex min-h-48 flex-1 flex-col rounded-[var(--radius-card)] border border-line bg-card" aria-label="Chữ dịch">
          <div
            ref={logRef}
            role="log"
            aria-live="off"
            tabIndex={0}
            onScroll={(event) => {
              const node = event.currentTarget;
              stuck.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
            }}
            className="max-h-[55dvh] min-h-48 flex-1 space-y-3 overflow-y-auto p-3"
          >
            {live.lines.filter((line) => line.source || line.translation || line.sourceStash || line.translationStash).length === 0 ? (
              <p className="text-sm text-muted">
                {running ? "Đang nghe… chữ sẽ hiện ở đây ngay khi có người nói." : "Bấm Bắt đầu. Chữ gốc và chữ dịch sẽ chạy ở đây."}
              </p>
            ) : (
              live.lines.map((line) => {
                const translation = line.translation + line.translationStash;
                const source = line.source + line.sourceStash;
                if (!translation.trim() && !source.trim()) return null;
                return (
                  <article key={line.id} className="grid gap-0.5">
                    {line.speaker && <p className="text-xs font-semibold text-accent">Người nói {line.speaker}</p>}
                    {translation.trim() ? (
                      <p className="text-lg leading-snug">
                        {line.translation}
                        <span className="opacity-60">{line.translationStash}</span>
                      </p>
                    ) : (
                      <p className="text-lg leading-snug text-muted">…</p>
                    )}
                    {source.trim() && (
                      <p className="text-sm leading-snug text-muted">
                        {line.source}
                        <span className="opacity-60">{line.sourceStash}</span>
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </div>
          {hasText && !running && live.state !== "opening" && (
            <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-xs text-muted">
              <span>Hãy tải phụ đề trước khi bắt đầu lại, vì chữ cũ sẽ bị xóa.</span>
              <button type="button" className="min-tap rounded-full border border-line px-3" onClick={live.clear}>
                Xóa chữ
              </button>
            </div>
          )}
        </section>
      </main>
      {captionWin.target && createPortal(<LiveCaptionView lines={live.lines} prefs={caption} place="float" waiting={waiting} />, captionWin.target)}
      {big && (
        <div ref={bigRef} className="fixed inset-0 z-[90] bg-black" role="dialog" aria-label="Phụ đề chữ lớn">
          <LiveCaptionView lines={live.lines} prefs={caption} place="big" waiting={waiting} />
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2" style={{ marginTop: "env(safe-area-inset-top)" }}>
            <button
              type="button"
              disabled={button.disabled || startBlocked || (noModel && !button.stops)}
              onClick={() => (button.stops ? live.stop() : live.start({ model: settings.model, target: settings.target, source: settings.source, input, audio: voice && settings.audio, words }))}
              className={"min-tap rounded-full px-5 text-sm font-semibold disabled:opacity-50 " + (button.stops ? "border border-white/50 bg-black/60 text-white" : "bg-accent text-ink")}
            >
              {button.label}
            </button>
            {running && live.state !== "closing" && (
              <button type="button" onClick={live.togglePause} aria-pressed={live.paused} className="min-tap inline-flex items-center justify-center gap-1.5 rounded-full border border-white/50 bg-black/60 px-4 text-sm font-semibold text-white">
                <Icon slot={live.paused ? "act.start" : "act.pause"} className="size-4" />
                {live.paused ? "Tiếp tục" : "Tạm dừng"}
              </button>
            )}
            <span className="truncate text-xs text-white/70" aria-live="polite">
              {live.error ? live.error : liveStateText(live.state, live.reconnecting, live.paused)}
            </span>
            <button type="button" onClick={closeBig} className="min-tap shrink-0 rounded-full border border-white/40 bg-black/60 px-4 text-sm font-semibold text-white">
              Đóng
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
