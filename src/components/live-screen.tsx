import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Mic, MonitorSpeaker, Square, Play, Wallet } from "lucide-react";
import { AppShell, RailToggle, SideRail, type RailItem } from "@/components/side-rail";
import { BrandMark } from "@/components/brand-mark";
import { DisplayToggle } from "@/components/display-toggle";
import { ExportMenu, type ExportFormat } from "@/components/export-menu";
import { NoticeBell } from "@/components/notice-bell";
import { TopUp } from "@/components/top-up";
import { VersionMark } from "@/components/version-mark";
import { pushToast } from "@/components/toast";
import { useCaps, useWakeLock } from "@/components/use-caps";
import { useLive, type LiveInput } from "@/components/use-live";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { LIVE_LANGS, liveLang, targetHasVoice } from "@/lib/live/langs";
import { downloadLiveFile, hasLiveCues, liveExportFile } from "@/lib/live/live-export";
import { LIVE_MODELS } from "@/lib/live/live-open-rules";
import { LIVE_MODEL_35, LIVE_MODEL_38 } from "@/lib/live/live-price";
import { elapsedLabel, liveBalanceLine, liveButton, liveStateText, liveWarnText } from "@/lib/live/live-view";

const MODEL_NAME: Record<string, string> = {
  [LIVE_MODEL_38]: "Qwen 3.8 (mới nhất)",
  [LIVE_MODEL_35]: "Qwen 3.5",
};

const SAVED = "tyzo-live-settings";

type Saved = { model: string; target: string; source: string; audio: boolean; input: LiveInput };
const DEFAULTS: Saved = { model: LIVE_MODELS[0], target: "vi", source: "", audio: true, input: "tab" };

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

const SELECT = "min-tap w-full rounded-xl border border-line bg-raised px-3 text-sm outline-none disabled:opacity-50";

/** Màn hình Dịch trực tiếp: chọn ngôn ngữ, bắt đầu/dừng, chữ gốc và chữ dịch chạy theo thời gian thực, số dư, tải SRT/VTT/TXT. */
export function LiveScreen() {
  const live = useLive();
  const caps = useCaps();
  const { user } = useCurrentUserState();
  const [settings, setSettings] = useState<Saved>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const stuck = useRef(true);

  useEffect(() => {
    setSettings(readSaved());
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
  useWakeLock(running);

  // Máy chỉ có micro (điện thoại) thì đổi sang micro. Máy chưa đo xong thì giữ lựa chọn.
  const input: LiveInput = settings.input === "tab" && !caps.tabAudio && caps.mic ? "mic" : settings.input;

  const voice = targetHasVoice(settings.target);
  const button = liveButton(live.state);
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
      { id: "home", label: "Trang chủ", href: "/" },
      { id: "dich-truc-tiep", label: "Dịch trực tiếp", current: true },
      { id: "tai-video", label: "Tải video", href: "/tai-video" },
      {
        id: "tai-khoan",
        label: "Tài khoản",
        children: [
          { id: "goi", label: "Thuê phòng và gói", href: "/goi" },
          { id: "ctv", label: "Cộng tác viên", href: "/ctv" },
          { id: "yeu-cau", label: "Yêu cầu xem lại", href: "/yeu-cau" },
        ],
      },
    ],
    [],
  );

  const noInput = loaded && !caps.mic && !caps.tabAudio;

  return (
    <AppShell className="contents">
      <SideRail label="Chức năng" items={railItems} who={{ name: user?.displayName, email: user?.primaryEmail }} />
      <main className="room-wide mx-auto flex min-h-dvh flex-col gap-3 bg-bg px-4 py-4 text-fg">
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <RailToggle />
            <BrandMark small title="TyZo Sub" />
          </div>
          <div className="flex items-center gap-2">
            <VersionMark />
            <DisplayToggle />
            <NoticeBell />
          </div>
        </header>

        <div>
          <h1 className="text-xl font-semibold">Dịch trực tiếp</h1>
          <p className="mt-1 text-sm text-muted">Nghe tiếng nói rồi hiện chữ gốc và chữ dịch ngay khi đang nói, kèm tiếng dịch nếu bạn bật.</p>
        </div>

        <section className="grid gap-3 rounded-2xl border border-line bg-card p-3" aria-label="Cài đặt dịch trực tiếp">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Nguồn âm thanh">
            <button
              type="button"
              disabled={locked || !caps.tabAudio}
              aria-pressed={input === "tab"}
              onClick={() => setSettings((s) => ({ ...s, input: "tab" }))}
              className={"min-tap inline-flex items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold disabled:opacity-40 " + (input === "tab" ? "border-accent bg-accent text-ink" : "border-line")}
            >
              <MonitorSpeaker className="size-4" aria-hidden="true" />
              Âm thanh tab
            </button>
            <button
              type="button"
              disabled={locked || !caps.mic}
              aria-pressed={input === "mic"}
              onClick={() => setSettings((s) => ({ ...s, input: "mic" }))}
              className={"min-tap inline-flex items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold disabled:opacity-40 " + (input === "mic" ? "border-accent bg-accent text-ink" : "border-line")}
            >
              <Mic className="size-4" aria-hidden="true" />
              Micro
            </button>
          </div>
          {!caps.tabAudio && loaded && <p className="text-xs text-muted">Thu âm thanh của tab chỉ có trên Chrome hoặc Edge ở máy tính. Trên điện thoại hãy dùng micro.</p>}
          {input === "tab" && caps.tabAudio && <p className="text-xs text-muted">Khi bấm Bắt đầu, chọn tab trình duyệt và bật mục chia sẻ âm thanh của tab.</p>}
          {noInput && <p className="text-sm text-danger">Trình duyệt này không thu được âm thanh. Hãy mở trang bằng https trên Chrome, Edge hoặc Safari mới.</p>}

          <div className="grid gap-3 sm:grid-cols-2">
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
                {LIVE_MODELS.map((id) => (
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
        </section>

        <section className="grid gap-2 rounded-2xl border border-line bg-card p-3" aria-label="Số dư">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-sm">
              <Wallet className="size-4 text-muted" aria-hidden="true" />
              <span data-testid="live-balance">{live.money == null ? "Đang xem số dư…" : liveBalanceLine(live.money, live.minutes)}</span>
            </p>
            <button type="button" className="min-tap rounded-full border border-line px-4 text-sm font-semibold" onClick={() => setTopOpen((value) => !value)} aria-expanded={topOpen}>
              {topOpen ? "Đóng nạp tiền" : "Nạp thêm"}
            </button>
          </div>
          {live.perMinute != null && <p className="text-xs text-muted">Giá khoảng {new Intl.NumberFormat("vi-VN").format(live.perMinute)} đ mỗi phút. Tiền chỉ bị trừ theo phần đã dịch.</p>}
          {warnText && (
            <p role="alert" className={"flex items-start gap-2 rounded-xl border px-3 py-2 text-sm " + (live.warn === "out" ? "border-error text-danger" : "border-warning text-warning")}>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{warnText}</span>
            </p>
          )}
          {topOpen && <TopUp compact opened onPaid={() => { live.refreshBalance(); window.dispatchEvent(new Event("tyzo-room-refresh")); }} />}
        </section>

        <section className="grid gap-2" aria-label="Điều khiển">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={button.disabled}
              onClick={() => (button.stops ? live.stop() : live.start({ ...settings, input, audio: voice && settings.audio }))}
              className={"min-tap inline-flex min-w-40 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold disabled:opacity-50 " + (button.stops ? "border border-error text-danger" : "bg-accent text-ink")}
            >
              {button.stops ? <Square className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              {button.label}
            </button>
            <ExportMenu disabled={!hasText} onPick={pick} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted" aria-live="polite">
            <span>{liveStateText(live.state, live.reconnecting)}</span>
            {(running || live.elapsedMs > 0) && <span>{elapsedLabel(live.elapsedMs)}</span>}
          </div>
          {live.state === "live" && (
            <div className="h-1.5 overflow-hidden rounded-full bg-raised" role="meter" aria-label="Mức âm thanh đang thu" aria-valuemin={0} aria-valuemax={1} aria-valuenow={Math.min(1, live.level)}>
              <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${Math.round(Math.min(1, live.level) * 100)}%` }} />
            </div>
          )}
          {live.error && (
            <p role="alert" className="rounded-xl border border-error px-3 py-2 text-sm text-danger">
              {live.error}
            </p>
          )}
        </section>

        <section className="flex min-h-48 flex-1 flex-col rounded-2xl border border-line bg-card" aria-label="Chữ dịch">
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
    </AppShell>
  );
}
