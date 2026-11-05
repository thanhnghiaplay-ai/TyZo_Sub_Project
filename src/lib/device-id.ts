const KEY = "tyzo-device";

export function deviceId() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && /^[a-z0-9]{16,64}$/.test(saved)) return saved;
    const next = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(KEY, next);
    return next;
  } catch {
    return null;
  }
}
