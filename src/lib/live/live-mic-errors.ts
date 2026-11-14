/** Câu báo lỗi micro bằng tiếng Việt, theo tên lỗi chuẩn của trình duyệt. */
export function micErrorMessage(error: unknown): string {
  const name = typeof error === "object" && error && "name" in error ? String((error as { name: unknown }).name) : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Trình duyệt chưa cho dùng micro. Hãy bấm biểu tượng ổ khóa cạnh địa chỉ trang, cho phép micro rồi thử lại.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Không tìm thấy micro trên thiết bị này.";
    case "NotReadableError":
    case "AbortError":
      return "Micro đang được ứng dụng khác dùng hoặc không mở được. Hãy đóng ứng dụng đó rồi thử lại.";
    case "TypeError":
      return "Trang này chưa được phép dùng micro. Hãy mở bằng địa chỉ https.";
    default:
      return "Chưa bật được micro. Hãy thử lại.";
  }
}
