import { useRouter } from "@tanstack/react-router";
import { canGoBack } from "@/lib/back-nav";

/**
 * Mũi tên quay lại ở đầu trang. Có trang trước trong app thì về trang đó; không có
 * (mở thẳng link, tab mới) thì về `fallback` (mặc định trang chủ).
 * `onBack` dùng cho tab cùng một trang: tự lo việc quay, nút không đụng lịch sử trình duyệt.
 */
export function BackButton({ fallback = "/", onBack, label = "Quay lại" }: { fallback?: string; onBack?: () => void; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="back-btn"
      aria-label={label}
      title={label}
      onClick={() => {
        if (onBack) {
          onBack();
          return;
        }
        if (canGoBack(window.history.state)) router.history.back();
        else void router.navigate({ to: fallback });
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="m11 6-6 6 6 6" />
      </svg>
    </button>
  );
}
