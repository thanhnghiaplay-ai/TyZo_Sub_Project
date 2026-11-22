import type { CSSProperties } from "react";
import { CAPTION_PX, captionRows, type CaptionPrefs } from "@/lib/live/live-caption";
import type { LiveLine } from "@/lib/live/live-transcript";

/**
 * Khung phụ đề Dịch trực tiếp, dùng cho phụ đề nổi (cửa sổ riêng) và màn chữ lớn.
 * Kiểu viết thẳng (inline) vì cửa sổ nổi là một trang riêng, không có bảng kiểu của app.
 */
export function LiveCaptionView({ lines, prefs, place, waiting }: { lines: readonly LiveLine[]; prefs: CaptionPrefs; place: "float" | "big"; waiting: string }) {
  const rows = captionRows(lines, prefs.lines);
  const size = CAPTION_PX[prefs.size][place];
  const box: CSSProperties = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: place === "big" ? 18 : 8,
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
  if (!rows.length) {
    return (
      <div style={box} aria-live="polite">
        <p style={{ ...main, fontSize: Math.round(size * 0.7), fontWeight: 400, color: "rgba(255,255,255,0.7)" }}>{waiting}</p>
      </div>
    );
  }
  return (
    <div style={box} aria-live="polite">
      {rows.map((row, index) => {
        const last = index === rows.length - 1;
        const said = (row.translation + row.pending).trim();
        return (
          <div key={row.id} style={{ opacity: last ? 1 : 0.72 }}>
            <p style={main}>
              {said ? (
                <>
                  {row.translation}
                  <span style={{ opacity: 0.6 }}>{row.pending}</span>
                </>
              ) : (
                "…"
              )}
            </p>
            {prefs.source && row.source && <p style={sub}>{row.source}</p>}
          </div>
        );
      })}
    </div>
  );
}
