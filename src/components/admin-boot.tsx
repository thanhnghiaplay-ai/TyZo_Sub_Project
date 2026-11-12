import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";

/** Màn chờ trang quản lý. Đang thử lại thì không hiện «không có quyền». */
export function AdminBoot({ trying, notice }: { trying: boolean; notice: string | null }) {
  return (
    <div className="admin-boot">
      <BrandMark small title="TyZo Sub" />
      <p className="text-sm text-muted">
        {trying ? "Máy chủ đang khởi động sau bản mới. Đang thử lại…" : "Đang mở trang quản lý"}
      </p>
      {notice && !trying && (
        <Link to="/login" className="min-tap w-fit rounded-full bg-accent px-4 text-sm font-semibold text-ink">
          Đăng nhập
        </Link>
      )}
    </div>
  );
}
