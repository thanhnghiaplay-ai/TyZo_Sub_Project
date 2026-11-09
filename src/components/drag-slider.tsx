import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const THUMB = 32;

export function DragSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  defaultValue,
  marks = [],
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  defaultValue?: number;
  marks?: number[];
  onCommit: (value: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const grab = useRef<number | null>(null);
  const draftRef = useRef<number | null>(null);
  const [draft, setDraft] = useState<number | null>(null);
  const decimals = (String(step).split(".")[1] ?? "").length;
  const clean = (next: number) => Number(Math.min(max, Math.max(min, next)).toFixed(decimals));
  const snap = (next: number) => {
    const stepped = clean(Math.round((next - min) / step) * step + min);
    const near = marks.find((mark) => Math.abs(stepped - mark) <= step * 1.5);
    return near ?? stepped;
  };
  const shown = draft ?? value;
  const ratio = max === min ? 0 : (shown - min) / (max - min);
  const edge = (part: number) => `calc(${part} * (100% - ${THUMB}px))`;
  const fromX = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width <= THUMB) return shown;
    const part = (clientX - (grab.current ?? 0) - rect.left - THUMB / 2) / (rect.width - THUMB);
    return snap(min + Math.min(1, Math.max(0, part)) * (max - min));
  };
  const setLive = (next: number) => {
    if (next === draftRef.current) return;
    if (marks.includes(next)) navigator.vibrate?.(8);
    draftRef.current = next;
    setDraft(next);
  };
  const down = (event: PointerEvent<HTMLButtonElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    grab.current = event.clientX - (box.left + box.width / 2);
    event.currentTarget.setPointerCapture(event.pointerId);
    draftRef.current = value;
    setDraft(value);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (grab.current !== null) setLive(fromX(event.clientX));
  };
  const up = () => {
    if (grab.current === null) return;
    grab.current = null;
    const final = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (final !== null && final !== value) onCommit(final);
  };
  const key = (event: KeyboardEvent<HTMLButtonElement>) => {
    const by = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[event.key as "ArrowLeft"];
    if (by !== undefined) onCommit(snap(value + by));
    else if (event.key === "Home") onCommit(min);
    else if (event.key === "End") onCommit(max);
    else return;
    event.preventDefault();
  };
  const stepBtn = "grid size-8 place-items-center rounded-full border border-line text-fg";
  return (
    <div className="grid gap-1 text-sm text-muted">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="flex items-center gap-1">
          <button type="button" className={stepBtn} aria-label={`Giảm ${label}`} onClick={() => onCommit(snap(value - step))}>
            −
          </button>
          <b className="min-w-[4.5rem] text-center font-medium text-fg tabular-nums">{format(shown)}</b>
          <button type="button" className={stepBtn} aria-label={`Tăng ${label}`} onClick={() => onCommit(snap(value + step))}>
            +
          </button>
        </span>
      </div>
      <div ref={track} className="relative h-8 select-none">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent" style={{ width: `calc(${THUMB / 2}px + ${edge(ratio)})` }} />
        {marks.map((mark) => (
          <i
            key={mark}
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-muted"
            style={{ left: `calc(${THUMB / 2}px + ${edge((mark - min) / (max - min || 1))})` }}
          />
        ))}
        <button
          type="button"
          role="slider"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={shown}
          aria-valuetext={format(shown)}
          className={"absolute top-1/2 size-8 -translate-y-1/2 rounded-full border-2 border-accent bg-card shadow " + (draft !== null ? "scale-110" : "")}
          style={{ left: edge(ratio), touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
        />
      </div>
      {defaultValue !== undefined && value !== defaultValue && (
        <button type="button" className="justify-self-end text-xs underline" onClick={() => onCommit(defaultValue)}>
          Đặt lại {format(defaultValue)}
        </button>
      )}
    </div>
  );
}
