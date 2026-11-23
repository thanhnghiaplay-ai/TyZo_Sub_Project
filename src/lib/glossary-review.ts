// Nhãn «đã duyệt / chưa duyệt» và thống kê thuật ngữ cho Chủ (bước B3, HANDOFF_NANG_CAP.md).
// Chỉ import tương đối để test được bằng Node. Không chạm CSDL.

export type ReviewFilter = "all" | "reviewed" | "draft";

export const REVIEW_FILTERS: ReadonlyArray<readonly [ReviewFilter, string]> = [
  ["all", "Tất cả"],
  ["reviewed", "Đã duyệt"],
  ["draft", "Chưa duyệt"],
];

export function cleanReviewFilter(value: unknown): ReviewFilter {
  return value === "reviewed" || value === "draft" ? value : "all";
}

/** Giá trị cho điều kiện SQL: null = không lọc, true/false = lọc theo cột `reviewed`. */
export function reviewFilterValue(filter: ReviewFilter): boolean | null {
  if (filter === "reviewed") return true;
  if (filter === "draft") return false;
  return null;
}

export type StatRow = { lang: string; genre: string; total: number; reviewed: number; hidden: number };
type GenreStat = { genre: string; label: string; total: number; reviewed: number; draft: number; hidden: number };
export type LangStat = { lang: string; total: number; reviewed: number; draft: number; genres: GenreStat[] };

/** Gộp các dòng đếm từ CSDL theo ngôn ngữ, mỗi ngôn ngữ liệt kê thể loại (nhiều mục nhất trước). */
export function summarizeStats(rows: StatRow[], labels: Record<string, string>): LangStat[] {
  const byLang = new Map<string, LangStat>();
  for (const row of rows) {
    const total = Math.max(0, Math.floor(row.total) || 0);
    const reviewed = Math.min(total, Math.max(0, Math.floor(row.reviewed) || 0));
    const hidden = Math.min(total, Math.max(0, Math.floor(row.hidden) || 0));
    let lang = byLang.get(row.lang);
    if (!lang) {
      lang = { lang: row.lang, total: 0, reviewed: 0, draft: 0, genres: [] };
      byLang.set(row.lang, lang);
    }
    lang.total += total;
    lang.reviewed += reviewed;
    lang.draft += total - reviewed;
    lang.genres.push({ genre: row.genre, label: labels[row.genre] || row.genre, total, reviewed, draft: total - reviewed, hidden });
  }
  const out = [...byLang.values()];
  for (const lang of out) lang.genres.sort((a, b) => b.total - a.total || a.genre.localeCompare(b.genre));
  return out.sort((a, b) => a.lang.localeCompare(b.lang));
}

/** Thể loại chưa có mục nào, theo danh sách thể loại đang chọn được, để Chủ thấy chỗ còn trống. */
export function emptyGenres(rows: StatRow[], lang: string, labels: Record<string, string>): string[] {
  const have = new Set(rows.filter((row) => row.lang === lang && row.total > 0).map((row) => row.genre));
  return Object.keys(labels).filter((id) => !have.has(id));
}

/** Một dòng chữ ngắn cho thanh thống kê: «320 mục: 300 đã duyệt, 20 chưa duyệt.» */
export function statLine(total: number, reviewed: number): string {
  if (total <= 0) return "Chưa có mục nào.";
  const draft = Math.max(0, total - reviewed);
  return `${total} mục: ${reviewed} đã duyệt, ${draft} chưa duyệt.`;
}
