import type { ErrorComponentProps } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";

const FALLBACK_MESSAGE = "Không rõ lỗi gì. Hãy tải lại trang.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
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
      <h1 className="text-lg font-semibold">Đã xảy ra lỗi</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {errorMessage(error)}
      </p>
    </main>
  );
}
