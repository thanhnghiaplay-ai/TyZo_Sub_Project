/** Số đưa lên Vercel. Đổi số cuối khi sửa chữ, số giữa khi thêm chức năng nhỏ, số đầu khi thêm chức năng lớn. */
export const APP_VERSION = "2.5.0";

/** Tóm tắt cho người dùng. Dòng mới luôn đứng đầu. Một câu, không ghi tên file. */
export const CHANGELOG: { version: string; text: string }[] = [
  { version: "2.5.0", text: "Bấm số phiên bản để xem các lần cập nhật. Số sáng nhẹ khi có bản bạn chưa xem." },
  { version: "2.4.2", text: "Chữ Quản lý thẳng hàng với Phụ đề và Tài khoản." },
  { version: "2.4.1", text: "Giá gói: 9.000 đ một ngày, 39.000 đ một tuần, 99.000 đ một tháng." },
  { version: "2.4.0", text: "Có nút Quản lý nếu được cấp quyền. Nghe mặc định bật. Đăng nhập có thể nhớ email." },
  { version: "2.3.0", text: "Khung video giữ đúng tỷ lệ khi xoay máy. Đăng ký phải nhập lại mật khẩu." },
  { version: "2.2.0", text: "Chủ chọn kiểu thẻ quyền. Ô tài khoản hiện cấp của bạn." },
  { version: "2.1.0", text: "Trả lời hoặc từ chối thì yêu cầu được đóng. Từ chối phải có lý do." },
  { version: "2.0.0", text: "Thêm cấp Hỗ trợ, Quản lý và Chủ. Có sơ đồ cấp và trang doanh thu." },
];

export function versionKind(version = APP_VERSION) {
  const [major, minor, patch] = version.split(".").map((part) => Number(part) || 0);
  if (patch > 0) return "sửa chữ";
  if (minor > 0) return "chức năng nhỏ";
  if (major > 1) return "chức năng lớn";
  return "bản đầu";
}
