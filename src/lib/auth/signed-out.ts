/** Cờ người dùng chủ động đăng xuất. Cổng xem thử không được tự đăng nhập lại. */
export const SIGNED_OUT_COOKIE = "tyzo-signed-out";

export function markSignedOut() {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNED_OUT_COOKIE}=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`;
}

export function clearSignedOut() {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNED_OUT_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=Lax`;
}

export function requestChoseSignOut(cookieHeader: string) {
  return cookieHeader.split(";").some((part) => part.trim() === `${SIGNED_OUT_COOKIE}=1`);
}
