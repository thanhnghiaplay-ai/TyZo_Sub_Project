import { FloatingDock } from "@/components/floating-dock";
import { MENU_GROUP, MENU_ITEM } from "@/lib/customer-menu";

/**
 * Thanh dưới trang khách trên điện thoại: Trang chủ, Trực tiếp, [Tải và dịch], Ví, Menu.
 * Nút giữa làm đúng việc của nút «Tải và dịch» ở màn hình đầu: chưa chọn video thì mở hộp chọn tệp,
 * đã có video thì bắt đầu dịch; đang chạy, mất mạng hoặc đang bảo trì thì mờ; khi đã có bản dịch (không ở màn hình đầu) cũng mờ.
 */
export function StudioDock({
  atHome,
  accountOpen,
  hasInput,
  canStart,
  onHome,
  onLive,
  onWallet,
  onStart,
  onPickFile,
}: {
  atHome: boolean;
  accountOpen: boolean;
  hasInput: boolean;
  canStart: boolean;
  onHome: () => void;
  onLive: () => void;
  onWallet: () => void;
  onStart: () => void;
  onPickFile: () => void;
}) {
  const disabled = !atHome || (hasInput && !canStart);
  return (
    <FloatingDock
      left={[
        { id: "home", label: MENU_ITEM.home, slot: "nav.home", current: atHome, onPick: onHome },
        { id: "live", label: MENU_GROUP.live.replace("Dịch ", ""), slot: "ui.mic", onPick: onLive },
      ]}
      right={[{ id: "wallet", label: "Ví", slot: "nav.wallet", current: accountOpen, onPick: onWallet }]}
      center={{ label: "Tải và dịch", slot: "act.start", disabled, onPress: hasInput ? onStart : onPickFile }}
    />
  );
}
