/**
 * Các tuyến hướng dẫn "Chỉ tôi". Mỗi bước trỏ vào chỗ trên giao diện thật bằng bộ chọn.
 * Ưu tiên nhãn `data-tour` đặt trên chính phần tử, vì đổi chữ hay đổi kiểu giao diện không làm lệch.
 * Hàm thuần, không import gì, chạy được trong test Node.
 */
export type TourStep = { sel: string; title: string; text: string };

export type TourId = "quick-start";

export const TOURS: Record<TourId, TourStep[]> = {
  "quick-start": [
    { sel: "[data-tour=drop]", title: "1. Chọn video", text: "Kéo thả tệp vào khung phát, hoặc bấm để chọn. Cũng dán được link file trực tiếp ở ô bên dưới." },
    { sel: "#tool-tab-key", title: "2. Chọn cách dùng", text: "Mở Key Sub: dùng key Groq của bạn, hoặc trả theo lượt bằng ví của phòng." },
    { sel: "#tool-tab-phim", title: "3. Dịch", text: "Mở Phim, chọn ngôn ngữ và thể loại, rồi bấm Tải và dịch. Thanh tiến trình cho biết đang ở bước nào." },
    { sel: "[data-tour=export]", title: "4. Lấy phụ đề", text: "Dịch xong thì bấm Tải phụ đề rồi chọn SRT, VTT hoặc TXT (gói dùng thử chưa xuất được). Bấm một câu trong bản dịch để nhảy tới đúng chỗ." },
  ],
};

export function isTourId(value: unknown): value is TourId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TOURS, value);
}
