/** Số đưa lên Vercel. Đổi số cuối khi sửa chữ, số giữa khi thêm chức năng nhỏ, số đầu khi thêm chức năng lớn. */
export const APP_VERSION = "2.5.1";

/** Tóm tắt cho người dùng. Dòng mới luôn đứng đầu. Câu đủ ý, có mốc thời gian. Không ghi tên file. */
export const CHANGELOG: { version: string; time: string; text: string }[] = [
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