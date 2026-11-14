import { Link } from "@tanstack/react-router";

/**
 * Liên kết tới trang /dieu-khoan. Mở ở tab mới khi `newTab`, để người đang điền
 * biểu mẫu (Đăng ký, Đăng nhập) đọc xong vẫn còn nguyên những gì đã gõ.
 */
export function TermsLink({ className, newTab = false }: { className?: string; newTab?: boolean }) {
  return (
    <Link
      to="/dieu-khoan"
      className={className ?? "text-sm text-accent underline"}
      {...(newTab ? { target: "_blank", rel: "noopener" } : {})}
    >
      Điều khoản và Chính sách
    </Link>
  );
}
