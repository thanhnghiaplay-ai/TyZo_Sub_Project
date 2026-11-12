import { Link } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { signOut } from "@/lib/auth/client";

export type RailItem = {
  id: string;
  label: string;
  current?: boolean;
  onPick?: () => void;
  href?: "/" | "/admin";
};

type RailCtx = {
  open: boolean;
  setOpen: (value: boolean) => void;
  wide: boolean;
  railId: string;
  toggleRef: RefObject<HTMLButtonElement | null>;
  armFocus: () => void;
};

const Ctx = createContext<RailCtx | null>(null);

function useRail() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Cột trái nằm ngoài khung.");
  return ctx;
}

export function AppShell({ children, className, ...rest }: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const railId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const armFocus = () => {
    returnFocus.current = true;
  };
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      setWide(mq.matches);
      if (mq.matches) setOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    toggleRef.current?.focus();
  }, [open]);
  return (
    <Ctx.Provider value={{ open, setOpen, wide, railId, toggleRef, armFocus }}>
      <div className={className ? `app-shell ${className}` : "app-shell"} {...rest}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function RailToggle() {
  const { open, setOpen, wide, railId, toggleRef } = useRail();
  if (wide) return null;
  return (
    <button
      ref={toggleRef}
      type="button"
      className="rail-toggle"
      aria-label={open ? "Đóng menu" : "Mở menu"}
      aria-expanded={open}
      aria-controls={railId}
      onClick={() => setOpen(!open)}
    >
      <span className="rail-bars" aria-hidden="true" />
    </button>
  );
}

export function SideRail({ items, label }: { items: RailItem[]; label: string }) {
  const { open, setOpen, wide, railId, armFocus } = useRail();
  const navRef = useRef<HTMLElement>(null);
  const [leaving, setLeaving] = useState(false);
  const shown = wide || open;

  useEffect(() => {
    if (!open || wide) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        armFocus();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const focusId = window.setTimeout(() => {
      const node =
        navRef.current?.querySelector<HTMLElement>('[aria-current="page"]') ??
        navRef.current?.querySelector<HTMLElement>("a,button");
      node?.focus();
    }, 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusId);
    };
  }, [open, setOpen, wide]);

  function shut(item: RailItem) {
    item.onPick?.();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={"rail-backdrop" + (open && !wide ? " is-open" : "")}
        aria-label="Đóng menu"
        aria-hidden={!open || wide}
        tabIndex={open && !wide ? 0 : -1}
        onClick={() => {
          armFocus();
          setOpen(false);
        }}
      />
      <aside id={railId} className={"app-rail" + (shown ? " is-open" : "")} aria-label={label} aria-hidden={!shown}>
        <nav ref={navRef} className="rail-nav">
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
        <div className="rail-foot">
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
        </div>
      </aside>
    </>
  );
}
