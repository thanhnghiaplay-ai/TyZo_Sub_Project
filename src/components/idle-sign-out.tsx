import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";

/** 30 phút không tương tác thì đăng xuất — mức phổ biến trên dịch vụ có số dư/ví. */
export const IDLE_MS = 30 * 60 * 1000;

const EVENTS = ["pointerdown", "keydown", "touchstart", "mousemove", "scroll", "visibilitychange"] as const;

/**
 * Theo dõi hoạt động trên trang. Hết thời gian chờ thì đăng xuất.
 * Không chạy khi chưa đăng nhập hoặc đang ở màn đăng nhập.
 */
export function IdleSignOut() {
  const { user, isPending } = useCurrentUserState();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (isPending || !user || user.isDevFallback) return;

    function clear() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    }

    function arm() {
      clear();
      timer.current = setTimeout(() => {
        if (leaving.current) return;
        leaving.current = true;
        void signOut("/login").finally(() => {
          leaving.current = false;
        });
      }, IDLE_MS);
    }

    function onActivity() {
      if (document.visibilityState === "hidden") return;
      arm();
    }

    arm();
    for (const name of EVENTS) window.addEventListener(name, onActivity, { passive: true });
    return () => {
      clear();
      for (const name of EVENTS) window.removeEventListener(name, onActivity);
    };
  }, [user, isPending]);

  return null;
}
