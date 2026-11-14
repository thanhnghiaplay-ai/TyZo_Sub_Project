import { Link } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { signOut } from "@/lib/auth/client";

export type RailLink = "/" | "/admin" | "/goi" | "/ctv" | "/yeu-cau" | "/tai-video" | "/dich-truc-tiep" | "/huong-dan";

/** Một mục menu. Có `children` thì là nhóm lớn, bấm để xổ các mục nhỏ bên dưới. */
export type RailItem = {
  id: string;
  label: string;
  current?: boolean;
  onPick?: () => void;
  href?: RailLink;
  /** id gắn lên nút, để vùng nội dung trỏ aria-labelledby vào. */
  domId?: string;
  children?: RailItem[];
};

type RailCtx = {
  open: boolean;
  setOpen: (value: boolean) => void;
  /** Đang ghim cố định bên trái (chỉ khi `pinned` và màn từ 1024 px). */
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

export function AppShell({ children, className, pinned = false, ...rest }: { children: ReactNode; pinned?: boolean } & HTMLAttributes<HTMLDivElement>) {
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
      const on = pinned && mq.matches;
      setWide(on);
      if (on) setOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pinned]);
  useEffect(() => {
    if (open || !returnFocus.current) return;
    returnFocus.current = false;
    toggleRef.current?.focus();
  }, [open]);
  return (
    <Ctx.Provider value={{ open, setOpen, wide, railId, toggleRef, armFocus }}>
      <div className={(className ? `app-shell ${className}` : "app-shell") + (pinned ? " is-pinned" : "")} {...rest}>
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

function hasCurrent(item: RailItem): boolean {
  return Boolean(item.current) || Boolean(item.children?.some(hasCurrent));
}

export function SideRail({ items, label, top, who }: { items: RailItem[]; label: string; top?: (close: () => void) => ReactNode; who?: { name?: string | null; email?: string | null } }) {
  const { open, setOpen, wide, railId, armFocus } = useRail();
  const navRef = useRef<HTMLElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [folded, setFolded] = useState<Record<string, boolean>>({});
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

  function leaf(item: RailItem, small: boolean) {
    const cls = "rail-link" + (small ? " is-sub" : "");
    const cur = item.current ? ("page" as const) : undefined;
    if (item.href) {
      return (
        <Link key={item.id} id={item.domId} to={item.href} className={cls} aria-current={cur} onClick={() => shut(item)}>
          {item.label}
        </Link>
      );
    }
    return (
      <button key={item.id} id={item.domId} type="button" className={cls} aria-current={cur} onClick={() => shut(item)}>
        {item.label}
      </button>
    );
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
        {top && <div className="rail-top">{top(() => setOpen(false))}</div>}
        <nav ref={navRef} className="rail-nav">
          {items.map((item) => {
            if (!item.children) return leaf(item, false);
            const isOpen = folded[item.id] ?? hasCurrent(item);
            const groupId = `${railId}-${item.id}`;
            return (
              <div key={item.id} className="rail-group">
                <button
                  type="button"
                  className="rail-link rail-parent"
                  aria-expanded={isOpen}
                  aria-controls={groupId}
                  data-has-current={hasCurrent(item) ? "true" : undefined}
                  onClick={() => setFolded((state) => ({ ...state, [item.id]: !isOpen }))}
                >
                  <span>{item.label}</span>
                  <span className="rail-caret" aria-hidden="true" />
                </button>
                <div id={groupId} className="rail-sub" hidden={!isOpen}>
                  {item.children.map((child) => leaf(child, true))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="rail-foot">
          {who && (who.name || who.email) && (
            <p className="rail-who">
              {who.name && <b>{who.name}</b>}
              {who.email && <span>{who.email}</span>}
            </p>
          )}
          <button
            type="button"
            className="rail-out"
            disabled={leaving}
            onClick={() => {
              if (!window.confirm("Đăng xuất khỏi tài khoản này?")) return;
              setLeaving(true);
              setFailed(false);
              void signOut("/login").catch(() => {
                setLeaving(false);
                setFailed(true);
              });
            }}
          >
            {leaving ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
          {failed && <p className="rail-err">Chưa đăng xuất được. Thử lại.</p>}
        </div>
      </aside>
    </>
  );
}
