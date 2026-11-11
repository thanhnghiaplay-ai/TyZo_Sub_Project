import { useEffect, useState } from "react";

type Toast = { id: number; text: string; tone: "ok" | "bad" };

let listen: ((toast: Toast) => void) | null = null;

export function pushToast(text: string, tone: "ok" | "bad" = "ok") {
  listen?.({ id: Date.now() + Math.random(), text, tone });
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    listen = (toast) => {
      setItems((list) => [...list.slice(-2), toast]);
      window.setTimeout(() => {
        setItems((list) => list.filter((item) => item.id !== toast.id));
      }, 3400);
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
