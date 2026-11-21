/** Chữ trên chấm số của thanh dưới: rỗng khi không có gì cần báo, 99+ khi quá lớn. */
export function dockBadgeText(count: number | undefined): string {
  if (!count || !Number.isFinite(count) || count < 1) return "";
  return count > 99 ? "99+" : String(Math.floor(count));
}

/** Ô nhập chữ (bàn phím hiện lên): thanh dưới tự ẩn để không che ô đang gõ. Nút chọn, ô tick, thanh kéo không tính. */
const TEXT_INPUT = new Set(["text", "search", "email", "password", "url", "number", "tel", ""]);
export function isTypingTarget(tag: string, type: string | undefined, editable: boolean): boolean {
  if (editable) return true;
  const name = tag.toUpperCase();
  if (name === "TEXTAREA" || name === "SELECT") return true;
  return name === "INPUT" && TEXT_INPUT.has((type ?? "").toLowerCase());
}

/**
 * Bàn phím ảo đang mở chưa (v5.30.3). So chiều cao vùng nhìn thấy với chiều cao lúc không gõ (base).
 * Tắt bàn phím bằng nút quay lại của điện thoại thì ô nhập vẫn được chọn: chỉ dựa vào ô đang chọn
 * thì thanh dưới ẩn mãi và tab Ví lộ khoảng trống. Thiếu số đo (trình duyệt cũ) thì coi như đang mở, như trước.
 */
export function keyboardOpen(viewHeight: number | null | undefined, baseHeight: number | null | undefined): boolean {
  if (!viewHeight || !baseHeight || !Number.isFinite(viewHeight) || !Number.isFinite(baseHeight)) return true;
  return baseHeight - viewHeight > Math.max(120, baseHeight * 0.15);
}
