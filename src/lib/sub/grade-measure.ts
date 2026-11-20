/**
 * Đổi kết quả ĐO nhận dạng (báo cáo của `npm run asr:bench`) thành điểm model, để thay dần số ước lượng ở model-grade.ts.
 * Hàm thuần, không gọi mạng. Chỉ đo được ĐỘ CHÍNH XÁC nhận dạng: quality (mọi ngôn ngữ) và asian (Trung, Nhật, Hàn).
 * Tốc độ và việc dịch chưa đo ở đây, giữ số ước lượng.
 */
import type { Lang } from "./asr-score.ts";

/** Sai khác từ mức này trở lên chấm 0 điểm, 0% chấm 10 điểm, ở giữa tuyến tính. */
export const ERROR_ZERO_AT = 0.5;
/** Cần ít nhất ngần này clip (mỗi clip một đáp án đã duyệt) thì mới ghi đè số ước lượng, tránh kết luận từ một clip. */
export const MIN_CASES = 3;

export type BenchEntry = { case: string; model: string; variant: string; verdict?: { metrics?: { errorRate?: number | null } } };
export type MeasuredGrade = { quality?: number; asian?: number; cases: number };

const ASIAN: readonly Lang[] = ["zh", "ja", "ko"];

export function qualityFromError(errorRate: number): number {
  const score = 10 * (1 - Math.min(Math.max(errorRate, 0), ERROR_ZERO_AT) / ERROR_ZERO_AT);
  return Math.round(score * 10) / 10;
}

const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;

/**
 * Chỉ lấy biến thể `default` (đúng như app gửi) và dòng có sai khác (tức clip có đáp án).
 * Một clip chạy nhiều lần thì lấy trung bình trước, để clip chạy nhiều không nặng hơn clip khác.
 * quality cần từ minCases clip; asian cần từ minCases clip tiếng Á. Không đủ thì bỏ trường đó (giữ ước lượng).
 */
export function measureGrades(entries: BenchEntry[], langOf: Record<string, Lang>, minCases = MIN_CASES): Record<string, MeasuredGrade> {
  const byModel = new Map<string, Map<string, number[]>>();
  for (const e of entries) {
    const rate = e.verdict?.metrics?.errorRate;
    if (e.variant !== "default" || typeof rate !== "number" || !Number.isFinite(rate) || !langOf[e.case]) continue;
    const perCase = byModel.get(e.model) ?? new Map<string, number[]>();
    perCase.set(e.case, [...(perCase.get(e.case) ?? []), rate]);
    byModel.set(e.model, perCase);
  }
  const out: Record<string, MeasuredGrade> = {};
  for (const [model, perCase] of byModel) {
    const all = [...perCase.entries()].map(([id, rates]) => ({ lang: langOf[id], rate: mean(rates) }));
    const asian = all.filter((x) => ASIAN.includes(x.lang));
    const grade: MeasuredGrade = { cases: all.length };
    if (all.length >= minCases) grade.quality = qualityFromError(mean(all.map((x) => x.rate)));
    if (asian.length >= minCases) grade.asian = qualityFromError(mean(asian.map((x) => x.rate)));
    if (grade.quality !== undefined || grade.asian !== undefined) out[model] = grade;
  }
  return out;
}
