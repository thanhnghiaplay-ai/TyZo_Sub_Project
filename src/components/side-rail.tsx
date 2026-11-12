import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth/client";

export type RailItem = {
  id: string;
  label: string;
  current?: boolean;
  onPick?: () => void;
  href?: "/" | "/admin";
};

export function SideRail({ items, label }: { items: RailItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function shut(item: RailItem) {
    item.onPick?.();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="rail-toggle"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="rail-bars" aria-hidden="true" />
      </button>
      {open ? <button type="button" className="rail-backdrop" aria-label="Đóng menu" onClick={() => setOpen(false)} /> : null}
      <aside className={"app-rail" + (open ? " is-open" : "")} aria-label={label}>
        <nav className="rail-nav">
          {items.map((item) =>
            item.href === "/admin" ? (
              <Link key={item.id} to="/admin" className="rail-link" aria-current={item.current ? "page" : undefined} onClick={() => shut(item)}>
                {item.label}
              </Link>
            ) : item.href === "/" ? (
              <Link key={item.id} to="/" className="rail-link" aria-current={item.current ? "page" : undefined} onClick={() => shut(item)}>
                {item.label}
              </Link>
            ) : (
              <button key={item.id} type="button" className="rail-link" aria-current={item.current ? "page" : undefined} onClick={() => shut(item)}>
                {item.label}
              </button>
            ),
          )}
        </nav>
        <button
          type="button"
          className="rail-out"
          disabled={leaving}
          onClick={() => {
            setLeaving(true);
            void signOut("/login").catch(() => setLeaving(false));
          }}
        >
          {leaving ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
      </aside>
    </>
  );
}
