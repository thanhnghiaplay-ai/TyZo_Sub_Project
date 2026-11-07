/** Format số tiền kiểu Việt: 100.000 (dấu chấm nghìn). Không có "đ". */
export function formatMoney(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? Number(n.replace(/\D/g, "")) : Number(n);
  if (!Number.isFinite(num) || num === 0) return num === 0 ? "0" : "";
  return new Intl.NumberFormat("vi-VN").format(Math.round(num));
}

/** Parse chuỗi có dấu . thành số. */
export function parseMoney(s: string): number {
  const digits = s.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}
