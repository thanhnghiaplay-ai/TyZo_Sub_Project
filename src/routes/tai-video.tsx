import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

/**
 * TAB "TẢI VIDEO" — MODULE RỜI.
 *
 * Gồm đúng 3 file mới + 1 dòng liên kết:
 *   src/routes/tai-video.tsx        (trang này)
 *   src/routes/api/tai-video.ts     (API quét trang)
 *   src/lib/tai-video.server.ts     (logic quét, chặn địa chỉ nội bộ)
 *   src/routes/tai-khoan.tsx        (1 dòng <Link to="/tai-video"> có chú thích TAI-VIDEO)
 *
 * GỠ BỎ nếu có lỗi: xóa 3 file trên, xóa dòng có chú thích TAI-VIDEO trong
 * tai-khoan.tsx, rồi chạy lại `npm run dev` (hoặc build) để routeTree.gen.ts tự sinh lại.
 * Không file nào khác trong app phụ thuộc vào mục này.
 */
export const Route = createFileRoute("/tai-video")({ component: VideoLinkPage });

type Found = { url: string; kind: "mp4" | "webm" | "hls" | "dash" };
type Scan = { page: string; media: Found[]; frames: string[] };

const KIND_LABEL: Record<Found["kind"], string> = {
  mp4: "MP4",
  webm: "WEBM",
  hls: "HLS (m3u8)",
  dash: "DASH (mpd)",
};

function VideoLinkPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function run(target: string) {
    setBusy(true);
    setNote(null);
    setScan(null);
    try {
      const response = await fetch("/api/tai-video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<Scan> & { error?: string };
      if (!response.ok) {
        setNote(data.error || "Chưa quét được trang này.");
        return;
      }
      const result: Scan = { page: data.page ?? target, media: data.media ?? [], frames: data.frames ?? [] };
      setScan(result);
      if (result.media.length === 0) {
        setNote(
          result.frames.length > 0
            ? "Trang không để lộ link video trực tiếp. Video có thể nằm trong khung nhúng bên dưới, thử quét từng khung."
            : "Không thấy link video. Trang có thể nạp video bằng JavaScript sau khi bấm phát, nên máy chủ không thấy.",
        );
      }
    } catch {
      setNote("Mất kết nối. Thử lại sau.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setNote("Không chép được. Hãy chọn và chép thủ công.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 pb-24">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tải video</h1>
          <p className="text-sm text-muted">Dán link trang, máy chủ quét link media công khai.</p>
        </div>
        <Link to="/tai-khoan" className="min-tap rounded-full border border-line px-4 text-sm">
          Tài khoản
        </Link>
      </header>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim() || busy) return;
          void run(url.trim());
        }}
      >
        <label className="text-sm font-medium" htmlFor="video-url">
          Link trang
        </label>
        <input
          id="video-url"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-tap w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="min-tap rounded-full bg-accent px-5 py-3 text-sm font-semibold text-ink disabled:opacity-40"
        >
          {busy ? "Đang quét…" : "Quét link video"}
        </button>
      </form>

      {note && <p className="rounded-xl border border-line bg-raised p-3 text-sm text-muted">{note}</p>}

      {scan && scan.media.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Tìm thấy ({scan.media.length})</h2>
          <ul className="space-y-2">
            {scan.media.map((item) => (
              <li key={item.url} className="space-y-2 rounded-xl border border-line bg-raised p-3">
                <span className="text-xs font-medium text-accent">{KIND_LABEL[item.kind]}</span>
                <p className="text-xs break-all text-muted">{item.url}</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    download
                    className="min-tap inline-flex items-center rounded-full bg-accent px-4 text-sm font-semibold text-ink"
                  >
                    {item.kind === "hls" || item.kind === "dash" ? "Mở" : "Tải về"}
                  </a>
                  <button type="button" className="min-tap rounded-full border border-line px-4 text-sm" onClick={() => void copy(item.url)}>
                    {copied === item.url ? "Đã chép" : "Chép link"}
                  </button>
                </div>
                {(item.kind === "hls" || item.kind === "dash") && (
                  <p className="text-xs text-muted">Đây là luồng chia đoạn, không phải một file. Cần công cụ ghép như ffmpeg hoặc yt-dlp (chạy được trong Termux trên Android).</p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Nếu bấm Tải về bị lỗi 403, trang gốc chặn tải từ nơi khác. Hãy chép link và dùng công cụ có gửi kèm Referer.</p>
        </section>
      )}

      {scan && scan.frames.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Khung nhúng ({scan.frames.length})</h2>
          <ul className="space-y-2">
            {scan.frames.map((frame) => (
              <li key={frame} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised p-3">
                <p className="min-w-0 text-xs break-all text-muted">{frame}</p>
                <button
                  type="button"
                  disabled={busy}
                  className="min-tap shrink-0 rounded-full border border-line px-4 text-sm disabled:opacity-40"
                  onClick={() => {
                    setUrl(frame);
                    void run(frame);
                  }}
                >
                  Quét khung
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
