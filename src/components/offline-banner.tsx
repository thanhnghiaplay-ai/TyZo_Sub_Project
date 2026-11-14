import { useEffect } from "react";
import { useOnline } from "@/lib/use-online";

export const OFFLINE_TEXT = "Mất kết nối internet. Kiểm tra mạng rồi thử lại.";

/** Banner đỏ cố định phía trên khi mất mạng. Các nút hành động tự khóa bằng useOnline. */
export function OfflineBanner() {
  const online = useOnline();
  useEffect(() => {
    const root = document.documentElement;
    if (online) delete root.dataset.offline;
    else root.dataset.offline = "1";
    return () => {
      delete root.dataset.offline;
    };
  }, [online]);
  if (online) return null;
  return (
    <div role="alert" className="offline-banner">
      {OFFLINE_TEXT}
    </div>
  );
}
