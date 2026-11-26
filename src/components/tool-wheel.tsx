import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { TOOL_ICON } from "@/lib/tool-icon";
import { RING_RADIUS, WHEEL_ORDER, dragToPos, ringDash, settleDuration, settleTarget, wheelCurrent, wheelOffset, wheelSlot, type WheelId } from "@/lib/tool-wheel";

type WheelLabels = Record<WheelId, string>;

/**
 * Nút vàng giữa thanh dưới: kéo ngang để lướt liên tục qua các công cụ, thả ở đâu chọn công cụ đó
 * (có quán tính, khớp vào công cụ gần nhất, xoay vòng). Bấm (không kéo) thì mở tab công cụ đang chọn.
 * Vị trí đổi trực tiếp trên DOM theo từng khung hình để không làm cả trang vẽ lại; chỉ báo đổi công cụ khi đã dừng.
 */
export function ToolWheel({
  labels,
  currentId,
  onChange,
  onPress,
  progress = null,
}: {
  labels: WheelLabels;
  currentId: WheelId;
  onChange: (id: WheelId) => void;
  onPress: (id: WheelId) => void;
  /** Phần trăm tiến độ lần dịch đang chạy (0..100); null thì không vẽ vòng. */
  progress?: number | null;
}) {
  const n = WHEEL_ORDER.length;
  const startIndex = Math.max(0, WHEEL_ORDER.indexOf(currentId));
  const pos = useRef(startIndex);
  const slots = useRef<(HTMLSpanElement | null)[]>([]);
  const raf = useRef(0);
  const moved = useRef(false);
  const drag = useRef<{ x: number; start: number; lastX: number; lastT: number; vel: number } | null>(null);
  const [cur, setCur] = useState(startIndex);
  const curRef = useRef(startIndex);
  const reported = useRef<WheelId>(currentId);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const layout = useCallback(() => {
    slots.current.forEach((el, i) => {
      if (!el) return;
      const slot = wheelSlot(wheelOffset(i, pos.current, n));
      el.style.transform = `translateX(${slot.x}px) scale(${slot.scale})`;
      el.style.opacity = String(slot.opacity);
    });
    const now = wheelCurrent(pos.current, n);
    if (now !== curRef.current) {
      curRef.current = now;
      setCur(now);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(6);
    }
  }, [n]);

  const report = useCallback(() => {
    const id = WHEEL_ORDER[wheelCurrent(pos.current, n)];
    if (id !== reported.current) {
      reported.current = id;
      changeRef.current(id);
    }
  }, [n]);

  const tween = useCallback(
    (target: number, ms: number) => {
      cancelAnimationFrame(raf.current);
      const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const from = pos.current;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = reduce ? 1 : Math.min(1, (now - t0) / ms);
        pos.current = from + (target - from) * (1 - Math.pow(1 - k, 3));
        layout();
        if (k < 1) raf.current = requestAnimationFrame(step);
        else report();
      };
      raf.current = requestAnimationFrame(step);
    },
    [layout, report],
  );

  useLayoutEffect(layout, [layout]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // Công cụ đổi từ nơi khác (menu trái, tìm nhanh): trượt về đó theo đường ngắn nhất.
  useEffect(() => {
    const idx = WHEEL_ORDER.indexOf(currentId);
    if (idx < 0 || drag.current || wheelCurrent(pos.current, n) === idx) return;
    reported.current = currentId;
    const target = pos.current + wheelOffset(idx, pos.current, n);
    tween(target, settleDuration(pos.current, target));
  }, [currentId, n, tween]);

  const id = WHEEL_ORDER[cur];
  const go = (delta: number) => tween(Math.round(pos.current) + delta, 220);
  /** Mũi tên ‹ ›: chuyển sang công cụ bên cạnh VÀ mở luôn (khách hiểu là đi qua từng bước; trước đây chỉ đổi biểu tượng nút giữa). */
  const step = (delta: number) => {
    const target = Math.round(pos.current) + delta;
    go(delta);
    onPress(WHEEL_ORDER[wheelCurrent(target, n)]);
  };

  return (
    <div className="relative -mt-9 size-16 shrink-0">
      <div className="pointer-events-none absolute -top-9 left-1/2 z-10 flex -translate-x-1/2 items-center">
        <div className="pointer-events-auto flex items-center rounded-full border border-line bg-raised/90 text-accent shadow-md backdrop-blur">
          <button type="button" className="grid size-9 place-items-center rounded-full text-lg leading-none" aria-label="Bước trước" onClick={() => step(-1)}>
            ‹
          </button>
          <button type="button" className="min-w-24 whitespace-nowrap text-center text-xs font-semibold" aria-live="polite" aria-label={`Mở ${labels[id]}`} onClick={() => onPress(id)}>
            {/* Chỉ tên bước: số thứ tự bước nằm ở đầu ngăn công cụ (x/5), không đếm thêm một kiểu ở đây. */}
            {labels[id]}
          </button>
          <button type="button" className="grid size-9 place-items-center rounded-full text-lg leading-none" aria-label="Bước sau" onClick={() => step(1)}>
            ›
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${labels[id]}. Kéo ngang để lướt qua các công cụ, bấm để mở`}
        style={{ touchAction: "pan-y" }}
        className="relative grid size-16 select-none place-items-center overflow-hidden rounded-full border-4 border-bg bg-accent text-ink shadow-[0_8px_24px_color-mix(in_srgb,var(--color-accent)_50%,transparent)] transition-transform active:scale-95 motion-reduce:transition-none"
        onPointerDown={(event) => {
          cancelAnimationFrame(raf.current);
          moved.current = false;
          drag.current = { x: event.clientX, start: pos.current, lastX: event.clientX, lastT: event.timeStamp, vel: 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d) return;
          const dx = event.clientX - d.x;
          if (Math.abs(dx) > 6) moved.current = true;
          const dt = event.timeStamp - d.lastT;
          if (dt > 0) d.vel = 0.7 * d.vel + 0.3 * (-(event.clientX - d.lastX) / 48 / dt);
          d.lastX = event.clientX;
          d.lastT = event.timeStamp;
          pos.current = dragToPos(d.start, dx);
          layout();
        }}
        onPointerUp={() => finish()}
        onPointerCancel={() => finish()}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") go(-1);
          if (event.key === "ArrowRight") go(1);
        }}
        onClick={() => {
          if (moved.current) return;
          onPress(WHEEL_ORDER[wheelCurrent(pos.current, n)]);
        }}
      >
        {WHEEL_ORDER.map((tool, i) => (
          <span key={tool} ref={(el) => { slots.current[i] = el; }} className="absolute inset-0 grid place-items-center will-change-transform">
            <Icon slot={TOOL_ICON[tool].slot} name={TOOL_ICON[tool].name} size="1.9rem" />
          </span>
        ))}
      </button>
      {progress !== null && (
        <svg className="studio-wheel-ring pointer-events-none absolute -inset-1.5 size-[calc(100%+0.75rem)] -rotate-90" viewBox="0 0 100 100" role="progressbar" aria-label="Tiến độ dịch" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="var(--color-line)" strokeWidth="5" />
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={ringDash(progress).circumference}
            strokeDashoffset={ringDash(progress).offset}
            className="transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
          />
        </svg>
      )}
    </div>
  );

  function finish() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const target = settleTarget(pos.current, d.vel);
    tween(target, settleDuration(pos.current, target));
    window.setTimeout(() => {
      moved.current = false;
    }, 200);
  }
}
