import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Icon } from "@/components/ui/icon";
import { DragSlider } from "@/components/drag-slider";
import { PlayerDrop } from "@/components/player-drop";
import { useCaps } from "@/components/use-caps";
import { isMediaFile, type FileThumb } from "@/components/file-thumb";
import { effectiveLead } from "@/lib/sub/narration-sync";
import { cueText, findCueIndex, fmt, speechIndex } from "@/lib/sub/text";
import { type Seg } from "@/lib/sub/types";
import { ARS, FIELD, FONTS, SPEEDS, SUB_DEF, type SubStyle } from "@/components/studio-shared";
import { Select } from "@/components/studio-parts";

/** Khung video của phòng dịch (Stage): phát, cử chỉ, phụ đề trên video, toàn màn hình. Tách từ studio.tsx (23/11/2026). */

export function Stage({
  videoRef,
  segs,
  sub,
  setSub,
  narrationOn,
  lead,
  onCue,
  onSpeak,
  leadComp,
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
  /** Độ trễ tạo giọng cần bù (giây): câu được chọn đọc sớm đúng bằng số này, cộng với ô chỉnh tay. */
  leadComp: () => number;
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
  const compRef = useRef(leadComp);
  const busyRef = useRef(speechBusy);
  const onPauseRef = useRef(onPause);
  segsRef.current = segs;
  subRef.current = sub;
  leadRef.current = lead;
  narrRef.current = narrationOn;
  onCueRef.current = onCue;
  onSpeakRef.current = onSpeak;
  compRef.current = leadComp;
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
        const offset = effectiveLead(leadRef.current, compRef.current());
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
      if (!panelRef.current) hideT.current = window.setTimeout(() => setUi(false), 3000);
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

  const caps = useCaps();
  useEffect(() => {
    applyAspect();
    const fsElement = () => document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
    const onFs = () => setFull(fsElement() === stageRef.current);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    window.addEventListener("resize", applyAspect);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
      window.removeEventListener("resize", applyAspect);
    };
  }, [ar]);

  useEffect(() => {
    if (panel && !full) panelBoxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [panel, full]);

  // Toàn màn hình thật khi trình duyệt cho (máy tính, Android, Safari có tiền tố webkit); iPhone không cho
  // phần tử thường thì dùng khung phủ kín trang, thoát bằng nút hoặc phím Esc.
  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) setFull(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [full]);

  const toggleFull = async () => {
    const stage = stageRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    if (!stage) return;
    const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenElement?: Element | null };
    try {
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        setFull(false);
        return;
      }
      if (full) {
        setFull(false);
        return;
      }
      if (stage.requestFullscreen) await stage.requestFullscreen();
      else if (stage.webkitRequestFullscreen) await stage.webkitRequestFullscreen();
      else setFull(true);
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
        if (video.paused) void video.play().catch(() => {});
        else video.pause();
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
            ? "absolute inset-x-0 bottom-0 z-30 flex max-h-[75%] touch-auto flex-col overflow-hidden rounded-t-[var(--radius-card)] border-t border-line bg-card"
            : "flex max-h-[80dvh] touch-auto flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card"
        }
      >
          <div className="flex items-center justify-between px-4 pt-3">
            <h3 className="font-semibold">Phụ đề</h3>
            <button type="button" aria-label="Đóng" className="min-tap rounded-full border border-line px-3" onClick={() => setPanel(false)}>
              <Icon slot="act.close" className="size-4" />
            </button>
          </div>
          <div className="mx-4 mt-2 shrink-0 overflow-hidden rounded-[var(--radius-ctl)] border border-accent/50 bg-black shadow-lg">
            <p className="px-3 pt-2 text-xs text-muted">Mẫu nổi — nằm yên khi kéo các thanh bên dưới</p>
            <div className="relative h-28">
              <div className="absolute inset-x-[6%] text-center" style={{ bottom: sampleBottom(sub.pos) }}>
                <span className="rounded-[var(--radius-ctl)] px-2" style={{ ...cueStyle(sub, false), opacity: sub.on ? 1 : 0.4 }}>
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
            <button type="button" className="col-span-2 min-tap rounded-[var(--radius-ctl)] border border-line" onClick={() => setSub(SUB_DEF)}>
              Đặt lại mặc định
            </button>
          </div>
        </div>
  );

  return (
    <div className="player-stack">
    <div
      ref={stageRef}
      className={"relative touch-none overflow-hidden bg-black select-none " + (full ? "fixed inset-0 z-40 h-dvh rounded-none" : "aspect-video rounded-[var(--radius-card)]")}
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
          } else if (video.paused) void video.play().catch(() => {});
          else video.pause();
          if (stageRef.current) stageRef.current.dataset.tap = "0";
          return;
        }
        if (stageRef.current) stageRef.current.dataset.tap = String(now);
        clearTimeout(tapT.current);
        tapT.current = window.setTimeout(() => {
          setUi(true);
          window.clearTimeout(hideT.current);
          if (!panelRef.current) hideT.current = window.setTimeout(() => setUi(false), 3000);
        }, 280);
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
          <span className="rounded-[var(--radius-ctl)] px-2" style={renderedCue}>
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
        <div className="pointer-events-none absolute inset-2 z-[26] grid place-items-center rounded-[var(--radius-ctl)] border-2 border-dashed border-accent bg-black/70 text-sm font-semibold text-white">
          Thả để đổi video
        </div>
      )}
      <div className={"absolute inset-0 z-20 flex flex-col justify-between transition-opacity " + (ui || panel ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div className="flex justify-end gap-2 p-2">
          <Tiny label="Tỷ lệ khung hình" onClick={() => setAr((n) => (n + 1) % ARS.length)}>
            {ARS[ar][0]}
          </Tiny>
          {caps.lockOrientation && (
            <Tiny
              label="Xoay"
              onClick={() => {
                const next = full && ar % 2 === 0 ? "portrait" : "landscape";
                const orientation = typeof screen !== "undefined" ? (screen.orientation as (ScreenOrientation & { lock?: (type: string) => Promise<void> }) | undefined) : undefined;
                void orientation?.lock?.(next).catch(() => {});
              }}
            >
              <Icon slot="ui.rotate" className="size-4" />
            </Tiny>
          )}
          <Tiny label="Cài đặt phụ đề" tour="sub-style" onClick={() => setPanel((open) => !open)}>
            <Icon slot="ui.settings" className="size-4" />
          </Tiny>
          <Tiny label="Toàn màn hình" onClick={() => void toggleFull()}>
            <Icon slot="act.fullscreen" className="size-4" />
          </Tiny>
        </div>
        <button
          type="button"
          aria-label={paused ? "Phát" : "Tạm dừng"}
          className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) void video.play().catch(() => {});
            else video.pause();
          }}
        >
          {paused ? <Icon slot="act.start" className="size-7" /> : <Icon slot="act.pause" className="size-7" />}
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
            {muted ? <Icon slot="ui.mute" className="size-4" /> : <Icon slot="ui.speaker" className="size-4" />}
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

function Tiny({ label, onClick, children, tour }: { label: string; onClick: () => void; children: ReactNode; tour?: string }) {
  return (
    <button type="button" aria-label={label} data-tour={tour} className="inline-flex min-tap items-center justify-center rounded-full bg-black/45 px-3 text-sm text-white" onClick={onClick}>
      {children}
    </button>
  );
}
