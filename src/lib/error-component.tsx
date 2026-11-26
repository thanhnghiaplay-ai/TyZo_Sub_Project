import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { claimAutoReload, isStaleBuildError, sessionStore } from "@/lib/stale-build";
import { hasPageActivity } from "./page-activity";

const FALLBACK_MESSAGE = "Không rõ lỗi gì. Hãy tải lại trang.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const stale = isStaleBuildError(error);
  // Trang mở từ bản cũ mà web vừa lên bản mới: tự tải lại một lần để lấy bản mới.
  useEffect(() => {
    if (stale && claimAutoReload(sessionStore(), Date.now(), hasPageActivity())) window.location.reload();
  }, [stale]);
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-bg text-fg"
      }
    >
      <span className="text-error" aria-hidden="true">
        <Icon slot="st.error" className="size-10" />
      </span>
      <h1 className="text-lg font-semibold">{stale ? "Web vừa có bản mới" : "Đã xảy ra lỗi"}</h1>
      {stale && <p className="max-w-md text-sm">Trang đang mở là bản cũ. Tải lại trang để dùng bản mới; việc đã lưu không mất.</p>}
      <p className="max-w-md text-sm break-words text-muted" data-error-message>
        {errorMessage(error)}
      </p>
      <button type="button" className="min-tap mt-2 rounded-full bg-accent px-5 font-semibold text-ink" onClick={() => window.location.reload()}>
        Tải lại trang
      </button>
    </main>
  );
}
