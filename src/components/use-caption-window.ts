import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cửa sổ phụ đề nổi. Chrome, Edge (máy tính) có Document Picture-in-Picture: cửa sổ luôn nằm trên mọi cửa sổ khác,
 * kể cả khi tab video đang toàn màn hình. Trình duyệt khác: mở cửa sổ nhỏ riêng (khách tự đặt cạnh video).
 * Phải gọi `open` thẳng từ cú bấm của khách. Trả `target` là thân trang của cửa sổ để vẽ phụ đề vào (createPortal).
 */
type PipApi = { requestWindow(options: { width: number; height: number }): Promise<Window> };

export type CaptionWindowKind = "pip" | "popup";

export function captionWindowKind(win: Window | undefined): CaptionWindowKind | null {
  if (!win) return null;
  if ((win as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture) return "pip";
  return typeof win.open === "function" ? "popup" : null;
}

function prepare(doc: Document) {
  doc.title = "Phụ đề · TyZo Sub";
  doc.documentElement.style.height = "100%";
  doc.body.style.margin = "0";
  doc.body.style.height = "100%";
  doc.body.style.background = "#000";
  const root = doc.createElement("div");
  root.style.height = "100%";
  doc.body.replaceChildren(root);
  return root;
}

export function useCaptionWindow() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [kind, setKind] = useState<CaptionWindowKind | null>(null);
  const winRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);

  const closed = useCallback(() => {
    winRef.current = null;
    if (pollRef.current != null) window.clearInterval(pollRef.current);
    pollRef.current = null;
    setTarget(null);
  }, []);

  const close = useCallback(() => {
    const win = winRef.current;
    closed();
    try {
      win?.close();
    } catch {
      /* đã đóng */
    }
  }, [closed]);

  useEffect(() => () => close(), [close]);

  useEffect(() => {
    setKind(captionWindowKind(typeof window === "undefined" ? undefined : window));
  }, []);

  /** Mở cửa sổ. Trả câu lỗi tiếng Việt khi không mở được, rỗng khi được. */
  const open = useCallback(async (): Promise<string> => {
    if (winRef.current && !winRef.current.closed) {
      winRef.current.focus();
      return "";
    }
    const pip = (window as unknown as { documentPictureInPicture?: PipApi }).documentPictureInPicture;
    try {
      let win: Window | null;
      if (pip) {
        win = await pip.requestWindow({ width: 640, height: 180 });
      } else {
        win = window.open("", "tyzo-phu-de", "popup,width=720,height=220");
        if (!win) return "Trình duyệt chặn cửa sổ mới. Hãy cho phép cửa sổ bật lên cho trang này rồi bấm lại.";
      }
      winRef.current = win;
      const root = prepare(win.document);
      win.addEventListener("pagehide", closed, { once: true });
      // Cửa sổ thường không báo pagehide chắc chắn khi khách đóng: hỏi lại mỗi giây.
      if (!pip) pollRef.current = window.setInterval(() => winRef.current?.closed && closed(), 1000);
      setTarget(root);
      return "";
    } catch {
      return "Chưa mở được phụ đề nổi. Hãy bấm lại.";
    }
  }, [closed]);

  return { kind, open, close, target, isOpen: target !== null };
}
