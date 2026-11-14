// Số liệu ví cho khách: còn bao nhiêu phút, ước tính trước khi chạy. Hàm thuần, không gọi mạng.

/** Cùng hình dạng với TurnPrice của báo giá trả theo lượt, khai báo lại để file này chạy được không cần máy chủ. */
export type PriceRow = { id: string; total: number | null; hold: number };

export function formatDong(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(n))) + " đ";
}

/** Chọn dòng giá theo gói khách đang chọn; không có thì lấy gói rẻ nhất có giá (exact = false). */
export function pickPrice(rows: PriceRow[], preferredId: string | null): { row: PriceRow; exact: boolean } | null {
  const priced = rows.filter((row) => row.total != null && row.total > 0);
  if (!priced.length) return null;
  const hit = preferredId ? priced.find((row) => row.id === preferredId) : undefined;
  if (hit) return { row: hit, exact: true };
  const cheapest = priced.reduce((best, row) => ((row.total as number) < (best.total as number) ? row : best));
  return { row: cheapest, exact: false };
}

/** Số phút còn chạy được với số dư này, theo giá một phút. null nếu chưa có giá. */
export function minutesLeft(balance: number, perMinute: number | null): number | null {
  if (perMinute == null || !Number.isFinite(perMinute) || perMinute <= 0) return null;
  if (!Number.isFinite(balance) || balance <= 0) return 0;
  return Math.floor(balance / perMinute);
}

export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  if (total < 1) return "dưới 1 phút";
  if (total < 60) return `${total} phút`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

export type RunEstimate = { total: number; hold: number; enough: boolean; short: number };

/** Ước tính cho video đang chọn. Phòng giữ `hold` từ ví trước khi chạy, nên đủ hay thiếu so với số giữ. */
export function runEstimate(row: PriceRow | null, balance: number): RunEstimate | null {
  if (!row || row.total == null || !(row.total > 0)) return null;
  const hold = row.hold > 0 ? row.hold : row.total;
  const have = Number.isFinite(balance) ? Math.max(0, balance) : 0;
  return { total: row.total, hold, enough: have >= hold, short: Math.max(0, hold - have) };
}
