/**
 * Nút giữa thanh dưới (điện thoại): kéo ngang để lướt qua các công cụ, thả ở đâu chọn công cụ đó.
 * Chỉ có toán học thuần ở đây (vị trí, độ mờ, điểm dừng) để kiểm bằng test; phần cử chỉ nằm ở tool-wheel.tsx.
 * Vị trí `pos` là số thực: số nguyên = đang đúng một công cụ; danh sách xoay vòng.
 */

/** Thứ tự lướt theo luồng làm việc: dịch, chỉnh, hoàn thiện. Cài đặt dịch (chọn một lần) nằm ở Menu, không lướt. */
export const WHEEL_ORDER = ["phim", "cast", "thuatngu", "voice", "check"] as const;
export type WheelId = (typeof WHEEL_ORDER)[number];

/** Công cụ kế tiếp theo luồng làm việc (cho dòng «Tiếp theo: …»); công cụ cuối và Cài đặt dịch thì không có. */
export function nextTool(id: string): WheelId | null {
  const i = (WHEEL_ORDER as readonly string[]).indexOf(id);
  return i >= 0 && i < WHEEL_ORDER.length - 1 ? WHEEL_ORDER[i + 1] : null;
}

/** Vòng tiến độ quanh nút vàng: bán kính 46 trong khung 100×100; `percent` 0..100, ngoài khoảng thì cắt về khoảng. */
export const RING_RADIUS = 46;
export function ringDash(percent: number): { circumference: number; offset: number } {
  const circumference = 2 * Math.PI * RING_RADIUS;
  const p = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  return { circumference, offset: circumference * (1 - p / 100) };
}

/** Khoảng cách giữa hai icon (px) và số px kéo cho một công cụ. */
export const WHEEL_SPACING = 46;
export const WHEEL_DRAG_PX = 48;

export function wrapIndex(i: number, n: number): number {
  return ((Math.round(i) % n) + n) % n;
}

/** Khoảng lệch có dấu, ngắn nhất theo vòng, của công cụ `index` so với vị trí `pos`. Nằm trong [-n/2, n/2). */
export function wheelOffset(index: number, pos: number, n: number): number {
  return ((((index - pos + n / 2) % n) + n) % n) - n / 2;
}

/** Dáng một icon theo độ lệch: đúng giữa thì to và rõ, càng xa càng nhỏ và mờ, quá một ô thì tắt dần. */
export function wheelSlot(
  offset: number,
  spacing = WHEEL_SPACING,
): { x: number; scale: number; opacity: number } {
  const a = Math.abs(offset);
  const t = Math.min(1, a);
  return {
    x: offset * spacing,
    scale: 1 - 0.5 * t,
    opacity: Math.max(0, 1 - 0.88 * t - (a > 1 ? (a - 1) * 0.12 : 0)),
  };
}

/** Công cụ đang chọn ở vị trí `pos`. */
export function wheelCurrent(pos: number, n: number): number {
  return wrapIndex(pos, n);
}

/** Điểm dừng khi thả tay: trôi thêm theo quán tính (tối đa 3 công cụ) rồi khớp vào công cụ gần nhất. */
export function settleTarget(pos: number, velocity: number): number {
  const inertia = Math.max(-3, Math.min(3, velocity * 220));
  return Math.round(pos + inertia);
}

/** Thời gian trượt về điểm dừng (ms): ngắn khi gần, dài hơn khi xa, tối đa 720. */
export function settleDuration(from: number, to: number): number {
  return 220 + Math.min(500, Math.abs(to - from) * 80);
}

/** Số px kéo ngang đổi ra vị trí mới (kéo sang trái thì tiến tới công cụ kế). */
export function dragToPos(startPos: number, dx: number, dragPx = WHEEL_DRAG_PX): number {
  return startPos - dx / dragPx;
}
