import { useEffect, useState } from "react";
import { listMyNotices, markNoticeRead, type NoticeRow } from "@/lib/admin-room";
import { formatMoney } from "@/lib/money-format";

function formatBody(body: string) {
  return body.replace(/(\d{4,})/g, (match) => formatMoney(match));
}

export function NoticeBell({ desk = false }: { desk?: boolean }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NoticeRow[]>([]);

  async function load() {
    try {
      const next = await listMyNotices({ data: { desk } });
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
  }, [desk]);

  function openNotice(item: NoticeRow) {
    if (!item.read) {
      setItems((rows) => rows.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      setUnread((count) => Math.max(0, count - 1));
      void markNoticeRead({ data: item.id }).catch(() => undefined);
    }
    if (desk) {
      const codeMatch = item.body.match(/mã\s+([A-Z0-9]{4,})/i);
      const orderCode = codeMatch ? codeMatch[1] : "";
      const emailMatch = item.body.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
      const email = emailMatch ? emailMatch[1] : "";
      if (item.appealId || item.title === "Yêu cầu mới" || item.title === "Việc chuyển lên" || item.title === "Báo vượt cấp") {
        window.dispatchEvent(new CustomEvent("tyzo-open-appeal", { detail: { id: item.appealId, email } }));
      } else if (orderCode || item.title === "Khách báo đã chuyển") {
        window.dispatchEvent(new CustomEvent("tyzo-open-pay", { detail: { code: orderCode, email } }));
      } else if (email) {
        window.dispatchEvent(new CustomEvent("tyzo-open-user", { detail: email }));
      }
    }
    setOpen(false);
  }

  return (
    <div className="notice-bell">
      <button
        type="button"
        className="notice-bell-btn"
        aria-label={unread ? `${unread} thông báo mới` : "Thông báo"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a5 5 0 0 0-5 5v2.2c0 .7-.2 1.4-.7 2L4.6 14.4A1 1 0 0 0 5.4 16h13.2a1 1 0 0 0 .8-1.6l-1.7-2.2a3.4 3.4 0 0 1-.7-2V8a5 5 0 0 0-5-5z" />
          <path d="M9.5 16a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unread > 0 && <span className="notice-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notice-panel">
          <p className="text-sm font-semibold">{desk ? "Việc cần xử lý" : "Thông báo"}</p>
          {items.length === 0 && (
            <p className="mt-2 text-sm text-muted">{desk ? "Chưa có yêu cầu cần xử lý." : "Chưa có thông báo."}</p>
          )}
          <ul className="mt-2 space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-xl border border-line px-2 py-2 text-left hover:bg-raised"
                  onClick={() => openNotice(item)}
                >
                  <span className={"notice-dot" + (item.read ? "" : " on")} aria-hidden="true" />
                  <span className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted">{formatBody(item.body)}</p>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
