const SEEN_KEY = "tyzo_tour_v1";

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* trình duyệt chặn lưu thì lần sau hiện lại, không sao */
  }
}
