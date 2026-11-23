/**
 * Phụ đề Dịch trực tiếp: tùy chỉnh hiển thị, chọn dòng để hiện (khung chính, phụ đề nổi, chữ lớn),
 * từ cần giữ đúng (tên riêng) và bản lưu phiên trước trên máy. Hàm thuần, test được bằng Node.
 */
import type { LiveLine } from "./live-transcript.ts";

export type CaptionSize = "s" | "m" | "l" | "xl";

export type CaptionPrefs = {
  size: CaptionSize;
  /** Số dòng hiện trong phụ đề nổi và chữ lớn (1 đến 4). */
  lines: number;
  /** Hiện chữ gốc dưới chữ dịch. */
  source: boolean;
  /** Nền đậm (dễ đọc trên video sáng). */
  solid: boolean;
};

export const CAPTION_DEFAULT: CaptionPrefs = { size: "m", lines: 2, source: false, solid: true };

/** Cỡ chữ dịch (px) theo nơi hiện: khung nổi nhỏ, màn chữ lớn to hơn. */
export const CAPTION_PX: Record<CaptionSize, { float: number; big: number }> = {
  s: { float: 18, big: 28 },
  m: { float: 22, big: 36 },
  l: { float: 28, big: 46 },
  xl: { float: 34, big: 58 },
};

export const CAPTION_SIZE_LABEL: Record<CaptionSize, string> = { s: "Nhỏ", m: "Vừa", l: "Lớn", xl: "Rất lớn" };

export function parseCaptionPrefs(raw: unknown): CaptionPrefs {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const size = row.size === "s" || row.size === "m" || row.size === "l" || row.size === "xl" ? row.size : CAPTION_DEFAULT.size;
  const count = Number(row.lines);
  return {
    size,
    lines: Number.isFinite(count) ? Math.min(4, Math.max(1, Math.round(count))) : CAPTION_DEFAULT.lines,
    source: typeof row.source === "boolean" ? row.source : CAPTION_DEFAULT.source,
    solid: typeof row.solid === "boolean" ? row.solid : CAPTION_DEFAULT.solid,
  };
}

type CaptionRow = { id: string; translation: string; pending: string; source: string };

/** Các dòng mới nhất có chữ (dịch hoặc gốc), tối đa `count`, cũ trước mới sau. */
export function captionRows(lines: readonly LiveLine[], count: number): CaptionRow[] {
  const out: CaptionRow[] = [];
  for (let i = lines.length - 1; i >= 0 && out.length < count; i--) {
    const line = lines[i];
    const translation = line.translation.trim();
    const pending = line.translationStash.trim();
    const source = `${line.source}${line.sourceStash}`.trim();
    if (!translation && !pending && !source) continue;
    out.unshift({ id: line.id, translation: line.translation, pending: line.translationStash, source });
  }
  return out;
}

/** Tối đa bao nhiêu cặp từ cần giữ đúng, và độ dài mỗi bên (vé vào cầu nối nằm trong địa chỉ, phải gọn). */
export const HOTWORD_MAX = 30;
const SIDE_MAX = 40;

/**
 * Đọc ô «Từ cần giữ đúng»: mỗi dòng `gốc = dịch` (hoặc chỉ `gốc` để giữ nguyên). Bỏ dòng trống, dòng quá dài, trùng.
 * Trả cặp gốc → dịch cho Qwen LiveTranslate (translation.corpus.phrases).
 */
export function parseHotwords(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let count = 0;
  for (const raw of (text || "").split(/\r?\n/)) {
    if (count >= HOTWORD_MAX) break;
    const line = raw.trim();
    if (!line) continue;
    const at = line.search(/\s*(=|→|->)\s*/);
    const left = (at >= 0 ? line.slice(0, at) : line).trim();
    const right = (at >= 0 ? line.slice(at).replace(/^\s*(=|→|->)\s*/, "") : line).trim();
    if (!left || !right || left.length > SIDE_MAX || right.length > SIDE_MAX) continue;
    if (Object.prototype.hasOwnProperty.call(out, left)) continue;
    out[left] = right;
    count++;
  }
  return out;
}

/** Kiểm lại cặp từ trong vé (máy chủ và cầu nối không tin trình duyệt). */
export function cleanHotwords(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  let count = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= HOTWORD_MAX) break;
    const left = key.trim();
    const right = typeof value === "string" ? value.trim() : "";
    if (!left || !right || left.length > SIDE_MAX || right.length > SIDE_MAX) continue;
    out[left] = right;
    count++;
  }
  return out;
}

type SavedCue = { start: number; end: number; original: string; translation: string | null; speaker?: string };
export type SavedLive = { at: number; cues: SavedCue[] };

/** Bản lưu phiên trước trên máy (chỉ trên máy khách). Giữ tối đa 2.000 câu, bỏ câu trống. */
export function packSavedLive(cues: readonly SavedCue[], at: number): SavedLive | null {
  const kept = cues.filter((cue) => cue.original.trim() || (cue.translation ?? "").trim()).slice(-2000);
  return kept.length ? { at, cues: kept.map((cue) => ({ start: cue.start, end: cue.end, original: cue.original, translation: cue.translation, ...(cue.speaker ? { speaker: cue.speaker } : {}) })) } : null;
}

export function parseSavedLive(raw: string | null): SavedLive | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<SavedLive>;
    if (typeof data.at !== "number" || !Array.isArray(data.cues)) return null;
    const cues = data.cues.filter(
      (cue): cue is SavedCue =>
        Boolean(cue) && typeof cue.start === "number" && typeof cue.end === "number" && typeof cue.original === "string" && (cue.translation === null || typeof cue.translation === "string"),
    );
    return cues.length ? { at: data.at, cues } : null;
  } catch {
    return null;
  }
}
