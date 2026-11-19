import type { IconSlot } from "@/lib/theme/theme";
import type { WheelId } from "@/lib/tool-wheel";

/** Icon từng công cụ: có chỗ đặt (admin đổi được) thì dùng slot, chưa có thì dùng icon cố định. */
export const TOOL_ICON: Record<WheelId, { slot?: IconSlot; name?: string }> = {
  phim: { slot: "nav.source" },
  cast: { slot: "nav.cast" },
  thuatngu: { name: "BookOpen" },
  voice: { slot: "nav.voice" },
  check: { name: "CheckCircle" },
  key: { name: "Coins" },
};
