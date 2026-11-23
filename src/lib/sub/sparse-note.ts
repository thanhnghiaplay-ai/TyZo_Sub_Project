import { scoreAsr, type Cue, type Lang } from "./asr-score.ts";

/** Video ngắn hơn mức này thì ít chữ là chuyện thường (đoạn lặng, vài lời), không cảnh báo. */
export const SPARSE_MIN_SECONDS = 20;

const LANGS: readonly string[] = ["zh", "ja", "ko", "en"];

type SparseInput = {
  /** Mã ngôn ngữ nguồn đang chạy (zh, ja, ko, en). Ngôn ngữ khác thì không đo. */
  lang: string;
  /** Các câu nhận dạng được, chữ thô của máy nhận dạng (chưa dịch). */
  segs: readonly { start: number; end: number; raw?: string; original: string }[];
  /** Tổng thời lượng âm thanh đã đưa cho máy nhận dạng (giây). */
  seconds: number;
};

/**
 * Câu nhắc cho khách khi nhận dạng ra quá ít chữ so với độ dài (dấu hiệu máy bỏ sót lời).
 * Trả chuỗi rỗng nếu không có gì đáng nói. Chỉ dựa vào hai dấu hiệu «thưa»; không bao giờ báo
 * vì câu bịa hay lệch ngôn ngữ, vì chỗ đó chưa đo đủ để nói với khách. Không có từ nội bộ.
 */
export function sparseSpeechNote(input: SparseInput): string {
  if (!LANGS.includes(input.lang) || input.seconds < SPARSE_MIN_SECONDS || !input.segs.length) return "";
  const cues: Cue[] = input.segs
    .map((seg) => ({ start: seg.start, end: seg.end, text: (seg.raw ?? seg.original).trim() }))
    .filter((cue) => cue.text && cue.end > cue.start);
  if (!cues.length) return "";
  const verdict = scoreAsr({ cues, lang: input.lang as Lang, durationSec: input.seconds });
  const sparse = verdict.fails.some((reason) => reason.startsWith("quá thưa") || reason.includes("câu dài mà ít chữ"));
  return sparse
    ? "Số chữ nhận ra khá ít so với độ dài video, có thể đã sót lời. Bạn thử chọn model nhận dạng khác hoặc chạy lại để so sánh."
    : "";
}
