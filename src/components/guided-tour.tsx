import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { markSeen } from "@/components/tour-seen";
import { TOURS, type TourId } from "@/lib/tour-steps";

type Box = { top: number; left: number; width: number; height: number };

/** Hướng dẫn trên giao diện thật. Không chặn thao tác, không làm tối nền. Các bước nằm ở `lib/tour-steps.ts`. */
export function GuidedTour({ open, onClose, tour = "quick-start" }: { open: boolean; onClose: () => void; tour?: TourId }) {
  const STEPS = TOURS[tour];
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const card = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    markSeen();
    setStep(0);
    onClose();
  }, [onClose]);

  const measure = useCallback(() => {
    const el = document.querySelector(STEPS[step].sel) as HTMLElement | null;
    if (!el) return setBox(null);
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return setBox(null);
    setBox({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
  }, [step, STEPS]);

  useLayoutEffect(() => {
    if (!open) return;
    (document.querySelector(STEPS[step].sel) as HTMLElement | null)?.scrollIntoView?.({ block: "nearest", inline: "center" });
    measure();
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return;
    const again = () => measure();
    window.addEventListener("resize", again);
    window.addEventListener("scroll", again, true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    card.current?.focus();
    return () => {
      window.removeEventListener("resize", again);
      window.removeEventListener("scroll", again, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, measure, close]);

  if (!open) return null;
  const last = step === STEPS.length - 1;
  const upper = box ? box.top + box.height / 2 > window.innerHeight / 2 : false;
  return (
    <>
      {box && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-xl border-2 border-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_25%,transparent)] transition-all duration-200 motion-reduce:transition-none"
          style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }}
        />
      )}
      <div
        ref={card}
        tabIndex={-1}
        role="dialog"
        aria-label="Hướng dẫn nhanh"
        className={"fixed inset-x-3 z-[61] mx-auto grid max-w-md gap-2 rounded-2xl border border-line bg-card p-4 shadow-xl outline-none " + (upper ? "top-3" : "bottom-3")}
      >
        <p className="text-xs text-muted">
          Bước {step + 1} / {STEPS.length}
        </p>
        <h2 className="font-semibold">{STEPS[step].title}</h2>
        <p className="text-sm">{STEPS[step].text}</p>
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
            <button type="button" className="min-tap rounded-full bg-accent px-4 text-sm font-semibold text-ink" onClick={() => (last ? close() : setStep(step + 1))}>
              {last ? "Xong" : "Tiếp"}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}
