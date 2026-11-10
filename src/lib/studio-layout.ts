/**
 * Khi nào tab công cụ của phòng chiếu là "tấm trượt" (đóng cho tới khi chọn tab).
 * Chuỗi này phải trùng hai khối SHEET_PORTRAIT và SHEET_LANDSCAPE trong `src/styles.css`;
 * `studio-layout.test.ts` kiểm tra. Ngoài các màn này, tab công cụ luôn hiện.
 */
export const STUDIO_SHEET_QUERY =
  "(max-width: 699px) and (orientation: portrait), (max-height: 520px) and (orientation: portrait), (orientation: landscape) and (max-height: 720px)";

export function isStudioSheet(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(STUDIO_SHEET_QUERY).matches;
}
