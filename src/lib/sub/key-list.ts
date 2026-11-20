/**
 * Model nào có trên key của KHÁCH (danh sách `/models` của nhà). Hàm thuần.
 * KEY_LIST_TRUSTED: chỉ nhà nào danh sách `/models` đã kiểm là đủ và khớp mã model của app mới được dùng để KHÓA model.
 * Groq: đã dùng từ trước. Alibaba, Deepgram: CHƯA kiểm với key thật (Filetrans có thể không nằm trong danh sách,
 * Deepgram trả tên dạng nova-3-general), nên chưa khóa; Chủ thử bằng key thật rồi đổi sang true.
 * Nhà mới phải khai ở đây (kiểu Record, thiếu là tsc đỏ).
 */
import type { ProviderId } from "./provider.ts";

export const KEY_LIST_TRUSTED: Record<ProviderId, boolean> = { groq: true, alibaba: false, deepgram: false, assemblyai: false, speechmatics: false, soniox: false };

/** Mã model của app → tên trong danh sách của nhà. Deepgram bỏ chữ "deepgram-" và khớp theo đầu tên (nova-3 ~ nova-3-general). */
function listedAs(house: ProviderId, id: string, list: string[]): boolean {
  if (house === "deepgram") {
    const name = id.replace(/^deepgram-/, "");
    return list.some((item) => item === name || item.startsWith(`${name}-`));
  }
  return list.includes(id);
}

/** true/false = key có/không có model; null = không biết (chưa đọc được danh sách, danh sách rỗng, hoặc nhà chưa đáng tin). */
export function keyListHas(house: ProviderId, id: string, list: string[] | null | undefined): boolean | null {
  if (!KEY_LIST_TRUSTED[house] || !list || list.length === 0) return null;
  return listedAs(house, id, list);
}

/**
 * Dùng cho bảng Admin (key PHÒNG): true = danh sách của nhà có model này; false = chắc chắn không có;
 * null = không biết. Nhà chưa đáng tin (KEY_LIST_TRUSTED) thì tên trong danh sách có thể khác mã của app
 * (Deepgram: nova-3-general), nên không khớp vẫn chỉ là null, không báo «key phòng không thấy» oan.
 */
export function roomListHas(house: ProviderId, id: string, list: string[] | null | undefined): boolean | null {
  if (!list || list.length === 0) return null;
  if (listedAs(house, id, list)) return true;
  return KEY_LIST_TRUSTED[house] ? false : null;
}
