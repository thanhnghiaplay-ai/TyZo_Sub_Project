import { useEffect, useState } from "react";
import { detectCaps, NO_CAPS, type Caps, type CapsEnv } from "@/lib/device-caps";

/** Đo thiết bị sau khi trang dựng xong (tránh lệch giữa máy chủ và trình duyệt). */
export function useCaps(): Caps {
  const [caps, setCaps] = useState<Caps>(NO_CAPS);
  useEffect(() => {
    const read = () => setCaps(detectCaps({ matchMedia: window.matchMedia.bind(window), navigator, screen: screen as CapsEnv["screen"], isSecureContext: window.isSecureContext }));
    read();
    const queries = [window.matchMedia("(hover: hover) and (pointer: fine)"), window.matchMedia("(pointer: coarse)")];
    queries.forEach((q) => q.addEventListener("change", read));
    return () => queries.forEach((q) => q.removeEventListener("change", read));
  }, []);
  return caps;
}

/** Giữ màn hình sáng khi `on` (đang chạy dịch). Không hỗ trợ thì bỏ qua, không báo lỗi. */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (!nav.wakeLock) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    let gone = false;
    const take = () => {
      if (gone || document.visibilityState !== "visible") return;
      nav.wakeLock!.request("screen").then((lock) => {
        if (gone) void lock.release().catch(() => undefined);
        else sentinel = lock;
      }).catch(() => undefined);
    };
    take();
    // Trình duyệt tự nhả khóa khi chuyển tab; quay lại thì xin lại.
    document.addEventListener("visibilitychange", take);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", take);
      void sentinel?.release().catch(() => undefined);
    };
  }, [on]);
}
