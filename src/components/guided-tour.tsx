import { useCallback, useEffect, useRef, useState } from "react";

import { markSeen } from "@/components/tour-seen";
import { TOURS, type TourId, type TourStep } from "@/lib/tour-steps";

type Box = { top: number; left: number; width: number; height: number };

/** Khoảng đệm quanh chỗ được làm sáng. */
const PAD = 6;
/** Số lần app tự mở menu trái cho một bước. Quá số này thì thôi, để khách tự đóng menu được. */
const OPEN_TRIES = 6;

function toggleOf(open: boolean): HTMLElement | null {
  return document.querySelector<HTMLElement>(`button.rail-toggle[aria-expanded=${open ? "true" : "false"}]`);
}

/** Phần tử có đang hiện trên màn hình không (không nằm trong vùng bị ẩn như menu trái đang đóng). */
function isShown(el: HTMLElement): boolean {
  if (el.closest('[aria-hidden="true"], [hidden]')) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth;
}

/** Xổ nhóm menu đang gập và mở menu trái (điện thoại) để chỗ cần chỉ hiện ra. Màn rộng không có nút mở menu nên bỏ qua. */
function openRailFor(el: HTMLElement) {
  const sub = el.closest<HTMLElement>(".rail-sub");
  if (sub?.hidden && sub.id) document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(sub.id)}"]`)?.click();
  if (el.closest('aside[aria-hidden="true"]')) toggleOf(false)?.click();
}

function boxOf(sel: string | undefined): Box | null {
  if (!sel) return null;
  const el = document.querySelector<HTMLElement>(sel);
  if (!el || !isShown(el)) return null;
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function same(a: Box | null, b: Box | null): boolean {
  if (!a || !b) return a === b;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/**
 * Hướng dẫn trên giao diện thật. Nền tối mờ, chỉ chỗ cần bấm sáng lên và vẫn bấm được, kèm một thẻ chữ ngắn.
 * Các bước nằm ở `lib/tour-steps.ts`. Vị trí đo lại liên tục nên đổi giao diện, xoay màn hình hay menu trượt ra vẫn đúng chỗ.
 */
export function GuidedTour({ open, onClose, tour = "quick-start" }: { open: boolean; onClose: () => void; tour?: TourId }) {
  const STEPS: TourStep[] = TOURS[tour];
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const now = STEPS[Math.min(step, STEPS.length - 1)];

  const close = useCallback(() => {
    markSeen();
    setStep(0);
    onClose();
  }, [onClose]);

  // Vào bước mới: đưa chỗ cần chỉ vào tầm nhìn, đo liên tục (menu trượt, tab đổi, chỗ hiện muộn).
  useEffect(() => {
    if (!open) return;
    let tries = 0;
    let scrolled = false;
    // Bước không nằm trong menu thì đóng menu đang mở, để menu không che chỗ cần chỉ.
    if (!now.rail) toggleOf(true)?.click();
    const tick = () => {
      const el = now.sel ? document.querySelector<HTMLElement>(now.sel) : null;
      if (el && now.rail && !isShown(el) && tries < OPEN_TRIES) {
        tries += 1;
        openRailFor(el);
      }
      if (el && !scrolled && isShown(el)) {
        scrolled = true;
        el.scrollIntoView?.({ block: "center", inline: "center" });
      }
      const next = boxOf(now.sel);
      setBox((prev) => (same(prev, next) ? prev : next));
    };
    tick();
    const timer = window.setInterval(tick, 150);
    window.addEventListener("resize", tick);
    window.addEventListener("scroll", tick, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", tick);
      window.removeEventListener("scroll", tick, true);
    };
  }, [open, now]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) card.current?.focus();
  }, [open, step]);

  if (!open) return null;
  const last = step === STEPS.length - 1;
  const lonely = !now.sel;
  const lost = Boolean(now.sel) && !box;
  const upper = box ? box.top + box.height / 2 > window.innerHeight / 2 : false;
  const hole = box ? { top: Math.max(0, box.top - PAD), left: Math.max(0, box.left - PAD), width: box.width + PAD * 2, height: box.height + PAD * 2 } : null;

  function next() {
    // Bước có «press»: bấm hộ chỗ được chỉ để bước sau có chỗ để chỉ (ví dụ đổi tab).
    if (now.press && now.sel) document.querySelector<HTMLElement>(now.sel)?.click();
    if (last) close();
    else setStep(step + 1);
  }

  return (
    <>
      {hole && (
        <>
          {/* Bốn tấm chặn quanh chỗ sáng: bấm ra ngoài không làm gì, bấm đúng chỗ sáng thì vẫn thao tác được. */}
          <div aria-hidden className="fixed z-[60]" style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <div aria-hidden className="fixed z-[60]" style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
          <div aria-hidden className="fixed z-[60]" style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div aria-hidden className="fixed z-[60]" style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          <div
            aria-hidden
            className="pointer-events-none fixed z-[60] rounded-xl border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.62)] transition-all duration-200 motion-reduce:transition-none"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
        </>
      )}
      {lonely && <div aria-hidden className="fixed inset-0 z-[60] bg-black/60" />}
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-label={now.title}
        className={"fixed inset-x-3 z-[61] mx-auto grid max-w-md gap-2 rounded-2xl border border-line bg-card p-4 shadow-xl outline-none " + (upper ? "top-3" : "bottom-3")}
      >
        <p className="text-xs text-muted">
          Bước {step + 1} / {STEPS.length}
        </p>
        <h2 className="font-semibold">{now.title}</h2>
        <p className="text-sm">{now.text}</p>
        {lost && <p className="text-xs text-muted">Chỗ này chưa hiện trên màn hình (ví dụ chưa có video hay phụ đề). Bấm Tiếp để sang bước sau.</p>}
        <div className="mt-1 flex items-center justify-between gap-2">
          <button type="button" className="min-tap rounded-full px-3 text-sm text-muted" onClick={close}>
            Bỏ qua
          </button>
          <span className="flex gap-2">
            {step > 0 && (
              <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" onClick={() => setStep(step - 1)}>
                Quay lại
              </button>
            )}
            <button type="button" className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink" onClick={next}>
              {last ? "Xong" : "Tiếp"}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}
