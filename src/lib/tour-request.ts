import { isTourId, TOUR_PAGE, type TourId, type TourPage } from "./tour-steps.ts";

const ASK_KEY = "tyzo_tour_ask";

/** Trang Hướng dẫn gọi khi khách bấm «Chỉ tôi»: nhớ tuyến cần chạy, rồi chuyển sang trang có giao diện thật (`TOUR_PAGE`). */
export function requestTour(id: TourId) {
  try {
    sessionStorage.setItem(ASK_KEY, id);
  } catch {
    /* máy không cho lưu: khách sang trang đó nhưng tuyến không tự chạy, bấm dấu ? để mở */
  }
}

/**
 * Trang đích đọc một lần rồi xóa. Giá trị lạ hoặc hỏng thì bỏ qua.
 * Truyền `page` thì chỉ nhận tuyến thuộc trang đó; tuyến của trang khác được giữ lại cho đúng trang.
 */
export function takeTourRequest(page?: TourPage): TourId | null {
  try {
    const value = sessionStorage.getItem(ASK_KEY);
    if (!value) return null;
    if (!isTourId(value)) {
      sessionStorage.removeItem(ASK_KEY);
      return null;
    }
    if (page && TOUR_PAGE[value] !== page) return null;
    sessionStorage.removeItem(ASK_KEY);
    return value;
  } catch {
    return null;
  }
}
