import { Link, useLocation } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useServiceStatus } from "@/components/use-service-status";
import { siteOpenPath, untilLabel, type ServiceEntry, type ServiceStatus } from "@/lib/service-status";

const WARN_DEFAULT = "Web sắp bảo trì.";

/** Trang khách thấy khi Chủ đặt «Toàn web» vào bảo trì. Lối vào quản trị luôn có để Chủ và nhân viên không bị khóa ngoài. */
export function SiteMaintenancePage({ entry }: { entry: ServiceEntry }) {
  const eta = entry.until && entry.until > Date.now() ? untilLabel(entry.until) : "";
  return (
    <main className="grid h-dvh place-items-center overflow-y-auto p-4" data-site-maintenance>
      <section role="status" className="grid w-full max-w-md gap-3 rounded-2xl border border-warning bg-card p-5 text-center">
        <Wrench className="mx-auto size-8 text-warning" aria-hidden="true" />
        <h1 className="text-lg font-semibold">Web đang bảo trì</h1>
        <p className="text-sm">{entry.note || "Tạm thời chưa dùng được. Bạn vui lòng quay lại sau."}</p>
        {eta && <p className="text-xs text-muted">Dự kiến mở lại lúc {eta}.</p>}
        <p className="text-xs text-muted">Số dư và lịch sử của bạn được giữ nguyên.</p>
        <Link to="/admin" className="min-tap mx-auto inline-flex items-center rounded-full border border-line px-4 text-sm text-muted hover:border-accent">
          Dành cho quản trị viên
        </Link>
      </section>
    </main>
  );
}

/**
 * Bọc phần nội dung ở gốc. Cả web bảo trì thì mọi trang trừ Admin và Đăng nhập đổi thành trang bảo trì.
 * Lấy trạng thái từ máy chủ lúc dựng trang (không nháy), rồi hỏi lại mỗi phút để Chủ mở lại là khách vào được ngay.
 *
 * Lượt dịch chạy ngay trong trình duyệt khách, nên trang khách ĐÃ vào lúc web còn mở thì không bị gỡ giữa chừng
 * (gỡ là cắt lượt đang chạy). Lúc đó chỉ hiện dải báo; trang bảo trì thay vào khi khách tải lại hoặc sang trang khác.
 * Máy chủ vẫn là nơi chặn thật các lượt chạy mới; đây chỉ là mặt giao diện.
 */
export function SiteGate({ initial, children }: { initial: ServiceStatus; children: ReactNode }) {
  const { status } = useServiceStatus(initial);
  const pathname = useLocation({ select: (location) => location.pathname });
  const down = status.site.state === "maintenance";
  // Trang đã được vào lúc web còn mở (hoặc là Admin, Đăng nhập). Giữ nguyên cho tới khi khách rời trang.
  const [admitted, setAdmitted] = useState<string | null>(() => (initial.site.state === "maintenance" && !siteOpenPath(pathname) ? null : pathname));
  useEffect(() => {
    if (!down || siteOpenPath(pathname)) setAdmitted(pathname);
  }, [down, pathname]);

  if (!down || siteOpenPath(pathname)) return <>{children}</>;
  if (admitted !== pathname) return <SiteMaintenancePage entry={status.site} />;
  return (
    <>
      {children}
      <aside role="status" className="fixed inset-x-3 top-3 z-50 mx-auto grid max-w-md gap-0.5 rounded-xl border border-warning bg-card p-3 text-sm shadow-lg" data-site-warning>
        <p className="flex items-center gap-2 font-semibold text-warning">
          <Wrench className="size-4 shrink-0" aria-hidden="true" />
          {status.site.note || WARN_DEFAULT}
        </p>
        <p className="text-xs text-muted">Lượt đang chạy vẫn chạy nốt. Đừng tải lại hay rời trang này khi chưa xong, vì các trang khác đã đóng đến khi mở lại.</p>
      </aside>
    </>
  );
}
