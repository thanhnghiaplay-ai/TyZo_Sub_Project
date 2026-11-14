import { isTourId, type TourId } from "./tour-steps.ts";

const ASK_KEY = "tyzo_tour_ask";

/** Trang Hướng dẫn gọi khi khách bấm «Chỉ tôi»: nhớ tuyến cần chạy, rồi chuyển về trang có giao diện thật. */
export function requestTour(id: TourId) {
  try {
    sessionStorage.setItem(ASK_KEY, id);
  } catch {
    /* máy không cho lưu: khách về trang chủ nhưng tuyến không tự chạy, bấm dấu ? để mở */
  }
}

/** Trang đích đọc một lần rồi xóa. Giá trị lạ hoặc hỏng thì bỏ qua. */
export function takeTourRequest(): TourId | null {
  try {
    const value = sessionStorage.getItem(ASK_KEY);
    if (value) sessionStorage.removeItem(ASK_KEY);
    return isTourId(value) ? value : null;
  } catch {
    return null;
  }
}
