import type { AdminTab, AdminTabInfo } from "@/lib/admin-tabs";
import { BOTTOM_LABEL, bottomTabIds } from "@/lib/admin-bottom-tabs";
import { RailControl } from "@/components/side-rail";

/**
 * Thanh nút dưới cùng cho điện thoại (ẩn từ 1024 px, khi đó đã có menu ghim bên trái).
 * Ba tab hay dùng + nút «Menu» mở ngăn trượt đầy đủ. Phải nằm trong <AppShell>.
 */
export function AdminBottomBar({ tabs, current, onPick }: { tabs: AdminTabInfo[]; current: AdminTab; onPick: (id: AdminTab) => void }) {
  const ids = bottomTabIds(tabs.map((tab) => tab.id));
  const base = "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ";
  return (
    <RailControl>
      {({ open, setOpen, railId }) => (
        <nav className="admin-bottom-bar fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden" style={{ gridTemplateColumns: `repeat(${ids.length + 1}, minmax(0, 1fr))` }} aria-label="Mục chính">
          {ids.map((id) => (
            <button key={id} type="button" className={base + (current === id ? "font-semibold text-accent" : "text-muted")} aria-current={current === id ? "page" : undefined} onClick={() => onPick(id)}>
              {BOTTOM_LABEL[id]}
            </button>
          ))}
          <button type="button" className={base + (!ids.includes(current) || open ? "font-semibold text-accent" : "text-muted")} aria-expanded={open} aria-controls={railId} onClick={() => setOpen(!open)}>
            Menu
          </button>
        </nav>
      )}
    </RailControl>
  );
}
