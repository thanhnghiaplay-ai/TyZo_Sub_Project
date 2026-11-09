export type AdminNote = {
  version: string;
  time: string;
  area: "tien" | "quyen" | "ha-tang" | "du-lieu" | "khac";
  text: string;
};

/** Nhật ký nội bộ. Không import từ giao diện khách. */
export const ADMIN_LOG: AdminNote[] = [
  {
    version: "3.1.0",
    time: "12:40 ngày 09/11/2026",
    area: "tien",
    text: "POST /api/pay/rieng khớp đúng mã và đúng số tiền. Khóa nằm ở room_settings pay_own_secret. Lời lỗ trừ commission_events. Thuật ngữ nhập xuất JSON. Gieo thuật ngữ khi mở kết nối cơ sở dữ liệu.",
  },
  {
    version: "3.0.0",
    time: "12:28 ngày 09/11/2026",
    area: "tien",
    text: "run_tickets.base_cost lưu giá vốn Groq. Lời lỗ = gói + lượt − giá vốn − chi phí ghi tay. Cộng tác viên: tỷ lệ Chủ sửa, cả đời khi windowDays = 0, trần 50% lãi lượt, chờ 14 ngày, rút tối thiểu 200.000. Cổng nạp riêng chưa làm.",
  },
  {
    version: "2.23.0",
    time: "12:19 ngày 09/11/2026",
    area: "du-lieu",
    text: "Danh sách thuật ngữ phân trang 50. Ẩn hoặc mở mọi bộ. Khôi phục từ thiếu không ghi đè từ đã sửa. Lỗi tải không còn bị nuốt thành bộ trống.",
  },
  {
    version: "2.22.0",
    time: "11:46 ngày 09/11/2026",
    area: "du-lieu",
    text: "Thuật ngữ chuyển vào database. Chỉ Chủ thêm, xóa, ẩn. Khách gửi bản sao thì vào hàng chờ, chưa áp cho người khác. Điều khoản 2026-11-09.1.",
  },
  {
    version: "2.21.0",
    time: "09:33 ngày 09/11/2026",
    area: "khac",
    text: "Nhật ký khách tách khỏi nhật ký nội bộ. Thanh chỉnh chỉ đổi khi kéo núm. Độ trễ đọc có thể âm để đọc trước.",
  },
  {
    version: "2.20.0",
    time: "06:40 ngày 09/11/2026",
    area: "quyen",
    text: "Giá biểu, doanh thu và mở gói chỉ Chủ thấy. Yêu cầu quá hạn tự chuyển cấp: Hỗ trợ 30 phút, Quản lý 90 phút, rồi tới Chủ. Máy chủ đặt ở Singapore.",
  },
  {
    version: "2.19.2",
    time: "20:28 ngày 08/11/2026",
    area: "quyen",
    text: "Tài khoản Chủ vào lại được trang quản trị khi phòng chưa cấu hình gửi thư.",
  },
  {
    version: "2.19.1",
    time: "19:13 ngày 08/11/2026",
    area: "tien",
    text: "Ngày ghi chi phí và cột doanh thu theo giờ Việt Nam. Cửa trả theo lượt chỉ bật sau khi cửa đã mở. Yêu cầu công khai thêm trần theo địa chỉ mạng khi máy chủ thấy địa chỉ.",
  },
  {
    version: "2.19.0",
    time: "18:52 ngày 08/11/2026",
    area: "ha-tang",
    text: "Bản dựng thử không chạy migration lên database thật. Bản chính thiếu địa chỉ database thì dừng. Điều khoản 2026-11-08.3.",
  },
  {
    version: "2.18.0",
    time: "18:15 ngày 08/11/2026",
    area: "quyen",
    text: "Key phòng không hiện lại trên trang quản trị, chỉ còn 4 ký tự cuối. Điều khoản 2026-11-08.2.",
  },
  {
    version: "2.17.0",
    time: "08:16 ngày 08/11/2026",
    area: "quyen",
    text: "Quyền Chủ nằm trong cơ sở dữ liệu và chỉ tính khi email đã xác minh. Chỉ Chủ được xác nhận tay đơn nạp. Điều khoản 2026-11-08.1.",
  },
  {
    version: "2.16.1",
    time: "01:35 ngày 08/11/2026",
    area: "quyen",
    text: "Đã gỡ chức năng cộng tiền thử mà ai đăng nhập cũng gọi được.",
  },
  {
    version: "2.9.0",
    time: "22:22 ngày 06/11/2026",
    area: "quyen",
    text: "Trang quản trị có ô nhập key để đồng bộ model. Key không gửi lên máy chủ.",
  },
  {
    version: "2.0.0",
    time: "23:18 ngày 05/11/2026",
    area: "quyen",
    text: "Bốn cấp: Người dùng, Hỗ trợ, Quản lý và Chủ. Có sơ đồ cấp và trang doanh thu.",
  },
];
