/** Phần tính toán thuần của trang Doanh thu: phân loại chi phí, ARPU, chuyển đổi, giá vốn mỗi phút, đường biểu đồ. */

export const COST_CATEGORIES = [
  { id: "ha-tang", label: "Hạ tầng (Vercel, Neon, tên miền)" },
  { id: "api", label: "API và model" },
  { id: "quang-cao", label: "Quảng cáo" },
  { id: "nhan-su", label: "Nhân sự, cộng tác" },
  { id: "khac", label: "Khác" },
] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number]["id"];

const CATEGORY_IDS = new Set<string>(COST_CATEGORIES.map((item) => item.id));

/** Giá trị lạ hay thiếu đều về "khac", không ném lỗi. */
export function parseCategory(value: unknown): CostCategory {
  return typeof value === "string" && CATEGORY_IDS.has(value) ? (value as CostCategory) : "khac";
}

export function categoryLabel(id: string): string {
  return COST_CATEGORIES.find((item) => item.id === id)?.label ?? "Khác";
}

/** Chia an toàn. Mẫu bằng 0 trả null để màn hình hiện «—», không hiện 0 gây hiểu nhầm. */
export function safeDiv(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return numerator / denominator;
}

/** ARPU = tiền nạp chia số khách đã nạp trong kỳ. */
export function arpu(topUp: number, payers: number): number | null {
  const value = safeDiv(topUp, payers);
  return value === null ? null : Math.round(value);
}

/** Tỷ lệ dùng thử → mua, 0..1. null nếu chưa ai dùng thử. */
export function conversionRate(trialUsers: number, converted: number): number | null {
  const value = safeDiv(Math.min(converted, trialUsers), trialUsers);
  return value;
}

/** Đồng trên mỗi phút âm thanh đã xử lý. */
export function costPerMinute(cost: number, seconds: number): number | null {
  const value = safeDiv(cost, seconds / 60);
  return value === null ? null : Math.round(value);
}

export type CategoryRow = { category: CostCategory; amount: number };

/** Gộp theo loại, loại lớn nhất lên đầu, bỏ loại bằng 0. */
export function sortCategories(rows: Array<{ category: unknown; amount: number }>): CategoryRow[] {
  const sum = new Map<CostCategory, number>();
  for (const row of rows) {
    const id = parseCategory(row.category);
    sum.set(id, (sum.get(id) ?? 0) + Math.max(0, Math.round(Number(row.amount) || 0)));
  }
  return [...sum.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type ChartSeries = { x: number; y: number }[];

/**
 * Tọa độ đường biểu đồ cho nhiều dãy trên cùng một trục tung (từ 0 đến mức lớn nhất).
 * Một điểm thì đặt giữa. Không có điểm thì trả mảng rỗng.
 */
export function lineGeometry(
  values: number[][],
  box: { width: number; height: number; pad: number },
): { max: number; lines: ChartSeries[] } {
  const count = Math.max(0, ...values.map((line) => line.length));
  const max = Math.max(0, ...values.flat().map((value) => (Number.isFinite(value) ? value : 0)));
  if (count === 0) return { max: 0, lines: values.map(() => []) };
  const innerW = box.width - box.pad * 2;
  const innerH = box.height - box.pad * 2;
  const lines = values.map((line) =>
    line.map((value, index) => ({
      x: count === 1 ? box.width / 2 : box.pad + (innerW * index) / (count - 1),
      y: box.pad + innerH - (max > 0 ? (Math.max(0, value) / max) * innerH : 0),
    })),
  );
  return { max, lines };
}

export function pathOf(points: ChartSeries): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}
