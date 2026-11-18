/** Các trang con của tab Cấu hình (Admin, Chủ). Chỉ là danh sách để dựng thanh chọn ngang. */
export type ConfigPageId = "trang-thai" | "nha-cung-cap" | "goi-gia" | "thue-phong" | "truc-tiep" | "cong-nap";

export const CONFIG_PAGES: { id: ConfigPageId; label: string }[] = [
  { id: "trang-thai", label: "Trạng thái" },
  { id: "nha-cung-cap", label: "Nhà cung cấp" },
  { id: "goi-gia", label: "Gói và giá" },
  { id: "thue-phong", label: "Thuê phòng" },
  { id: "truc-tiep", label: "Dịch trực tiếp" },
  { id: "cong-nap", label: "Cổng nạp" },
];

export const DEFAULT_CONFIG_PAGE: ConfigPageId = "trang-thai";

export function isConfigPage(value: string): value is ConfigPageId {
  return CONFIG_PAGES.some((page) => page.id === value);
}
