import { useEffect } from "react";
import { claimAutoReload, sessionStore } from "@/lib/stale-build";
import { hasPageActivity } from "@/lib/page-activity";
import { pushToast } from "@/components/toast";

/**
 * Vite báo `vite:preloadError` khi không tải được tệp của bản cũ (web vừa lên bản mới).
 * Tự tải lại trang một lần thay vì để khách thấy màn lỗi. Không vẽ gì.
 */
export function StaleBuildGuard() {
  useEffect(() => {
    let warned = false;
    const onPreload = (event: Event) => {
      if (hasPageActivity()) {
        // Let the failed import reject so the caller can show the real error and preserve its state.
        if (!warned) pushToast("Có bản mới. Hãy đợi tác vụ xong và lưu hoặc xuất phụ đề trước khi tải lại trang.");
        warned = true;
        return;
      }
      if (!claimAutoReload(sessionStore())) return;
      event.preventDefault();
      window.location.reload();
    };
    window.addEventListener("vite:preloadError", onPreload);
    return () => window.removeEventListener("vite:preloadError", onPreload);
  }, []);
  return null;
}
