import type { TyzoProfile } from "./tyzo-modal.ts";

/**
 * GIÁ TYZO MODAL = CHI PHÍ GPU THẬT, quy ra Token dịch như mọi nhà khác (Token dịch = giá 1 giây Turbo + % chênh lệch
 * của phòng, nên lời nằm ở giá Token, không cộng ở đây).
 *
 * Chi phí một đoạn = giây máy nhận dạng xử lý × giá GPU mỗi giây × hệ số bù + phí mô hình chữ Alibaba máy báo.
 * Hệ số bù gồm phần Modal tính mà máy không báo theo đoạn: bật máy, máy chạy không trước khi tắt, CPU và RAM,
 * máy mô hình chữ (GPU L40S). Đo 26/11/2026: phim 74 phút, 12 phần, khoảng 2,5 lần giờ GPU nhận dạng; phim ngắn cao hơn.
 * Mặc định 3. Chủ đối chiếu hóa đơn Modal rồi chỉnh.
 */
export type ModalPrice = {
  /** USD mỗi giờ GPU máy nhận dạng (Modal L4: 0,80). */
  gpuUsdPerHour: number;
  /** Hệ số bù chi phí không báo theo đoạn. */
  overhead: number;
};

export const MODAL_PRICE_DEFAULT: ModalPrice = { gpuUsdPerHour: 0.8, overhead: 3 };

/**
 * Tỉ lệ giây xử lý trên giây phim dùng để GIỮ Token trước khi chạy (số đo: Nhanh 0,19–0,26, Kỹ khoảng 0,39).
 * Chỉ để giữ; trừ theo số thật máy báo, phần giữ thừa trả lại khi đóng lượt.
 */
export const HOLD_RATIO: Record<TyzoProfile, number> = { nhanh: 0.5, ky: 0.8 };

export function parseModalPrice(input: unknown): ModalPrice {
  if (!input || typeof input !== "object" || !("gpuUsdPerHour" in input) || !("overhead" in input)) {
    throw new Error("Thiếu giá GPU hoặc hệ số bù TyZo Modal.");
  }
  const { gpuUsdPerHour, overhead } = input;
  if (typeof gpuUsdPerHour !== "number" || !Number.isFinite(gpuUsdPerHour) || gpuUsdPerHour <= 0 || gpuUsdPerHour > 50) {
    throw new Error("Giá GPU phải là số lớn hơn 0 (USD mỗi giờ).");
  }
  if (typeof overhead !== "number" || !Number.isFinite(overhead) || overhead < 1 || overhead > 20) {
    throw new Error("Hệ số bù phải từ 1 đến 20.");
  }
  return { gpuUsdPerHour, overhead };
}

/** USD mỗi giờ PHIM dùng để giữ Token và hiện ước tính (theo HOLD_RATIO). */
export function holdUsdPerFilmHour(price: ModalPrice, profile: TyzoProfile): number {
  return price.gpuUsdPerHour * price.overhead * HOLD_RATIO[profile];
}

/** Chi phí thật của một đoạn theo số liệu máy Modal trả về. */
export function modalCostUsd(price: ModalPrice, _profile: TyzoProfile, stats: unknown) {
  if (!stats || typeof stats !== "object") throw new Error("Thiếu số liệu từ máy Modal.");
  function amount(key: string) {
    const value = (stats as Record<string, unknown>)[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Số liệu tính phí Modal không hợp lệ.");
    return value;
  }
  return (amount("giay_xu_ly") / 3600) * price.gpuUsdPerHour * price.overhead + amount("tien_model_chu_usd");
}
