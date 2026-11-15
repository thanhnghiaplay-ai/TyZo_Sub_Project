import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { setConfirmListener, type PendingConfirm } from "@/lib/confirm";

/** Vẽ hộp xác nhận cho askConfirm (lib/confirm.ts). Gắn một lần ở __root.tsx, cạnh ToastHost. */

export function ConfirmHost() {
  const [queue, setQueue] = useState<PendingConfirm[]>([]);
  const queueRef = useRef<PendingConfirm[]>([]);
  queueRef.current = queue;
  const current = queue[0] ?? null;
  const cardRef = useRef<HTMLDivElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setConfirmListener((item) => setQueue((list) => [...list, item]));
    return () => {
      setConfirmListener(null);
      // Gỡ host mà còn hộp đang chờ thì coi như Hủy, để không treo lời hứa.
      for (const item of queueRef.current) item.resolve(false);
    };
  }, []);

  const settle = useCallback(
    (ok: boolean) => {
      if (!current) return;
      current.resolve(ok);
      setQueue((list) => list.filter((item) => item.id !== current.id));
    },
    [current],
  );

  // Mở hộp thì đưa tiêu điểm vào trong (Hủy nếu việc nguy hiểm), đóng thì trả tiêu điểm về chỗ cũ.
  const openId = current?.id;
  const openDanger = current?.danger;
  useEffect(() => {
    if (openId === undefined) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (openDanger ? cancelRef.current : okRef.current)?.focus();
    return () => before?.focus?.();
  }, [openId, openDanger]);

  if (!current) return null;
  const titleId = `confirm-title-${current.id}`;
  const textId = `confirm-text-${current.id}`;

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      settle(false);
      return;
    }
    if (event.key !== "Tab") return;
    // Giữ Tab quay vòng trong hộp, không lọt ra trang phía sau.
    const items = Array.from(cardRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-3"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && settle(false)}
      data-confirm-dialog
    >
      <div
        ref={cardRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        className="grid w-full max-w-sm gap-3 rounded-2xl border border-line bg-card p-4 shadow-xl"
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="text-base font-semibold">
          {current.title || "Xác nhận"}
        </h2>
        <p id={textId} className="whitespace-pre-line text-sm text-muted">
          {current.text}
        </p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={() => settle(false)}>
            {current.cancelLabel || "Hủy"}
          </Button>
          <Button ref={okRef} variant={current.danger ? "danger" : "primary"} onClick={() => settle(true)}>
            {current.confirmLabel || "Đồng ý"}
          </Button>
        </div>
      </div>
    </div>
  );
}
