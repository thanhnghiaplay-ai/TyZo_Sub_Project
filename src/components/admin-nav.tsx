import type { AdminTab, AdminTabInfo } from "@/lib/admin/admin-tabs";
import { ADMIN_GROUPS } from "@/lib/admin/admin-groups";
import { SideRail, type RailItem } from "@/components/side-rail";

/** Dựng cây menu từ danh sách tab được phép. Tổng quan đứng riêng, cuối là «Về phòng». */
function adminRailItems(tabs: AdminTabInfo[], current: AdminTab, onPick: (id: AdminTab) => void): RailItem[] {
  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  const leaf = (tab: AdminTabInfo): RailItem => ({ id: tab.id, label: tab.label, current: current === tab.id, onPick: () => onPick(tab.id) });
  const items: RailItem[] = [];
  const overview = byId.get("tong-quan");
  if (overview) items.push(leaf(overview));
  for (const group of ADMIN_GROUPS) {
    const children = group.tabs.map((id) => byId.get(id)).filter((tab): tab is AdminTabInfo => Boolean(tab)).map(leaf);
    if (children.length) items.push({ id: group.id, label: group.label, children });
  }
  items.push({ id: "ve-phong", label: "Về phòng", href: "/" });
  return items;
}

/**
 * Điều hướng Admin. Từ 1024 px menu ghim bên trái; dưới đó là ngăn trượt mở bằng nút ba gạch.
 * Phải nằm trong <AppShell pinned>.
 */
export function AdminNav({
  tabs,
  current,
  onPick,
  onSearch,
  who,
}: {
  tabs: AdminTabInfo[];
  current: AdminTab;
  onPick: (id: AdminTab) => void;
  onSearch: () => void;
  who?: { name?: string | null; email?: string | null };
}) {
  return (
    <>
      {/* Màn hẹp: nút Menu và Tìm nhanh đã ở thanh đáy (AdminBottomBar), tên thẻ ở hàng nút quay lại (admin-desk.tsx). */}
      <SideRail
        label="Các mục Admin"
        items={adminRailItems(tabs, current, onPick)}
        who={who}
        top={(close) => (
          <button
            type="button"
            className="flex min-h-11 items-center justify-between gap-2 rounded-[var(--radius-ctl)] border border-line px-3 text-sm text-muted"
            onClick={() => {
              close();
              onSearch();
            }}
          >
            <span>Tìm nhanh</span>
            <kbd className="rounded border border-line px-1.5 text-xs">Ctrl K</kbd>
          </button>
        )}
      />
    </>
  );
}
