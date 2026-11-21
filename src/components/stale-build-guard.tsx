import { useEffect } from "react";
import { claimAutoReload, sessionStore } from "@/lib/stale-build";

/**
 * Vite báo `vite:preloadError` khi không tải được tệp của bản cũ (web vừa lên bản mới).
 * Tự tải lại trang một lần thay vì để khách thấy màn lỗi. Không vẽ gì.
 */
export function StaleBuildGuard() {
  useEffect(() => {
    const onPreload = (event: Event) => {
      if (!claimAutoReload(sessionStore())) return;
      event.preventDefault();
      window.location.reload();
    };
    window.addEventListener("vite:preloadError", onPreload);
    return () => window.removeEventListener("vite:preloadError", onPreload);
  }, []);
  return null;
}
