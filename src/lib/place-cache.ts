import type { MyPlace } from "@/lib/admin-room";

/**
 * Nhớ quyền đã đọc được trong tab này để nút Quản lý và trang Quản lý hiện ngay khi đổi trang.
 * Chỉ để vẽ giao diện: máy chủ vẫn kiểm tra quyền ở mọi lời gọi. Luôn đọc lại từ máy chủ sau đó.
 * Chỉ chạy ở trình duyệt (không có biến dùng chung giữa các người dùng trên máy chủ).
 */
const KEY = "tyzo-place";

export function readPlace(): MyPlace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<MyPlace> | null;
    if (!value || typeof value !== "object") return null;
    const role = value.role === "ho-tro" || value.role === "quan-ly" || value.role === "chu" ? value.role : null;
    const status = value.status === "locked" || value.status === "banned" ? value.status : "open";
    return { role, status, reason: typeof value.reason === "string" ? value.reason : "", email: typeof value.email === "string" ? value.email : "" };
  } catch {
    return null;
  }
}

export function savePlace(place: MyPlace) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(place));
  } catch {
    /* máy không cho lưu */
  }
}

export function forgetPlace() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* máy không cho lưu */
  }
}
