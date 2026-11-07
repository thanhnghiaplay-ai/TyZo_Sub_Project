import { useEffect, useState } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted whitespace-pre-line">{message}</p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="min-tap flex-1 rounded-full border border-line" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            className={
              "min-tap flex-1 rounded-full font-semibold " +
              (danger ? "border border-danger text-danger" : "bg-accent text-ink")
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmCodeDialog({
  open,
  title,
  message,
  code,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  code: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  if (!open) return null;

  const match = typed.trim().toUpperCase() === code;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted whitespace-pre-line">{message}</p>
        <p className="mt-3 text-sm">
          Mã xác nhận: <span className="font-mono font-semibold tracking-wider text-accent">{code}</span>
        </p>
        <input
          autoFocus
          value={typed}
          onChange={(event) => setTyped(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          placeholder="Nhập mã 6 ký tự"
          className="mt-2 w-full rounded-xl border border-line bg-raised px-3 py-3 font-mono tracking-widest outline-none"
          maxLength={6}
        />
        <div className="mt-4 flex gap-2">
          <button type="button" className="min-tap flex-1 rounded-full border border-line" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            disabled={!match}
            className="min-tap flex-1 rounded-full bg-accent font-semibold text-ink disabled:opacity-40"
            onClick={() => {
              if (match) onConfirm();
            }}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
