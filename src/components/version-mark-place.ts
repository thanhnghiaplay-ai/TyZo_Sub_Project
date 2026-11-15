const EDGE = 8;
const LOG_WIDTH = 296;
const LOG_HEIGHT = 256;

/**
 * Vị trí khung tóm tắt cập nhật, tính theo màn hình thật. Khung luôn nằm gọn trong màn hình:
 * ưu tiên dưới nút (căn mép phải hoặc mép trái theo `align`), thiếu chỗ thì lật lên trên.
 * Hàm thuần để test được.
 */
export function placeVersionLog(
  rect: { left: number; right: number; top: number; bottom: number },
  view: { width: number; height: number },
  align: "start" | "end",
): { left: number; top: number; width: number; maxHeight: number } {
  const width = Math.max(160, Math.min(LOG_WIDTH, view.width - EDGE * 2));
  const wanted = align === "start" ? rect.left : rect.right - width;
  const left = Math.min(Math.max(wanted, EDGE), Math.max(EDGE, view.width - width - EDGE));
  const below = view.height - rect.bottom - EDGE * 2;
  const above = rect.top - EDGE * 2;
  const flip = below < 140 && above > below;
  const room = Math.max(96, flip ? above : below);
  const maxHeight = Math.min(LOG_HEIGHT, room);
  const top = flip ? Math.max(EDGE, rect.top - EDGE - maxHeight) : rect.bottom + EDGE;
  return { left, top, width, maxHeight };
}
