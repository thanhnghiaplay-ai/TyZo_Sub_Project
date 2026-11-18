import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { RailControl } from "@/components/side-rail";
import { dockBadgeText, isTypingTarget } from "@/lib/dock";
import type { IconSlot } from "@/lib/theme/theme";

export type DockItem = { id: string; label: string; slot: IconSlot; current?: boolean; badge?: number; onPick: () => void };
export type DockCenter = { label: string; slot: IconSlot; onPress: () => void; disabled?: boolean };

const BASE = "relative flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full transition-colors motion-reduce:transition-none ";
const ACTIVE = "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-accent";

/** Ẩn khi đang gõ chữ (bàn phím che màn hình) để thanh không đè lên ô nhập. */
function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const check = () => {
      const el = document.activeElement as HTMLElement | null;
      setTyping(Boolean(el) && isTypingTarget(el!.tagName, (el as HTMLInputElement).type, el!.isContentEditable));
    };
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", () => setTimeout(check, 0));
    return () => {
      document.removeEventListener("focusin", check);
    };
  }, []);
  return typing;
}

function DockButton({ item }: { item: DockItem }) {
  const badge = dockBadgeText(item.badge);
  return (
    <button type="button" aria-label={badge ? `${item.label}, ${badge} cần xem` : item.label} aria-current={item.current ? "page" : undefined} className={BASE + (item.current ? ACTIVE : "text-muted")} onClick={item.onPick}>
      <Icon slot={item.slot} size="1.4rem" />
      {item.current && <span className="text-[10px] font-medium leading-none">{item.label}</span>}
      {badge && <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-[#e5484d] px-1 text-[10px] font-semibold leading-4 text-white">{badge}</span>}
    </button>
  );
}

/**
 * Thanh nút dưới cùng nổi, bo tròn, cho màn dưới 1024 px (từ đó đã có menu ghim bên trái).
 * Hai nút trái, nút giữa tròn lớn nhô lên (việc chính), nút phải, rồi «Menu» mở ngăn trượt.
 * Phải nằm trong <AppShell>. Màu nút giữa và mục đang chọn theo màu nhấn của giao diện.
 */
export function FloatingDock({ left, right, center, label = "Mục chính" }: { left: DockItem[]; right: DockItem[]; center: DockCenter; label?: string }) {
  const typing = useTyping();
  if (typing) return null;
  return (
    <RailControl>
      {({ open, setOpen, railId }) => (
        <nav aria-label={label} className="floating-dock fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex items-center justify-around rounded-full border border-line bg-raised/90 px-1.5 py-1.5 shadow-lg backdrop-blur lg:hidden">
          {left.map((item) => <DockButton key={item.id} item={item} />)}
          <button
            type="button"
            aria-label={center.label}
            disabled={center.disabled}
            onClick={center.onPress}
            className="-mt-9 grid size-16 shrink-0 place-items-center rounded-full border-4 border-bg bg-accent text-ink shadow-[0_8px_24px_color-mix(in_srgb,var(--color-accent)_50%,transparent)] transition-transform active:scale-95 disabled:opacity-40 disabled:shadow-none motion-reduce:transition-none"
          >
            <Icon slot={center.slot} size="1.9rem" />
          </button>
          {right.map((item) => <DockButton key={item.id} item={item} />)}
          <button type="button" aria-label="Menu" aria-expanded={open} aria-controls={railId} className={BASE + (open ? ACTIVE : "text-muted")} onClick={() => setOpen(!open)}>
            <Icon slot="nav.menu" size="1.4rem" />
            {open && <span className="text-[10px] font-medium leading-none">Menu</span>}
          </button>
        </nav>
      )}
    </RailControl>
  );
}
