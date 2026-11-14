import { useEffect, useMemo, useRef, useState } from "react";
import { matchCommands, type PaletteCommand } from "@/lib/palette-match";

export type { PaletteCommand };

/** Hộp lệnh nhanh cho trang khách, mở bằng Ctrl+K (Cmd+K trên Mac). */
export function StudioPalette({ commands, open, onOpenChange }: { commands: PaletteCommand[]; open: boolean; onOpenChange: (next: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<Element | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      backRef.current = document.activeElement;
      setQuery("");
      setIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (backRef.current instanceof HTMLElement) {
      backRef.current.focus();
      backRef.current = null;
    }
  }, [open]);

  const items = useMemo(() => matchCommands(commands, query), [commands, query]);
  useEffect(() => {
    setIndex((value) => Math.min(value, Math.max(items.length - 1, 0)));
  }, [items.length]);

  if (!open) return null;

  const runItem = (item: PaletteCommand | undefined) => {
    if (!item) return;
    onOpenChange(false);
    item.run();
  };

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((value) => (items.length ? (value + 1) % items.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((value) => (items.length ? (value - 1 + items.length) % items.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runItem(items[index]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-3 pt-[10vh]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onOpenChange(false)}>
      <div role="dialog" aria-modal="true" aria-label="Lệnh nhanh" className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-xl" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          placeholder="Gõ việc muốn làm: chọn video, tải SRT, nạp tiền…"
          aria-label="Lệnh nhanh"
          role="combobox"
          aria-expanded="true"
          aria-controls="studio-palette-list"
          aria-activedescendant={items[index] ? "studio-palette-" + items[index].id : undefined}
          className="min-h-12 w-full border-b border-line bg-transparent px-4 text-base outline-none"
        />
        <ul id="studio-palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1">
          {items.map((item, position) => (
            <li key={item.id} id={"studio-palette-" + item.id} role="option" aria-selected={position === index}>
              <button
                type="button"
                className={"flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm " + (position === index ? "bg-accent font-semibold text-ink" : "")}
                onMouseEnter={() => setIndex(position)}
                onClick={() => runItem(item)}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                <span className={"shrink-0 text-xs " + (position === index ? "" : "text-muted")}>{item.hint}</span>
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-3 text-sm text-muted">Không có lệnh nào khớp.</li>}
        </ul>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">↑ ↓ để chọn · Enter để chạy · Esc để đóng</p>
      </div>
    </div>
  );
}
