/**
 * Thư «Mật khẩu đã đổi» khi khách tự đổi mật khẩu trong trang tài khoản (Thư — còn lại, mục 5).
 * Trước đây thư này chỉ gửi khi đặt lại qua thư quên mật khẩu (onPasswordReset).
 * Thuần, không import gì: auth/server.ts gọi trong hook sau mỗi yêu cầu, test gọi thẳng.
 */

/** Đường đổi mật khẩu của Better Auth (authClient.changePassword). */
export const CHANGE_PASSWORD_PATH = "/change-password";

/**
 * Email cần báo, hoặc null. Chỉ khi đúng đường đổi mật khẩu VÀ đổi xong (trả về có user);
 * sai mật khẩu cũ hay lỗi khác (APIError, Error, không có user) thì không gửi.
 */
export function changedLetterTo(path: string | undefined, returned: unknown, sessionEmail?: string | null): string | null {
  if (path !== CHANGE_PASSWORD_PATH) return null;
  if (!returned || typeof returned !== "object" || returned instanceof Error) return null;
  if ("status" in returned && typeof (returned as { status?: unknown }).status === "string") return null;
  const user = (returned as { user?: { email?: unknown } }).user;
  if (!user || typeof user !== "object") return null;
  const email = typeof user.email === "string" && user.email.trim() ? user.email.trim() : (sessionEmail ?? "").trim();
  return email.includes("@") ? email : null;
}
