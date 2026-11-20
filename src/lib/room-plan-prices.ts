// Giá thuê phòng Admin chỉnh được (docs/lich-su/HANDOFF_2026-11.md, 20/11/2026).
// File thuần: chỉ import tương đối, không DB, test được bằng Node.
//
// Chỉ GIÁ và GIÁ GẠCH đổi được. Mã gói, tên và số giờ giữ cố định trong `ROOM_PLANS` (room-plans.ts),
// vì đơn cũ, tài khoản đang có gói và điều khoản đều tham chiếu theo mã và số giờ.
// `ROOM_PLANS` vẫn là giá MẶC ĐỊNH: dùng khi Chủ chưa lưu giá, hoặc khi chưa đọc được giá đã lưu.

import { ROOM_PLANS, type RoomPlanId } from "./room-plans.ts";

export type PlanPrice = { price: number; strike: number | null };
export type PlanPrices = Record<RoomPlanId, PlanPrice>;

/** Giá một gói thấp nhất / cao nhất cho phép (đồng). Chặn gõ nhầm thừa hoặc thiếu số 0. */
export const PLAN_PRICE_MIN = 1_000;
export const PLAN_PRICE_MAX = 5_000_000;

export type PricedPlan = {
  id: RoomPlanId;
  name: string;
  hours: number;
  price: number;
  strike: number | null;
  /** Số tiền tiết kiệm so với giá gạch; null khi không có giá gạch. Luôn tính từ giá, không lưu riêng. */
  save: number | null;
};

export function defaultPlanPrices(): PlanPrices {
  return Object.fromEntries(ROOM_PLANS.map((plan) => [plan.id, { price: plan.price, strike: plan.strike }])) as PlanPrices;
}

function whole(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

/** Lỗi bằng chữ cho Chủ, hoặc chuỗi rỗng nếu hợp lệ. */
export function planPricesProblem(prices: PlanPrices): string {
  let prev = 0;
  for (const plan of ROOM_PLANS) {
    const item = prices[plan.id];
    if (!item) return `Thiếu giá gói ${plan.name}.`;
    const price = whole(item.price);
    if (price === null) return `Giá gói ${plan.name} phải là số nguyên đồng.`;
    if (price < PLAN_PRICE_MIN || price > PLAN_PRICE_MAX) {
      return `Giá gói ${plan.name} phải từ ${PLAN_PRICE_MIN.toLocaleString("vi-VN")} đến ${PLAN_PRICE_MAX.toLocaleString("vi-VN")} đồng.`;
    }
    if (item.strike !== null) {
      const strike = whole(item.strike);
      if (strike === null) return `Giá gạch gói ${plan.name} phải là số nguyên đồng hoặc để trống.`;
      if (strike <= price) return `Giá gạch gói ${plan.name} phải cao hơn giá bán.`;
      if (strike > PLAN_PRICE_MAX * 4) return `Giá gạch gói ${plan.name} quá lớn.`;
    }
    // Gói dài hơn phải đắt hơn gói ngắn hơn: chặn đặt nhầm để khách mua gói ngày nhiều lần thay vì gói tháng.
    if (price <= prev) return `Gói ${plan.name} phải đắt hơn gói ngắn hơn nó.`;
    prev = price;
  }
  return "";
}

/** Đọc giá đã lưu. null = chưa lưu, hỏng hoặc không hợp lệ (nơi gọi dùng giá mặc định). */
export function parsePlanPrices(raw: string | null | undefined): PlanPrices | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Record<string, { price?: unknown; strike?: unknown } | undefined>;
    if (!data || typeof data !== "object") return null;
    const out = {} as PlanPrices;
    for (const plan of ROOM_PLANS) {
      const item = data[plan.id];
      const price = whole(item?.price);
      if (price === null) return null;
      const strike = item?.strike === null || item?.strike === undefined ? null : whole(item.strike);
      if (item?.strike !== null && item?.strike !== undefined && strike === null) return null;
      out[plan.id] = { price, strike };
    }
    return planPricesProblem(out) ? null : out;
  } catch {
    return null;
  }
}

/** Danh sách gói với giá đã áp. `prices` null thì là giá mặc định. */
export function plansWith(prices: PlanPrices | null | undefined): PricedPlan[] {
  const use = prices ?? defaultPlanPrices();
  return ROOM_PLANS.map((plan) => {
    const item = use[plan.id] ?? { price: plan.price, strike: plan.strike };
    return {
      id: plan.id,
      name: plan.name,
      hours: plan.hours,
      price: item.price,
      strike: item.strike,
      save: item.strike !== null && item.strike > item.price ? item.strike - item.price : null,
    };
  });
}

export function pricedPlan(prices: PlanPrices | null | undefined, id: string): PricedPlan | null {
  return plansWith(prices).find((plan) => plan.id === id) ?? null;
}

/** Mô tả thay đổi cho nhật ký Admin. */
export function describePlanPrices(before: PlanPrices | null, after: PlanPrices): string {
  const from = before ?? defaultPlanPrices();
  const dong = (value: number) => `${value.toLocaleString("vi-VN")}đ`;
  const parts: string[] = [];
  for (const plan of ROOM_PLANS) {
    const a = from[plan.id];
    const b = after[plan.id];
    if (a.price !== b.price) parts.push(`${plan.name}: ${dong(a.price)} → ${dong(b.price)}`);
    if (a.strike !== b.strike) parts.push(`${plan.name} giá gạch: ${a.strike === null ? "không" : dong(a.strike)} → ${b.strike === null ? "không" : dong(b.strike)}`);
  }
  return parts.length ? parts.join("; ") : "Lưu lại, không đổi giá.";
}
