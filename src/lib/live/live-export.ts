import { toSrt, toTxt, toVtt } from "../sub/text.ts";
import type { Seg } from "../sub/types.ts";

export type LiveExportFormat = "srt" | "vtt" | "txt";

export type LiveCue = { start: number; end: number; original: string; translation: string | null; speaker?: string };

const MIME: Record<LiveExportFormat, string> = {
  srt: "application/x-subrip;charset=utf-8",
  vtt: "text/vtt;charset=utf-8",
  txt: "text/plain;charset=utf-8",
};

/** Đổi dòng của LiveTranscript sang kiểu Seg để dùng đúng bộ xuất SRT/VTT/TXT của trang phụ đề. */
export function liveCuesToSegs(cues: LiveCue[]): Seg[] {
  return cues.map((cue) => ({
    start: cue.start,
    end: cue.end,
    original: cue.original,
    translation: cue.translation,
  }));
}

/** Có gì để xuất không: ít nhất một dòng có chữ. */
export function hasLiveCues(cues: LiveCue[]): boolean {
  return cues.some((cue) => cue.original.trim() || (cue.translation ?? "").trim());
}

export function liveExportText(cues: LiveCue[], format: LiveExportFormat): string {
  const segs = liveCuesToSegs(cues);
  if (format === "vtt") return toVtt(segs);
  if (format === "txt") return toTxt(segs);
  return toSrt(segs);
}

/** Tên tệp theo giờ máy khách: dich-truc-tiep-20261114-2105.srt */
export function liveExportName(format: LiveExportFormat, at: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}`;
  return `dich-truc-tiep-${stamp}.${format}`;
}

export function liveExportFile(cues: LiveCue[], format: LiveExportFormat, at: Date = new Date()): { name: string; mime: string; text: string } | null {
  if (!hasLiveCues(cues)) return null;
  return { name: liveExportName(format, at), mime: MIME[format], text: liveExportText(cues, format) };
}

/** Tải về từ trình duyệt. Hủy link sau 1 giây như nút xuất ở trang phụ đề. */
export function downloadLiveFile(file: { name: string; mime: string; text: string }): void {
  // BOM để Notepad cũ đọc đúng tiếng Việt.
  const blob = new Blob(["\ufeff", file.text], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
