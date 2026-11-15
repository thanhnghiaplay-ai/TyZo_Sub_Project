import { useEffect, useState } from "react";
import { getServiceStatus } from "@/lib/service-status-room";
import { defaultServiceStatus, type ServiceStatus } from "@/lib/service-status";

const REFRESH_MS = 60_000;

/**
 * Trạng thái hai nhóm dịch (Dịch trực tiếp, Dịch bình thường) do Chủ đặt ở Admin.
 * Đọc khi mở trang, mỗi phút khi tab đang hiện, và ngay khi quay lại tab. Lỗi mạng thì giữ trạng thái đang có:
 * máy chủ vẫn là nơi chặn thật ở lúc mở lượt chạy, màn hình chỉ báo trước cho khách đỡ bấm hụt.
 */
export function useServiceStatus(): { status: ServiceStatus; ready: boolean } {
  const [status, setStatus] = useState<ServiceStatus>(defaultServiceStatus);
  const [ready, setReady] = useState(false);

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
