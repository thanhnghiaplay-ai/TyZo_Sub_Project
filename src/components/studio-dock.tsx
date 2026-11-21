import type { ReactNode } from "react";
import { FloatingDock } from "@/components/floating-dock";
import { MENU_GROUP, MENU_ITEM } from "@/lib/customer-menu";

/**
 * Thanh dưới trang khách trên điện thoại: Trang chủ, Trực tiếp, [nút vàng lướt chọn công cụ], Ví, Menu.
 * Nút giữa (`wheel`, xem tool-wheel.tsx): kéo ngang để lướt qua Phim, Ngữ cảnh (Nhân vật, Thuật ngữ, Ghi chú nội dung), Thuyết minh, Kiểm tra (Cài đặt dịch nằm ở Menu);
 * bấm thì mở tab công cụ đang chọn. «Tải và dịch» nằm ở màn hình đầu và trong tab Video.
 */
export function StudioDock({
  atHome,
  accountOpen,
  onHome,
  onLive,
  onWallet,
  wheel,
}: {
  atHome: boolean;
  accountOpen: boolean;
  onHome: () => void;
  onLive: () => void;
  onWallet: () => void;
  wheel: ReactNode;
}) {
  return (
    <FloatingDock
      left={[
        { id: "home", label: MENU_ITEM.home, slot: "nav.home", current: atHome, onPick: onHome },
        { id: "live", label: MENU_GROUP.live.replace("Dịch ", ""), slot: "ui.mic", onPick: onLive },
      ]}
      right={[{ id: "wallet", label: "Ví", slot: "nav.wallet", current: accountOpen, onPick: onWallet }]}
      center={{ label: "Công cụ", slot: "ui.options", onPress: () => {} }}
      centerNode={wheel}
    />
  );
}
