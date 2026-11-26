import type { AdminTab } from "./admin-tabs.ts";
import type { IconSlot } from "../theme/theme.ts";

/** Nhãn ngắn cho thanh dưới trên điện thoại. */
export const BOTTOM_LABEL: Partial<Record<AdminTab, string>> = {
  "tong-quan": "Tổng quan",
  viec: "Việc",
  "cau-hinh": "Dịch vụ",
  "tai-khoan": "Khách",
};

/** Biểu tượng (theo chỗ đặt, Admin đổi được ở mục Giao diện) cho từng tab trên thanh dưới. */
export const BOTTOM_SLOT: Partial<Record<AdminTab, IconSlot>> = {
  "tong-quan": "ui.chart",
  viec: "ui.paste",
  "cau-hinh": "ui.settings",
  "tai-khoan": "nav.account",
};

const FIRST: AdminTab[] = ["tong-quan", "viec", "cau-hinh"];

/**
 * Ba tab hiện trên thanh dưới (nút thứ tư luôn là «Menu»). Ưu tiên Tổng quan, Việc, Dịch vụ;
 * vai trò không có Dịch vụ (Quản lý, Hỗ trợ) thì thay bằng Tài khoản khách. Chỉ lấy tab được phép.
 */
export function bottomTabIds(allowed: AdminTab[]): AdminTab[] {
  const has = new Set(allowed);
  const picked = FIRST.filter((id) => has.has(id));
  if (picked.length < 3 && has.has("tai-khoan")) picked.push("tai-khoan");
  return picked;
}
