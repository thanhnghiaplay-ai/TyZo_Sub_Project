/**
 * Chuỗi bước của trang khách: Cài đặt dịch (dán key) → Phim → Ngữ cảnh → Thuyết minh → Tải và dịch.
 * Nút «Tiếp tục» dính đầu mỗi tab đưa sang bước kế; ở bước cuối nút đó chạy dịch luôn.
 * «Kiểm tra» (sau khi dịch) và «Thuật ngữ» (nhánh của Ngữ cảnh) không nằm trong chuỗi.
 * Hàm thuần, không import gì, chạy được trong test Node.
 */
export const STEP_ORDER = ["key", "phim", "cast", "voice", "run"] as const;
type StepId = (typeof STEP_ORDER)[number];

type StepInfo = { index: number; total: number; next: StepId | null; last: boolean };

/** Vị trí của tab trong chuỗi; tab ngoài chuỗi (Kiểm tra) trả null thì không hiện thanh «Tiếp tục». */
export function stepInfo(id: string): StepInfo | null {
  const index = (STEP_ORDER as readonly string[]).indexOf(id);
  if (index < 0) return null;
  const last = index === STEP_ORDER.length - 1;
  return { index: index + 1, total: STEP_ORDER.length, next: last ? null : STEP_ORDER[index + 1], last };
}
