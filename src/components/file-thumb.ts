import { useEffect, useState } from "react";

export type FileThumb = {
  state: "idle" | "loading" | "ready" | "none";
  /** Ảnh JPEG dạng data URL, chỉ có khi trình duyệt đọc được khung hình. */
  image: string | null;
  seconds: number | null;
};

const IDLE: FileThumb = { state: "idle", image: null, seconds: null };
const MEDIA_EXT = /\.(mp4|m4v|mkv|webm|mov|avi|ts|m2ts|wmv|flv|3gp|mp3|m4a|aac|ac3|dts|wav|flac|ogg|opus)$/i;

/** Nhận video hoặc âm thanh. Tệp không rõ loại (MKV, AC3…) vẫn nhận nếu đuôi đúng. */
export function isMediaFile(file: File): boolean {
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) return true;
  return MEDIA_EXT.test(file.name);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
  return Math.max(1, Math.round(bytes / 1048576)) + " MB";
}

/**
 * Lấy một khung hình và thời lượng của tệp đã chọn, chỉ trên máy người dùng.
 * Không tải tệp lên đâu cả. Trình duyệt không đọc được (MKV, HEVC…) thì trả state "none".
 */
export function useFileThumb(file: File | null): FileThumb {
  const [thumb, setThumb] = useState<FileThumb>(IDLE);

  useEffect(() => {
    if (!file) {
      setThumb(IDLE);
      return;
    }
    let dead = false;
    setThumb({ state: "loading", image: null, seconds: null });
    const href = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    let seconds: number | null = null;
    const finish = (image: string | null) => {
      if (dead) return;
      clearTimeout(timer);
      setThumb({ state: image ? "ready" : "none", image, seconds });
    };
    const timer = window.setTimeout(() => finish(null), 8000);
    const capture = () => {
      try {
        const w = 320;
        const h = Math.max(1, Math.round((w * video.videoHeight) / Math.max(1, video.videoWidth)));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, w, h);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        finish(null);
      }
    };
    video.onloadedmetadata = () => {
      seconds = Number.isFinite(video.duration) ? video.duration : null;
      if (!video.videoWidth) return finish(null);
      const at = seconds && seconds > 2 ? Math.min(Math.max(seconds * 0.1, 1), 60) : 0;
      if (at > 0) video.currentTime = at;
      else capture();
    };
    video.onseeked = capture;
    video.onerror = () => finish(null);
    video.src = href;
    return () => {
      dead = true;
      clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(href);
    };
  }, [file]);

  return thumb;
}
