import { useEffect, useMemo, useState } from "react";
import { getRoomPlanPrices } from "@/lib/room-plans-room";
import { plansWith, type PlanPrices, type PricedPlan } from "@/lib/room-plan-prices";

/** Báo mọi nơi đang hiện giá đọc lại (Admin vừa lưu giá). */
export const PLANS_CHANGED = "tyzo-plans-changed";

/**
 * Giá gói thuê phòng cho giao diện. Có ngay giá mặc định (không nhấp nháy trống), rồi thay bằng giá Admin đã lưu
 * khi đọc xong. Đọc lỗi thì giữ giá mặc định; máy chủ vẫn tạo đơn theo giá thật, và đơn hiện đúng số tiền phải chuyển.
 */
export function useRoomPlans(): PricedPlan[] {
  const [prices, setPrices] = useState<PlanPrices | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => {
      void getRoomPlanPrices()
        .then((next) => {
          if (alive) setPrices(next);
        })
        .catch(() => {
          /* giữ giá hiện có */
        });
    };
    load();
    window.addEventListener(PLANS_CHANGED, load);
    return () => {
      alive = false;
      window.removeEventListener(PLANS_CHANGED, load);
    };
  }, []);
  return useMemo(() => plansWith(prices), [prices]);
}
