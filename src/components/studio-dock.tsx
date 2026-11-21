import type { ReactNode } from "react";
import { FloatingDock } from "@/components/floating-dock";
import { MENU_ITEM } from "@/lib/customer-menu";

/**
 * Thanh dưới trang khách trên điện thoại, 4 việc có chữ (đợt 3, v5.23.0): Trang chủ, [nút vàng lướt chọn công cụ], Ví, Menu.
 * Nút giữa (`wheel`, xem tool-wheel.tsx): kéo ngang để lướt qua Phim, Ngữ cảnh (Nhân vật, Thuật ngữ, Ghi chú nội dung), Thuyết minh, Kiểm tra (Cài đặt dịch nằm ở Menu);
 * bấm thì mở tab công cụ đang chọn. «Tải và dịch» nằm ở màn hình đầu và trong tab Video.
 * Dịch trực tiếp không còn nút riêng ở đây: đã có ô «Dịch trực tiếp» đầu trang chủ và mục trong Menu.
 */
export function StudioDock({
  atHome,
  accountOpen,
  onHome,
  onWallet,
  wheel,
}: {
  atHome: boolean;
  accountOpen: boolean;
  onHome: () => void;
  onWallet: () => void;
  wheel: ReactNode;
}) {
  return (
    <FloatingDock
      showLabels
      left={[{ id: "home", label: MENU_ITEM.home, slot: "nav.home", current: atHome, onPick: onHome }]}
      right={[{ id: "wallet", label: "Ví", slot: "nav.wallet", current: accountOpen, onPick: onWallet }]}
      center={{ label: "Công cụ", slot: "ui.options", onPress: () => {} }}
      centerNode={wheel}
    />
  );
}
