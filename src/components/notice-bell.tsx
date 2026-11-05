import { useEffect, useState } from "react";
import { listMyNotices, markNoticesRead, type NoticeRow } from "@/lib/admin-room";

export function NoticeBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NoticeRow[]>([]);

  async function load() {
    try {
      const next = await listMyNotices();
      setUnread(next.unread);
      setItems(next.items);
    } catch {
      setUnread(0);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="notice-bell">
      <button
        type="button"
        className="notice-bell-btn"
        aria-label={unread ? `${unread} thông báo mới` : "Thông báo"}
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && unread) {
            setUnread(0);
            void markNoticesRead()
              .then(load)
              .catch(() => undefined);
          }
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a5 5 0 0 0-5 5v2.2c0 .7-.2 1.4-.7 2L4.6 14.4A1 1 0 0 0 5.4 16h13.2a1 1 0 0 0 .8-1.6l-1.7-2.2a3.4 3.4 0 0 1-.7-2V8a5 5 0 0 0-5-5z" />
          <path d="M9.5 16a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unread > 0 && <span className="notice-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notice-panel">
          <p className="text-sm font-semibold">Thông báo</p>
          {items.length === 0 && <p className="mt-2 text-sm text-muted">Chưa có thông báo.</p>}
          <ul className="mt-2 space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-line px-2 py-2 text-left"
                  onClick={() => {
                    const first = item.body.split("\n")[0] ?? "";
                    const email = (first.includes("@") ? first.split(":")[0] : "").trim();
                    if (email.includes("@")) window.dispatchEvent(new CustomEvent("tyzo-open-user", { detail: email }));
                    setOpen(false);
                  }}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-sm text-muted">{item.body}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
