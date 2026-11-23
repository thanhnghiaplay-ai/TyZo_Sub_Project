import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CAPTION_PX, type CaptionPrefs } from "@/lib/live/live-caption";
import { CAPTION_HIDE_MS, captionLayout, captionMaxChars } from "@/lib/live/caption-layout";
import type { LiveLine } from "@/lib/live/live-transcript";

/**
 * Khung phụ đề Dịch trực tiếp, dùng cho phụ đề nổi (cửa sổ riêng) và màn chữ lớn.
 * Như phụ đề phim (cùng cách với ứng dụng Android 0.8): tách theo câu, câu đã xong đứng yên, câu đang nói mờ hơn
 * và là phần duy nhất thay đổi; câu cũ tự ẩn sau vài giây khi không có câu mới.
 * Kiểu viết thẳng (inline) vì cửa sổ nổi là một trang riêng, không có bảng kiểu của app.
 */
export function LiveCaptionView({ lines, prefs, place, waiting }: { lines: readonly LiveLine[]; prefs: CaptionPrefs; place: "float" | "big"; waiting: string }) {
  const count = Math.min(4, Math.max(1, prefs.lines));
  const pieces = lines.slice(-6).map((line) => ({ text: line.translation, stash: line.translationStash, final: line.final }));
  let shown = captionLayout(pieces, count, captionMaxChars(prefs.size), prefs.finalOnly);
  // Có câu đang nói thì nhường một dòng cho nó: tổng số dòng đúng như khách chọn.
  if (shown.live && shown.done.length >= count) shown = { ...shown, done: shown.done.slice(-(count - 1)) };
  const latest = lines[lines.length - 1];
  const source = latest ? `${latest.source}${latest.sourceStash}`.trim() : "";

  // Câu xong đứng một mình quá CAPTION_HIDE_MS thì ẩn. Đếm từ lúc chữ hiện ra đổi lần cuối.
  const key = `${shown.done[shown.done.length - 1] ?? ""}|${shown.live}`;
  const changedAt = useRef({ key, at: Date.now() });
  if (changedAt.current.key !== key) changedAt.current = { key, at: Date.now() };
  const [, tick] = useState(0);
  const idle = !shown.live && shown.done.length > 0;
  useEffect(() => {
    if (!idle) return;
    const left = CAPTION_HIDE_MS - (Date.now() - changedAt.current.at);
    const id = window.setTimeout(() => tick((n) => n + 1), Math.max(0, left) + 50);
    return () => window.clearTimeout(id);
  }, [idle, key]);
  const hidden = idle && Date.now() - changedAt.current.at >= CAPTION_HIDE_MS;

  const size = CAPTION_PX[prefs.size][place];
  const box: CSSProperties = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: place === "big" ? 14 : 6,
    width: "100%",
    height: "100%",
    padding: place === "big" ? "24px 20px 40px" : "10px 14px",
    background: prefs.solid ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0.45)",
    color: "#fff",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif',
    textAlign: "center",
    overflow: "hidden",
  };
  const main: CSSProperties = {
    margin: 0,
    fontSize: size,
    lineHeight: 1.3,
    fontWeight: 600,
    textShadow: "0 1px 3px rgba(0,0,0,0.9)",
    overflowWrap: "anywhere",
  };
  const sub: CSSProperties = { margin: "2px 0 0", fontSize: Math.round(size * 0.62), lineHeight: 1.3, color: "rgba(255,255,255,0.72)", overflowWrap: "anywhere" };

  if (!lines.length) {
    return (
      <div style={box} aria-live="polite">
        <p style={{ ...main, fontSize: Math.round(size * 0.7), fontWeight: 400, color: "rgba(255,255,255,0.7)" }}>{waiting}</p>
      </div>
    );
  }
  if (hidden) return <div style={box} aria-live="polite" />;
  return (
    <div style={box} aria-live="polite">
      {shown.done.map((text, index) => (
        <p key={`${index}-${text}`} style={main}>
          {text}
        </p>
      ))}
      {shown.live && <p style={{ ...main, opacity: 0.75 }}>{shown.live}</p>}
      {prefs.source && source && <p style={sub}>{source.length > 120 ? `…${source.slice(-120)}` : source}</p>}
    </div>
  );
}
