import type { AdminTab, AdminTabInfo } from "@/lib/admin-tabs";

/**
 * Điều hướng Admin. Màn rộng (từ 1024 px) có thanh bên trái đứng yên.
 * Điện thoại và máy tính bảng dùng hàng nút cuộn ngang như trước, mỗi nút cao tối thiểu 44 px.
 */
export function AdminNav({
  tabs,
  current,
  onPick,
  onSearch,
}: {
  tabs: AdminTabInfo[];
  current: AdminTab;
  onPick: (id: AdminTab) => void;
  onSearch: () => void;
}) {
  return (
    <>
      <nav aria-label="Các mục Admin" className="admin-pills sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-line bg-bg py-2 lg:hidden">
        <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-line px-3 text-sm whitespace-nowrap" onClick={onSearch} aria-label="Tìm nhanh">
          Tìm
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={current === tab.id ? "page" : undefined}
            className={"inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3 text-sm whitespace-nowrap " + (current === tab.id ? "bg-accent font-semibold text-ink" : "border border-line")}
            onClick={() => onPick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <nav aria-label="Các mục Admin" className="admin-side hidden w-52 shrink-0 flex-col gap-1 self-start lg:sticky lg:top-0 lg:flex">
        <button
          type="button"
          className="mb-2 flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line px-3 text-sm text-muted"
          onClick={onSearch}
        >
          <span>Tìm nhanh</span>
          <kbd className="rounded border border-line px-1.5 text-xs">Ctrl K</kbd>
        </button>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={current === tab.id ? "page" : undefined}
            className={"flex min-h-11 items-center rounded-xl px-3 text-left text-sm " + (current === tab.id ? "bg-accent font-semibold text-ink" : "hover:bg-card")}
            onClick={() => onPick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </>
  );
}
