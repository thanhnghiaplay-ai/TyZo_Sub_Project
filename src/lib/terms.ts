/** Đổi chuỗi này khi sửa nội dung điều khoản (components/terms-document.tsx). Người đã dùng phải đồng ý lại. */
export const TERMS_VERSION = "2026-11-15.1";

/** Khóa lưu trên máy. Giữ nguyên tên cũ để người đã đồng ý bản hiện tại không bị hỏi lại. */
export const TERMS_KEY = "gterms";

/** Máy này đã đồng ý đúng bản điều khoản đang chạy chưa. Máy không cho đọc thì coi như chưa. */
export function hasAcceptedTerms(): boolean {
  try {
    return localStorage.getItem(TERMS_KEY) === TERMS_VERSION;
  } catch {
    return false;
  }
}

/** Ghi lại là máy này đã đồng ý bản đang chạy. Trả false khi máy không cho lưu (lần sau sẽ hỏi lại). */
export function rememberTermsAccepted(): boolean {
  try {
    localStorage.setItem(TERMS_KEY, TERMS_VERSION);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cửa vào phải làm gì khi mở phòng.
 * - "enter": đã đồng ý bản này, vào thẳng.
 * - "login": chưa đồng ý và chưa đăng nhập: sang trang đăng nhập, nơi có ô tích đồng ý.
 * - "ask": chưa đồng ý bản này nhưng đã có tài khoản (điều khoản vừa đổi): hiện lại điều khoản.
 * - "wait": chưa biết đã đăng nhập hay chưa.
 */
export function termsGate(input: { accepted: boolean; pending: boolean; signedIn: boolean }): "enter" | "login" | "ask" | "wait" {
  if (input.accepted) return "enter";
  if (input.pending) return "wait";
  return input.signedIn ? "ask" : "login";
}
