/**
 * Câu hỏi lần đầu (đợt 4 sắp lại trang khách): «Bạn dùng TyZo Sub chủ yếu để làm gì?». Thuần, chỉ import tương đối.
 * Hỏi một lần trên máy, có Bỏ qua. Câu trả lời lưu trên máy để đặt sẵn lựa chọn hợp; không gắn với tài khoản.
 */

export type UseAnswer = "phim" | "lam-phu-de" | "hoc" | "khac";

export const USE_KEY = "tyzo_use";

export const USE_CHOICES: readonly { id: UseAnswer; label: string }[] = [
  { id: "phim", label: "Xem phim bộ" },
  { id: "lam-phu-de", label: "Làm phụ đề, thuyết minh" },
  { id: "hoc", label: "Học ngoại ngữ" },
  { id: "khac", label: "Việc khác" },
];

type Store = Pick<Storage, "getItem" | "setItem">;

/** null: chưa hỏi. "skip": khách bấm Bỏ qua (không hỏi lại). */
export function readUse(store: Store | null): UseAnswer | "skip" | null {
  try {
    const value = store?.getItem(USE_KEY);
    if (value === "skip") return "skip";
    return USE_CHOICES.some((choice) => choice.id === value) ? (value as UseAnswer) : null;
  } catch {
    // Máy chặn đọc: coi như đã hỏi, không làm phiền mỗi lần vào.
    return "skip";
  }
}

export function rememberUse(store: Store | null, answer: UseAnswer | "skip") {
  try {
    store?.setItem(USE_KEY, answer);
  } catch {
    /* máy chặn lưu: lần sau có thể hỏi lại */
  }
}

/** Việc đặt sẵn theo câu trả lời, và câu báo cho khách biết đã đặt gì (không âm thầm đổi). */
export type UsePreset = { narration?: boolean; tip: string };

export function usePreset(answer: UseAnswer): UsePreset {
  if (answer === "hoc") {
    return { narration: false, tip: "Đã tắt Thuyết minh để bạn nghe giọng gốc. Danh sách Bản dịch luôn có câu gốc dưới câu dịch." };
  }
  if (answer === "lam-phu-de") {
    return { tip: "Dịch xong, bấm Tải phụ đề ở đầu trang để lấy file; giọng đọc chỉnh ở tab Thuyết minh." };
  }
  if (answer === "phim") return { tip: "Chọn video rồi bấm Tải và dịch. Thể loại Tự động hợp với hầu hết phim bộ." };
  return { tip: "Cảm ơn bạn. Mọi chức năng nằm trong Menu." };
}

/** Chỉ hỏi khi chưa trả lời, và không chồng lên câu chọn cách trả (một câu hỏi một lúc). */
export function shouldAsk(answer: UseAnswer | "skip" | null, payKind: string): boolean {
  return answer === null && payKind !== "choose" && payKind !== "reading";
}
