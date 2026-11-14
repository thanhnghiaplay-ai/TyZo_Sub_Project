import type { AdminTab, AdminTabInfo } from "@/lib/admin-tabs";
import { RailToggle, SideRail, type RailItem } from "@/components/side-rail";

/** Nhóm lớn của menu Admin. Mục nhỏ là các tab; tab không đủ quyền tự rơi khỏi nhóm. */
export const ADMIN_GROUPS: { id: string; label: string; tabs: AdminTab[] }[] = [
  { id: "van-hanh", label: "Vận hành", tabs: ["viec", "cau-hinh"] },
  { id: "tien", label: "Tiền", tabs: ["tien", "chat-luong"] },
  { id: "con-nguoi", label: "Con người", tabs: ["so-do", "ctv"] },
  { id: "noi-dung", label: "Nội dung", tabs: ["thuat-ngu", "thu", "giao-dien"] },
  { id: "nhat-ky", label: "Nhật ký", tabs: ["thao-tac", "nhat-ky"] },
];

/** Dựng cây menu từ danh sách tab được phép. Tổng quan đứng riêng, cuối là «Về phòng». */
export function adminRailItems(tabs: AdminTabInfo[], current: AdminTab, onPick: (id: AdminTab) => void): RailItem[] {
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
  const label = tabs.find((tab) => tab.id === current)?.label ?? "Admin";
  return (
    <>
      <div className="admin-bar sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-bg py-2 lg:hidden">
        <RailToggle />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</p>
        <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-line px-3 text-sm" onClick={onSearch} aria-label="Tìm nhanh">
          Tìm
        </button>
      </div>
      <SideRail
        label="Các mục Admin"
        items={adminRailItems(tabs, current, onPick)}
        who={who}
        top={(close) => (
          <button
            type="button"
            className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line px-3 text-sm text-muted"
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
