import { useEffect, useState } from "react";

type Toast = { id: number; text: string; tone: "ok" | "bad" };

let listen: ((toast: Toast) => void) | null = null;

export function pushToast(text: string, tone: "ok" | "bad" = "ok") {
  listen?.({ id: Date.now() + Math.random(), text, tone });
}

/** Câu dài (lỗi) hiện lâu hơn để kịp đọc: 3,4 giây cho câu ngắn, tối đa 9 giây. */
function toastMs(text: string) {
  return Math.min(9000, Math.max(3400, text.length * 55));
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listen = (toast) => {
      setItems((list) => [...list.slice(-2), toast]);
      window.setTimeout(() => {
        setItems((list) => list.filter((item) => item.id !== toast.id));
      }, toastMs(toast.text));
    };
    return () => {
      listen = null;
    };
  }, []);

  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => (
        <p key={item.id} className={item.tone === "bad" ? "toast toast-bad" : "toast"}>
          {item.text}
        </p>
      ))}
    </div>
  );
}
