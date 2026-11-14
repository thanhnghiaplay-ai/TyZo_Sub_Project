import { useEffect, useMemo, useRef, useState } from "react";
import { looksLikeEmail, matchTabs, type AdminTab, type AdminTabInfo } from "@/lib/admin-tabs";

type Item = { key: string; label: string; hint: string; run: () => void };

/**
 * Hộp tìm nhanh Admin, mở bằng Ctrl+K (Cmd+K trên Mac) hoặc nút Tìm.
 * Gõ tên mục (không dấu cũng được) để nhảy tab; gõ email hoặc một phần email để mở khách.
 * Không đọc thêm dữ liệu nào: mở khách dùng lại đường tìm khách có sẵn của trang Việc.
 */
export function AdminPalette({
  tabs,
  open,
  onOpenChange,
  onPick,
}: {
  tabs: AdminTabInfo[];
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onPick: (id: AdminTab) => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<Element | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
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

  const items = useMemo<Item[]>(() => {
    const text = query.trim();
    const list: Item[] = [];
    const close = () => onOpenChange(false);
    const openUser = (value: string) => {
      close();
      window.dispatchEvent(new CustomEvent("tyzo-open-user", { detail: value }));
    };
    if (looksLikeEmail(text)) list.push({ key: "user-email", label: `Mở khách ${text}`, hint: "Khách", run: () => openUser(text) });
    for (const tab of matchTabs(tabs, text)) {
      list.push({
        key: "tab-" + tab.id,
        label: tab.label,
        hint: "Mục",
        run: () => {
          close();
          onPick(tab.id);
        },
      });
    }
    if (text.length >= 2 && !looksLikeEmail(text)) list.push({ key: "user-find", label: `Tìm khách «${text}»`, hint: "Khách", run: () => openUser(text) });
    return list;
  }, [tabs, query, onOpenChange, onPick]);

  useEffect(() => {
    setIndex((value) => Math.min(value, Math.max(items.length - 1, 0)));
  }, [items.length]);

  if (!open) return null;

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
      items[index]?.run();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-3 pt-[10vh]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onOpenChange(false)}>
      <div role="dialog" aria-modal="true" aria-label="Tìm nhanh" className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-xl" onKeyDown={onKeyDown}>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          placeholder="Gõ tên mục hoặc email khách"
          aria-label="Tìm nhanh"
          role="combobox"
          aria-expanded="true"
          aria-controls="admin-palette-list"
          aria-activedescendant={items[index] ? "admin-palette-" + items[index].key : undefined}
          className="min-h-12 w-full border-b border-line bg-transparent px-4 text-base outline-none"
        />
        <ul id="admin-palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1">
          {items.map((item, position) => (
            <li key={item.key} id={"admin-palette-" + item.key} role="option" aria-selected={position === index}>
              <button
                type="button"
                className={"flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm " + (position === index ? "bg-accent font-semibold text-ink" : "")}
                onMouseEnter={() => setIndex(position)}
                onClick={item.run}
              >
                <span className="min-w-0 truncate">{item.label}</span>
                <span className={"shrink-0 text-xs " + (position === index ? "" : "text-muted")}>{item.hint}</span>
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-3 text-sm text-muted">Không có mục nào khớp.</li>}
        </ul>
        <p className="border-t border-line px-4 py-2 text-xs text-muted">↑ ↓ để chọn · Enter để mở · Esc để đóng</p>
      </div>
    </div>
  );
}
