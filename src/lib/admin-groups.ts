import type { AdminTab } from "./admin-tabs.ts";

/** Nhóm lớn của menu Admin. Mục nhỏ là các tab; tab không đủ quyền tự rơi khỏi nhóm. */
export const ADMIN_GROUPS: { id: string; label: string; tabs: AdminTab[] }[] = [
  { id: "khach-viec", label: "Khách và việc", tabs: ["viec"] },
  { id: "dich-vu", label: "Dịch vụ", tabs: ["cau-hinh"] },
  { id: "tien", label: "Tiền", tabs: ["tien", "ctv"] },
  { id: "noi-dung", label: "Nội dung", tabs: ["thuat-ngu", "thu", "giao-dien"] },
  { id: "he-thong", label: "Hệ thống", tabs: ["so-do", "chat-luong", "thao-tac", "nhat-ky"] },
];
