import type { TyzoProfile } from "./tyzo-modal.ts";

export type ModalPrice = {
  mode: "fixed" | "usage";
  // USD mỗi giờ phim, hoặc mỗi giờ xử lý GPU, theo chế độ.
  nhanh: number;
  ky: number;
};

export function parseModalPrice(input: unknown): ModalPrice {
  if (!input || typeof input !== "object" || !("mode" in input) || (input.mode !== "fixed" && input.mode !== "usage")) {
    throw new Error("Chọn cách tính giá TyZo Modal.");
  }
  if (!("nhanh" in input) || !("ky" in input)) throw new Error("Thiếu đơn giá Nhanh hoặc Kỹ.");
  const { nhanh, ky } = input;
  if (typeof nhanh !== "number" || typeof ky !== "number" || !Number.isFinite(nhanh) || !Number.isFinite(ky) || nhanh <= 0 || ky <= 0) {
    throw new Error("Cả hai đơn giá phải là số lớn hơn 0.");
  }
  return { mode: input.mode, nhanh, ky };
}

export function modalCostUsd(price: ModalPrice, profile: TyzoProfile, stats: unknown) {
  if (!stats || typeof stats !== "object") throw new Error("Thiếu số liệu từ máy Modal.");
  function amount(key: string) {
    const value = (stats as Record<string, unknown>)[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("Số liệu tính phí Modal không hợp lệ.");
    return value;
  }
  if (price.mode === "fixed") return price[profile] * amount("giay_tieng") / 3600;
  return price[profile] * amount("giay_xu_ly") / 3600 + amount("tien_model_chu_usd");
}
