/** Lưu mã giới thiệu ?ref= như cửa vào phòng (EntryGate), để khách chưa đăng nhập vào từ link cộng tác viên không mất mã. */
export function rememberReferral() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? "";
    if (/^[A-Z2-9]{8}$/.test(code)) localStorage.setItem("tyzo-ref", code);
  } catch {
    /* máy không cho lưu */
  }
}
