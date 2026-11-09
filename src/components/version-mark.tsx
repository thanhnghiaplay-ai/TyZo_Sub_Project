import { useEffect, useRef, useState } from "react";
import { APP_VERSION, CHANGELOG } from "@/lib/app-version";

const SEEN_KEY = "tyzo-seen-version";

export function VersionMark({ align = "end" }: { align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setFresh(localStorage.getItem(SEEN_KEY) !== APP_VERSION);
    } catch {
      setFresh(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function show(next: boolean) {
    setOpen(next);
    if (!next) return;
    setFresh(false);
    try {
      localStorage.setItem(SEEN_KEY, APP_VERSION);
    } catch {
      /* máy không cho lưu */
    }
  }

  return (
    <div
      ref={box}
      className={"version-wrap" + (align === "start" ? " is-start" : "")}
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) show(true);
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover)").matches) show(false);
      }}
    >
      <button
        type="button"
        className={"version-mark" + (fresh ? " is-fresh" : "")}
        aria-expanded={open}
        onClick={() => show(!open)}
      >
        v{APP_VERSION}
        {fresh && <span className="version-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="version-log" role="dialog" aria-label="Các lần cập nhật">
          <p className="version-log-title">Cập nhật</p>
          <ol>
            {CHANGELOG.slice(0, 8).map((item) => (
              <li key={item.version}>
                <strong>v{item.version}</strong>
                <time>{item.time}</time>
                <p className="version-title">{item.title}</p>
                <ul className="version-points">
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
