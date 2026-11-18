import type { AdminTab, AdminTabInfo } from "@/lib/admin-tabs";
import { BOTTOM_LABEL, BOTTOM_SLOT, bottomTabIds } from "@/lib/admin-bottom-tabs";
import { FloatingDock, type DockItem } from "@/components/floating-dock";

/**
 * Thanh dưới Admin trên điện thoại: hai tab đầu, nút giữa «Tìm» (mở tìm nhanh), tab thứ ba, Menu.
 * Chủ: Tổng quan, Việc, [Tìm], Dịch vụ. Quản lý và Hỗ trợ: Tổng quan, Việc, [Tìm], Khách.
 * Chấm đỏ trên «Việc» là số yêu cầu đang chờ. Phải nằm trong <AppShell>.
 */
export function AdminBottomBar({ tabs, current, waiting, onPick, onSearch }: { tabs: AdminTabInfo[]; current: AdminTab; waiting?: number; onPick: (id: AdminTab) => void; onSearch: () => void }) {
  const ids = bottomTabIds(tabs.map((tab) => tab.id));
  const item = (id: AdminTab): DockItem => ({ id, label: BOTTOM_LABEL[id] ?? id, slot: BOTTOM_SLOT[id] ?? "ui.options", current: current === id, badge: id === "viec" ? waiting : undefined, onPick: () => onPick(id) });
  return <FloatingDock left={ids.slice(0, 2).map(item)} right={ids.slice(2).map(item)} center={{ label: "Tìm nhanh", slot: "act.search", onPress: onSearch }} />;
}
