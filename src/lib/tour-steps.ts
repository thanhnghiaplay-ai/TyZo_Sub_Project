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
  /** Điện thoại / màn thấp: bước này cần tab công cụ (tấm trượt) mở hay đóng. Bỏ trống thì không đụng tới. Tab đang mở che chỗ cần chỉ thì ghi «closed». */
  sheet?: "open" | "closed";
  /** Bước này nằm trong tab công cụ này: app chuyển sang tab đó trước khi chỉ (cùng nghĩa với bấm «Tiếp tục» đến đó). */
  tab?: "key" | "phim" | "cast" | "voice" | "run";
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
    { sel: "[data-tour=drop]", sheet: "closed", title: "1. Chọn video", text: "Kéo thả tệp vào khung phát, hoặc bấm để chọn. Cũng dán được link file trực tiếp ở ô bên dưới." },
    { sel: "#tool-tab-key", rail: true, press: true, title: "2. Chọn cách dùng", text: "Mở mục Cài đặt dịch: dùng key Groq của bạn, hoặc trả theo lượt bằng Token dịch đã mua." },
    { sel: "#tool-tab-phim", rail: true, press: true, title: "3. Chọn video", text: "Mở Video để chọn ngôn ngữ và thể loại." },
    { sel: "[data-tour=run]", sheet: "open", tab: "run", title: "4. Dịch", text: "Bấm Tải và dịch. Thanh tiến trình cho biết đang ở bước nào." },
    { sel: "[data-tour=export]", sheet: "closed", title: "5. Lấy phụ đề", text: "Dịch xong thì bấm Tải phụ đề rồi chọn SRT, VTT hoặc TXT (gói dùng thử chưa xuất được). Bấm một câu trong bản dịch để nhảy tới đúng chỗ." },
  ],
  "phu-de": [
    { sel: "[data-tour=drop]", sheet: "closed", title: "1. Cần có video", text: "Phụ đề hiện sau khi video đã được dịch. Chưa có thì chọn video ở đây và dịch trước." },
    { sel: "[data-tour=cues]", sheet: "closed", title: "2. Bản dịch chạy cùng video", text: "Bấm một câu để video nhảy tới đúng chỗ. Muốn sửa câu dịch thì sửa ngay tại dòng. Khung này hiện khi đã có phụ đề." },
    { sel: "[data-tour=sub-style]", sheet: "closed", title: "3. Chỉnh kiểu chữ", text: "Phông, cỡ chữ, màu, nền và vị trí. Khung mẫu ở đầu bảng cho thấy kết quả ngay khi chỉnh. Nút này hiện khi đã có phụ đề." },
  ],
  "thuyet-minh": [
    { sel: "#tool-tab-voice", rail: true, press: true, title: "1. Mở mục Thuyết minh", text: "Mục này gom thuyết minh: bật hoặc tắt, chọn giọng." },
    { sel: "[data-tour=voice-on]", sheet: "open", title: "2. Bật hoặc tắt", text: "Bạn tắt thì lần sau app giữ tắt." },
    { sel: "[data-tour=voice-engine]", sheet: "open", title: "3. Chọn giọng", text: "Neural cần mạng. Giọng máy có sẵn trên máy bạn. Orpheus dùng key Groq của bạn." },
  ],
  "dich-truc-tiep": [
    { sel: "[data-tour=live-source]", title: "1. Chọn nguồn", text: "Âm thanh tab (tiếng từ một tab trình duyệt) hoặc Micro. Điện thoại thường chỉ dùng được Micro." },
    { sel: "[data-tour=live-lang]", title: "2. Chọn ngôn ngữ", text: "Ngôn ngữ nói (để Tự nhận biết nếu chưa rõ) và ngôn ngữ dịch. Có thể bật tiếng dịch qua loa." },
    { sel: "[data-tour=live-balance]", title: "3. Token dịch", text: "Số Token dịch còn lại và số phút hiện ở đây. Sắp hết thì có cảnh báo. Hết Token dịch thì phiên dừng. Bấm Mua Token dịch để mua thêm." },
    { sel: "[data-tour=live-start]", title: "4. Bắt đầu", text: "Bấm Bắt đầu. Với Âm thanh tab, hộp chọn của trình duyệt hiện ra: chọn đúng tab và bật mục chia sẻ âm thanh của tab." },
    { sel: "[data-tour=export]", title: "5. Tải bản ghi", text: "Có chữ rồi thì tải được SRT, VTT hoặc TXT của buổi vừa dịch." },
  ],
  "thuat-ngu": [
    { sel: "#tool-tab-thuatngu", rail: true, press: true, title: "1. Mở Thuật ngữ", text: "Nằm trong nhóm Dịch bình thường của menu trái." },
    { sel: "[data-tour=glossary-genre]", sheet: "open", title: "2. Chọn thể loại", text: "Chọn thể loại của nội dung để nạp đúng bộ thuật ngữ. Chọn Tự động thì app không nạp bộ có sẵn." },
  ],
  "nap-tien": [
    { sel: "#tool-tab-so-du", rail: true, press: true, title: "1. Mở Token dịch", text: "Nằm trong nhóm Tài khoản của menu trái." },
    { sel: "[data-tour=balance]", title: "2. Token dịch và hạn gói", text: "Token dịch còn lại và hạn thuê phòng của bạn." },
    { sel: "[data-tour=giay]", title: "3. Mua Token dịch", text: "Gói này dùng cho trả theo lượt, dịch trực tiếp và Orpheus. Bấm mua thì hiện mã QR. Hết hạn thì phần còn mất, không hoàn tiền." },
    { sel: "[data-tour=plans]", title: "4. Thuê phòng", text: "Bấm gói thì hiện mã QR. Chuyển khoản đúng số thì mở hạn, không giữ số dư." },
  ],
  "key-groq": [
    { title: "1. Lấy key ở nhà cung cấp", text: "Groq: mở console.groq.com/keys, đăng nhập, chọn Create API Key rồi sao chép key (bắt đầu bằng gsk_). Alibaba, Deepgram, AssemblyAI, Speechmatics và Soniox cũng tạo key theo cách tương tự ở trang của họ, chỉ cần khi bạn dùng nhà đó. Các trang này của bên khác nên app không chỉ vào được. Xong thì bấm Tiếp." },
    { sel: "#tool-tab-key", rail: true, press: true, title: "2. Mở mục Cài đặt dịch", text: "Mục này có ô dán key." },
    { sel: "[data-tour=key-input]", sheet: "open", title: "3. Dán key", text: "Dán key Groq vào ô này hoặc bấm nút dán. Dưới đó là ô key của Alibaba, Deepgram, AssemblyAI, Speechmatics và Soniox. Key chỉ lưu trên máy này. Dán key Groq xong app tự kiểm tra key và model." },
  ],
  "mat-khau": [
    { sel: "#tool-tab-so-du", rail: true, press: true, title: "1. Mở Token dịch", text: "Nằm trong nhóm Tài khoản của menu trái." },
    { sel: "[data-tour=change-password]", title: "2. Đổi mật khẩu", text: "Nhập mật khẩu hiện tại và mật khẩu mới. Quên mật khẩu thì dùng nút Quên mật khẩu ở màn đăng nhập (nếu có) hoặc liên hệ hỗ trợ." },
  ],
  "ho-tro": [
    { sel: "#tool-tab-yeu-cau", rail: true, title: "Yêu cầu xem lại", text: "Việc cần người xem lại (gói, Token dịch, khóa, cấm): bấm mục này và mô tả rõ việc cùng thời điểm xảy ra. Thông tin liên hệ nằm ở mục Hỗ trợ và liên hệ của trang Hướng dẫn." },
  ],
};

export function isTourId(value: unknown): value is TourId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TOURS, value);
}
