/**
 * Model nào có trên key của KHÁCH (danh sách `/models` của nhà). Hàm thuần.
 * KEY_LIST_TRUSTED: chỉ nhà nào danh sách `/models` đã kiểm là đủ và khớp mã model của app mới được dùng để KHÓA model.
 * Groq: đã dùng từ trước. Alibaba: CHƯA kiểm với key thật (Filetrans có thể không nằm trong danh sách), nên chưa khóa;
 * Chủ thử bằng key thật rồi đổi sang true.
 * Nhà mới phải khai ở đây (kiểu Record, thiếu là tsc đỏ).
 */
import type { ProviderId } from "./provider.ts";

export const KEY_LIST_TRUSTED: Record<ProviderId, boolean> = { "tyzo-modal": true, groq: true, alibaba: false };

/** Mã model của app có trong danh sách của nhà. */
function listedAs(id: string, list: string[]): boolean {
  return list.includes(id);
}

/** true/false = key có/không có model; null = không biết (chưa đọc được danh sách, danh sách rỗng, hoặc nhà chưa đáng tin). */
export function keyListHas(house: ProviderId, id: string, list: string[] | null | undefined): boolean | null {
  if (!KEY_LIST_TRUSTED[house] || !list || list.length === 0) return null;
  return listedAs(id, list);
}

/**
 * Dùng cho bảng Admin (key PHÒNG): true = danh sách của nhà có model này; false = chắc chắn không có;
 * null = không biết. Nhà chưa đáng tin (KEY_LIST_TRUSTED) thì tên trong danh sách có thể khác mã của app
 * nên không khớp vẫn chỉ là null, không báo «key phòng không thấy» oan.
 */
export function roomListHas(house: ProviderId, id: string, list: string[] | null | undefined): boolean | null {
  if (!list || list.length === 0) return null;
  if (listedAs(id, list)) return true;
  return KEY_LIST_TRUSTED[house] ? false : null;
}
