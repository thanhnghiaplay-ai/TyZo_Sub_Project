import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/components/ui/theme-context";
import { applyAccent, clearAccent, fitAccent, hexToRgb, parseAccent, readAccent, rgbToHex, saveAccent } from "@/lib/theme/accent";

const CHANNELS = [
  ["Đỏ", "#ef4444"],
  ["Lục", "#22c55e"],
  ["Lam", "#3b82f6"],
] as const;

/** Màu đang hiện của nút chính (gồm cả màu Admin đặt), dùng làm điểm xuất phát cho thanh kéo. */
function currentAccent(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--color-accent");
  return parseAccent(raw) ?? "#e7b63a";
}

/**
 * Nút «Màu» ở đầu trang: khách kéo ba thanh Đỏ, Lục, Lam hoặc gõ mã hex, chọn màu gì cũng được.
 * Lưu trong máy khách (localStorage `tyzo_accent`), thắng màu Admin đặt chung.
 * Màu quá tối hoặc quá chói so với nền thì tự chỉnh vừa đủ để nút và chữ còn đọc rõ.
 */
export function AccentPicker({ inline = false }: { /** Mở ngay trong bảng chứa nó (bảng «Hiển thị»), không bật bảng nổi chồng lên. */ inline?: boolean } = {}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState("#e7b63a");
  const [typed, setTyped] = useState("#e7b63a");
  const [custom, setCustom] = useState(false);
  const [adjusted, setAdjusted] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const refresh = (next: string) => {
    const mode = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    setAdjusted(fitAccent(next, theme[mode].bg).adjusted);
  };

  const openPanel = () => {
    const saved = readAccent();
    const start = saved ?? currentAccent();
    setCustom(Boolean(saved));
    setHex(start);
    setTyped(start);
    refresh(start);
    setOpen(true);
  };

  const choose = (next: string) => {
    setHex(next);
    setTyped(next);
    setCustom(true);
    refresh(next);
    applyAccent(next, theme.dark.bg, theme.light.bg);
    saveAccent(next);
  };

  const reset = () => {
    clearAccent();
    saveAccent(null);
    setCustom(false);
    setAdjusted(false);
    const start = currentAccent();
    setHex(start);
    setTyped(start);
  };

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const rgb = hexToRgb(hex);
  return (
    <div ref={box} className={inline ? "grid gap-2" : "relative"}>
      {inline ? (
        <button
          type="button"
          className="min-tap inline-flex w-fit items-center gap-2 rounded-full border border-line px-3 text-sm font-medium hover:border-accent"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => (open ? setOpen(false) : openPanel())}
        >
          <span aria-hidden className="size-4 rounded-full border border-line bg-accent" />
          {open ? "Xong" : "Đổi màu"}
        </button>
      ) : (
        <button
          type="button"
          className="notice-bell-btn is-glyph"
          aria-label="Chọn màu nhấn"
          title="Chọn màu nhấn"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => (open ? setOpen(false) : openPanel())}
        >
          <Icon slot="ui.theme" />
        </button>
      )}
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label="Chọn màu nhấn"
          className={
            inline
              ? "grid gap-3 rounded-[var(--radius-ctl)] border border-line p-3 text-sm"
              : "fixed top-16 right-3 z-[60] grid w-[min(20rem,calc(100vw-1.5rem))] gap-3 rounded-[var(--radius-card)] border border-line bg-card p-4 text-sm shadow-xl"
          }
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="size-10 shrink-0 rounded-full border border-line" style={{ background: hex }} />
            <div className="min-w-0">
              <p className="font-semibold">Màu nhấn của bạn</p>
              <p className="text-xs text-muted">{custom ? "Đang dùng màu bạn chọn, lưu trong máy này." : "Đang dùng màu gốc của trang."}</p>
            </div>
          </div>
          {CHANNELS.map(([label, tint], index) => (
            <label key={label} className="grid grid-cols-[2.5rem_minmax(0,1fr)_2rem] items-center gap-2">
              <span className="text-muted">{label}</span>
              <input
                type="range"
                min={0}
                max={255}
                step={1}
                value={rgb[index]}
                aria-label={`${label}, từ 0 đến 255`}
                className="min-tap w-full"
                style={{ accentColor: tint }}
                onChange={(event) => {
                  const next = [...rgb] as [number, number, number];
                  next[index] = Number(event.target.value);
                  choose(rgbToHex(next[0], next[1], next[2]));
                }}
              />
              <span className="text-right tabular-nums text-xs text-muted">{rgb[index]}</span>
            </label>
          ))}
          <label className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2">
            <span className="text-muted">Mã</span>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={7}
              value={typed}
              aria-label="Mã màu dạng #rrggbb"
              className="min-tap w-full rounded-[var(--radius-ctl)] border border-line bg-raised px-3 font-mono outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onChange={(event) => {
                setTyped(event.target.value);
                const parsed = parseAccent(event.target.value);
                if (parsed && event.target.value.replace("#", "").length >= 3) choose(parsed);
              }}
              onBlur={() => setTyped(hex)}
            />
          </label>
          {adjusted && <p role="status" className="text-xs text-warning">Màu này gần màu nền nên đã được chỉnh nhẹ để nút và chữ còn đọc rõ.</p>}
          <button type="button" disabled={!custom} className="min-tap rounded-full border border-line px-4 font-medium disabled:opacity-40" onClick={reset}>
            Về màu gốc
          </button>
        </div>
      )}
    </div>
  );
}
