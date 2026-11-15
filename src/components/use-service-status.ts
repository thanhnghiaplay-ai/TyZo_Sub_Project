import { useEffect, useState } from "react";
import { getServiceStatus } from "@/lib/service-status-room";
import { defaultServiceStatus, type ServiceStatus } from "@/lib/service-status";

const REFRESH_MS = 60_000;

/**
 * Trạng thái hai nhóm dịch (Dịch trực tiếp, Dịch bình thường) do Chủ đặt ở Admin.
 * Đọc khi mở trang, mỗi phút khi tab đang hiện, và ngay khi quay lại tab. Lỗi mạng thì giữ trạng thái đang có:
 * máy chủ vẫn là nơi chặn thật ở lúc mở lượt chạy, màn hình chỉ báo trước cho khách đỡ bấm hụt.
 */
export function useServiceStatus(initial?: ServiceStatus): { status: ServiceStatus; ready: boolean } {
  // `initial` là bản máy chủ đã đọc lúc dựng trang: có sẵn thì vẽ đúng ngay, không nháy trang thường rồi mới ra trang bảo trì.
  const [status, setStatus] = useState<ServiceStatus>(() => initial ?? defaultServiceStatus());
  const [ready, setReady] = useState(Boolean(initial));

  useEffect(() => {
    let alive = true;
    const load = () => {
      void getServiceStatus()
        .then((next) => {
          if (!alive) return;
          setStatus(next);
          setReady(true);
        })
        .catch(() => {
          if (alive) setReady(true);
        });
    };
    const onShow = () => {
      if (document.visibilityState === "visible") load();
    };
    load();
    const timer = window.setInterval(onShow, REFRESH_MS);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);

  return { status, ready };
}
