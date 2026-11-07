/** Số đưa lên Vercel. Đổi số cuối khi sửa chữ, số giữa khi thêm chức năng nhỏ, số đầu khi thêm chức năng lớn. */
export const APP_VERSION = "2.12.0";

/** Tóm tắt cho người dùng. Dòng mới luôn đứng đầu. Câu đủ ý, có mốc thời gian. Không ghi tên file. */
export const CHANGELOG: { version: string; time: string; text: string }[] = [
  {
    version: "2.12.0",
    time: "18:50 ngày 07/11/2026",
    text: "Tab Việc, Sơ đồ và Doanh thu không còn đè nội dung phía dưới. Mã QR nạp tiền được vẽ ngay trên trang, không phụ thuộc ảnh bên ngoài. Khách báo đã chuyển khoản thì trang quản trị thấy đơn và có thể xác nhận cộng tiền khi webhook lỗi. Mỗi cổng nạp bật tắt hoặc xóa được, kèm chấm xanh đỏ. Gói 24 giờ, 7 ngày và 30 ngày ghi rõ khoản đã tiết kiệm.",
  },
  {
    version: "2.11.0",
    time: "18:14 ngày 07/11/2026",
    text: "Thêm chấm xanh đỏ cho trạng thái cửa trả theo lượt trên phòng và trang quản trị. Canh chỉnh chữ thẻ quyền trên mọi kiểu. Nạp tiền nằm cạnh đăng xuất trong khung tài khoản, cho nhập số từ 10.000 đến 1.000.000 đồng. Tự đăng xuất sau 30 phút không dùng. Doanh thu tách rõ nạp cổng, mua gói, trả theo lượt, hoàn, nhả giữ và chi phí. Form đăng nhập gợi ý email đầy đủ từ phần trước @. Tìm người dùng trên trang quản trị nhận tên thiếu dấu.",
  },
  {
    version: "2.10.1",
    time: "07:41 ngày 07/11/2026",
    text: "Phiếu gần đây ghi rõ khi chưa có phiếu. Chọn trả theo lượt thì câu hạn gói nói đúng cửa đó. Thẻ quyền trên tài khoản có hiệu ứng như bản đã chọn. Sơ đồ và doanh thu nằm ở tab riêng. Sổ gần đây chỉ hiện vài dòng, bấm xem thêm nếu cần.",
  },
  {
    version: "2.10.0",
    time: "22:43 ngày 06/11/2026",
    text: "Key ở trang quản trị được giữ sau khi tải lại trang. Khách chọn trả theo lượt thì phòng tự dùng key đó, khách không cần nhập. Phiếu gần đây hiện giờ, trạng thái và số tiền. Sơ đồ và doanh thu đọc lại được.",
  },
  {
    version: "2.9.0",
    time: "22:22 ngày 06/11/2026",
    text: "Trang quản trị có ô nhập, dán, hiện và ẩn key để đồng bộ model. Key không gửi lên máy chủ. Khách chọn trả theo lượt thì không cần bấm đồng bộ key. Hai thể loại đổi tên hiển thị thành Phim gắn nhãn 18+ và Phim thoại kín. Thuật ngữ và cách dịch giữ nguyên. Việc lưu ở trang quản trị hiện thông báo nổi.",
  },
  {
    version: "2.8.0",
    time: "22:04 ngày 06/11/2026",
    text: "Trang quản trị hiện giá gốc từng model và cho biết key trên máy này gọi được model nào. Trang khách không thấy danh sách đó. Model chưa được đưa ra chỉ hiện chưa cập nhật. Bảng phiên bản chỉ còn tám lần gần nhất. Khi có bản mới, trang báo tải lại. Đang làm việc thì chọn để sau. Rời trang khoảng năm phút thì lần quay lại tự tải bản mới.",
  },
  {
    version: "2.7.0",
    time: "21:47 ngày 06/11/2026",
    text: "Cửa trả theo lượt mặc định mở. Bảo trì chỉ hiện khi quản trị nhập nội dung và lưu. Giá biểu có nút cập nhật riêng: lấy giá gốc, tăng theo phần trăm, hoặc đặt giá riêng từng model. Khung chọn model dùng đúng đơn giá đã lưu khi khách chọn trả theo lượt. Khi dùng key của khách thì không hiện giá. Câu giải thích giá không còn dẫn khách so với bảng giá bên ngoài.",
  },
  {
    version: "2.6.1",
    time: "21:11 ngày 06/11/2026",
    text: "Thêm đóng và mở cửa trả theo lượt trên trang khách. Khi đóng, tab Key và Tài khoản chỉ hiện câu tạm ngưng, và khách vẫn dùng key của mình. Khi mở, khung chọn Key của tôi hoặc Trả theo lượt hiện lại để xem bố cục. Lần chạy chưa trừ ví.",
  },
  {
    version: "2.6.0",
    time: "21:04 ngày 06/11/2026",
    text: "Hoàn thiện bàn quản lý cửa trả theo lượt. Chủ lưu đơn giá Turbo, đơn giá Large, hạn mức ngày và câu khi cửa đóng. Trang quản trị hiện số đang giữ, số đã trừ và phiếu lỗi trong ngày. Quản lý được nhả khoản giữ và hoàn vào ví khi đã có phiếu. Hỗ trợ có câu trả lời sẵn. Khách chưa chạy được cửa này.",
  },
  {
    version: "2.5.2",
    time: "20:54 ngày 06/11/2026",
    text: "Thay hàng Phụ đề, Tài khoản và Quản lý bằng nút danh sách. Tên mục đang mở hiện cạnh nút. Thêm khung Trả theo lượt tại tab Key, Tài khoản và trang quản trị, ghi rõ sẽ cập nhật sau vì chưa dùng được.",
  },
  {
    version: "2.5.1",
    time: "13:12 ngày 06/11/2026",
    text: "Điều chỉnh nội dung các lần cập nhật. Mỗi lần được viết bằng câu chuyên môn và nêu đủ phần đã nâng cấp, đã chỉnh sửa, đã thay đổi và đã bổ sung. Mỗi lần hiển thị mốc thời gian phát hành.",
  },
  {
    version: "2.5.0",
    time: "10:02 ngày 06/11/2026",
    text: "Bổ sung bảng tóm tắt cập nhật khi chọn số phiên bản, tại điều khoản, phòng dịch và trang quản trị. Phiên bản chưa xem được đánh dấu bằng số sáng nhẹ.",
  },
  {
    version: "2.4.2",
    time: "01:09 ngày 06/11/2026",
    text: "Chỉnh nhãn Quản lý thẳng hàng và cùng hàng với Phụ đề và Tài khoản.",
  },
  {
    version: "2.4.1",
    time: "00:54 ngày 06/11/2026",
    text: "Chốt bảng giá: 9.000 đồng mỗi 24 giờ, 39.000 đồng mỗi 7 ngày, 99.000 đồng mỗi 30 ngày. Điều khoản sử dụng được cập nhật thành bản 2026-11-06.1.",
  },
  {
    version: "2.4.0",
    time: "00:52 ngày 06/11/2026",
    text: "Thêm nút Quản lý cạnh Tài khoản đối với tài khoản được cấp quyền. Thu gọn lịch sử trên trang quản trị. Đăng nhập có thể ghi nhớ email. Nghe và thuyết minh được bật mặc định.",
  },
  {
    version: "2.3.0",
    time: "00:26 ngày 06/11/2026",
    text: "Giữ khung video đúng tỷ lệ 16:9 khi xoay thiết bị. Đăng ký yêu cầu nhập lại mật khẩu và hiển thị mức độ mạnh yếu. Thu gọn thẻ quyền.",
  },
  {
    version: "2.2.0",
    time: "00:03 ngày 06/11/2026",
    text: "Bổ sung mười kiểu thẻ quyền. Chủ tài khoản chọn kiểu thẻ trên trang quản trị. Ô tài khoản hiển thị cấp của người dùng.",
  },
  {
    version: "2.1.0",
    time: "23:46 ngày 05/11/2026",
    text: "Ô số lượng được phân màu. Yêu cầu được đóng sau khi trả lời hoặc từ chối. Từ chối bắt buộc kèm lý do.",
  },
  {
    version: "2.0.0",
    time: "23:18 ngày 05/11/2026",
    text: "Thiết lập bốn cấp quyền: Người dùng, Hỗ trợ, Quản lý và Chủ. Yêu cầu quá 2 giờ được chuyển lên cấp trên. Bổ sung sơ đồ cấp và trang doanh thu.",
  },
];

export function versionKind(version = APP_VERSION) {
  const [major, minor, patch] = version.split(".").map((part) => Number(part) || 0);
  if (patch > 0) return "sửa chữ";
  if (minor > 0) return "chức năng nhỏ";
  if (major > 1) return "chức năng lớn";
  return "bản đầu";
}