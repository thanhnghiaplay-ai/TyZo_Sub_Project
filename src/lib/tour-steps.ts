/**
 * Các tuyến hướng dẫn "Chỉ tôi". Mỗi bước trỏ vào chỗ trên giao diện thật bằng bộ chọn.
 * Chỉ dùng nhãn `data-tour` đặt trên chính phần tử, hoặc `#tool-tab-…` của menu trái, vì đổi chữ hay đổi kiểu
 * giao diện không làm lệch. `guide-topics.test.ts` kiểm từng nhãn còn tồn tại trong mã nguồn.
 * Hàm thuần, không import gì, chạy được trong test Node.
 */
export type TourStep = {
  /** Bộ chọn phần tử cần làm sáng. Bỏ trống thì bước chỉ có thẻ chữ (ví dụ việc làm ở web của bên khác). */
  sel?: string;
  title: string;
  text: string;
  /** Chỗ này nằm trong menu trái. Điện thoại đang đóng menu thì tự mở ra, nhóm menu đang gập thì tự xổ ra cho thấy. */
  rail?: boolean;
  /** Bấm «Tiếp» thì app bấm hộ chỗ này, để bước sau có chỗ để chỉ (đổi tab). Chỗ này không phải liên kết sang trang khác. */
  press?: boolean;
};

export type TourId = "quick-start" | "phu-de" | "thuyet-minh" | "dich-truc-tiep" | "thuat-ngu" | "nap-tien" | "key-groq" | "mat-khau" | "ho-tro";

/** Trang có giao diện thật để chạy tuyến. Mỗi tuyến chạy trọn trên một trang. */
export type TourPage = "/" | "/dich-truc-tiep";

export const TOUR_PAGE: Record<TourId, TourPage> = {
  "quick-start": "/",
  "phu-de": "/",
  "thuyet-minh": "/",
  "dich-truc-tiep": "/dich-truc-tiep",
  "thuat-ngu": "/",
  "nap-tien": "/",
  "key-groq": "/",
  "mat-khau": "/",
  "ho-tro": "/",
};

export const TOURS: Record<TourId, TourStep[]> = {
  "quick-start": [
    { sel: "[data-tour=drop]", title: "1. Chọn video", text: "Kéo thả tệp vào khung phát, hoặc bấm để chọn. Cũng dán được link file trực tiếp ở ô bên dưới." },
    { sel: "#tool-tab-key", rail: true, press: true, title: "2. Chọn cách dùng", text: "Mở Key Sub: dùng key Groq của bạn, hoặc trả theo lượt bằng ví của phòng." },
    { sel: "#tool-tab-phim", rail: true, press: true, title: "3. Chọn phim", text: "Mở Phim để chọn ngôn ngữ và thể loại." },
    { sel: "[data-tour=run]", title: "4. Dịch", text: "Bấm Tải và dịch. Thanh tiến trình cho biết đang ở bước nào." },
    { sel: "[data-tour=export]", title: "5. Lấy phụ đề", text: "Dịch xong thì bấm Tải phụ đề rồi chọn SRT, VTT hoặc TXT (gói dùng thử chưa xuất được). Bấm một câu trong bản dịch để nhảy tới đúng chỗ." },
  ],
  "phu-de": [
    { sel: "[data-tour=drop]", title: "1. Cần có video", text: "Phụ đề hiện sau khi video đã được dịch. Chưa có thì chọn video ở đây và dịch trước." },
    { sel: "[data-tour=cues]", title: "2. Bản dịch chạy cùng video", text: "Bấm một câu để video nhảy tới đúng chỗ. Muốn sửa câu dịch thì sửa ngay tại dòng. Khung này hiện khi đã có phụ đề." },
    { sel: "[data-tour=sub-style]", title: "3. Chỉnh kiểu chữ", text: "Phông, cỡ chữ, màu, nền và vị trí. Khung mẫu ở đầu bảng cho thấy kết quả ngay khi chỉnh. Nút này hiện khi đã có phụ đề." },
  ],
  "thuyet-minh": [
    { sel: "#tool-tab-voice", rail: true, press: true, title: "1. Mở mục Nghe", text: "Mục này gom thuyết minh: bật hoặc tắt, chọn giọng." },
    { sel: "[data-tour=voice-on]", title: "2. Bật hoặc tắt", text: "Bạn tắt thì lần sau app giữ tắt." },
    { sel: "[data-tour=voice-engine]", title: "3. Chọn giọng", text: "Neural cần mạng. Giọng máy có sẵn trên máy bạn. Orpheus dùng key Groq của bạn." },
  ],
  "dich-truc-tiep": [
    { sel: "[data-tour=live-source]", title: "1. Chọn nguồn", text: "Âm thanh tab (tiếng từ một tab trình duyệt) hoặc Micro. Điện thoại thường chỉ dùng được Micro." },
    { sel: "[data-tour=live-lang]", title: "2. Chọn ngôn ngữ", text: "Ngôn ngữ nói (để Tự nhận biết nếu chưa rõ) và ngôn ngữ dịch. Có thể bật tiếng dịch qua loa." },
    { sel: "[data-tour=live-balance]", title: "3. Số dư", text: "Số dư và số phút còn lại hiện ở đây. Sắp hết tiền thì có cảnh báo, bấm Nạp thêm để nạp ngay." },
    { sel: "[data-tour=live-start]", title: "4. Bắt đầu", text: "Bấm Bắt đầu. Với Âm thanh tab, hộp chọn của trình duyệt hiện ra: chọn đúng tab và bật mục chia sẻ âm thanh của tab." },
    { sel: "[data-tour=export]", title: "5. Tải bản ghi", text: "Có chữ rồi thì tải được SRT, VTT hoặc TXT của buổi vừa dịch." },
  ],
  "thuat-ngu": [
    { sel: "#tool-tab-thuatngu", rail: true, press: true, title: "1. Mở Thuật ngữ", text: "Nằm trong nhóm Nâng cao của menu trái." },
    { sel: "[data-tour=glossary-genre]", title: "2. Chọn thể loại", text: "Chọn thể loại của phim để nạp đúng bộ thuật ngữ. Chọn Tự động thì app không nạp bộ có sẵn." },
  ],
  "nap-tien": [
    { sel: "#tool-tab-so-du", rail: true, press: true, title: "1. Mở Số dư và nạp tiền", text: "Nằm trong nhóm Tài khoản của menu trái." },
    { sel: "[data-tour=balance]", title: "2. Số dư và hạn gói", text: "Số dư, khoản đang giữ và hạn gói của bạn." },
    { sel: "[data-tour=topup]", title: "3. Nạp tiền", text: "Bấm Nạp tiền, chọn mức hoặc nhập số tiền rồi chuyển khoản đúng số tiền và nội dung hiện ra. Đơn nạp có thời hạn." },
    { sel: "#tool-tab-goi", rail: true, title: "4. Gói thuê phòng", text: "Muốn thuê theo gói thì mở Thuê phòng và gói để xem bảng giá." },
  ],
  "key-groq": [
    { title: "1. Lấy key ở Groq", text: "Mở console.groq.com/keys, đăng nhập, chọn Create API Key rồi sao chép key (bắt đầu bằng gsk_). Trang này của bên khác nên app không chỉ vào được. Xong thì bấm Tiếp." },
    { sel: "#tool-tab-key", rail: true, press: true, title: "2. Mở Key Sub", text: "Mục này có ô dán key." },
    { sel: "[data-tour=key-input]", title: "3. Dán key", text: "Dán key vào ô này hoặc bấm nút dán. Key chỉ lưu trên máy này. Dán xong app tự kiểm tra key và model." },
  ],
  "mat-khau": [
    { sel: "#tool-tab-so-du", rail: true, press: true, title: "1. Mở Số dư và nạp tiền", text: "Nằm trong nhóm Tài khoản của menu trái." },
    { sel: "[data-tour=change-password]", title: "2. Đổi mật khẩu", text: "Nhập mật khẩu hiện tại và mật khẩu mới. Quên mật khẩu thì dùng nút Quên mật khẩu ở màn đăng nhập (nếu có) hoặc liên hệ hỗ trợ." },
  ],
  "ho-tro": [
    { sel: "#tool-tab-yeu-cau", rail: true, title: "Yêu cầu xem lại", text: "Việc cần người xem lại (gói, nạp tiền, khóa, cấm): bấm mục này và mô tả rõ việc cùng thời điểm xảy ra. Thông tin liên hệ nằm ở mục Hỗ trợ và liên hệ của trang Hướng dẫn." },
  ],
};

export function isTourId(value: unknown): value is TourId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TOURS, value);
}
