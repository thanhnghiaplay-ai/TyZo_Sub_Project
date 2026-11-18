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
