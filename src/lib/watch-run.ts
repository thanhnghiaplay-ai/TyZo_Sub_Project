import type { Seg } from "@/lib/sub/types";

/** Phần vừa đủ để quyết định nút chạy và số giây cần dịch lại. */
export type WatchCue = Pick<Seg, "start" | "end" | "edited" | "stale" | "translation">;

export type WatchIntent = "" | "Hủy" | "Nhận dạng lại" | "Tải và dịch" | "Dịch lại" | "Tiếp tục";

export function watchIntent(input: {
  running: boolean;
  segs: WatchCue[];
  pcmId: string;
  mediaId: string;
  doneSource: string;
  source: string;
  appliedSig: string;
  sig: string;
  /** Còn đoạn nhận dạng chưa gửi. Khi còn, không được đổi thành Dịch lại kẻo bỏ sót phí nhận dạng. */
  asrLeft: boolean;
}): WatchIntent {
  if (input.running) return "Hủy";
  const bound = Boolean(input.pcmId) && input.segs.length > 0;
  const sameMedia = Boolean(input.mediaId) && input.pcmId === input.mediaId;
  const sameSource = Boolean(input.doneSource) && input.doneSource === input.source;
  if (bound && (!sameMedia || !sameSource)) return "Nhận dạng lại";
  if (!bound) return "Tải và dịch";
  if (input.asrLeft) return "Tiếp tục";
  const mismatch = Boolean(input.appliedSig) && input.appliedSig !== input.sig;
  if (mismatch || input.segs.some((seg) => seg.stale && !seg.edited)) return "Dịch lại";
  if (input.segs.some((seg) => !seg.edited && seg.translation === null && !seg.stale)) return "Tiếp tục";
  return "";
}

/** Giây của các câu sẽ gửi khi dịch lại. Câu đã sửa tay không tính. Câu đã là bản mới thì không tính lại. */
export function resendSeconds(segs: WatchCue[], appliedSig: string, sig: string): number {
  const mismatch = Boolean(appliedSig) && appliedSig !== sig;
  return segs.reduce((total, seg) => {
    if (seg.edited) return total;
    if (!(mismatch || seg.stale || seg.translation == null)) return total;
    return total + Math.max(0, seg.end - seg.start);
  }, 0);
}
