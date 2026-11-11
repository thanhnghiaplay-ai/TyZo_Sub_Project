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
      const ms = toast.tone === "bad" ? 6500 : 3400;
      window.setTimeout(() => {
        setItems((list) => list.filter((item) => item.id !== toast.id));
      }, ms);
    };
    return () => {
      listen = null;
    };
  }, []);

  const dismiss = (id: number) => {
    setItems((list) => list.filter((item) => item.id !== id));
  };

  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => (
        <p
          key={item.id}
          className={item.tone === "bad" ? "toast toast-bad" : "toast"}
          onClick={() => dismiss(item.id)}
          role="status"
        >
          {item.text}
        </p>
      ))}
    </div>
  );
}
