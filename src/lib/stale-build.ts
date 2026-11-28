/**
 * Trang mở từ bản cũ, web vừa lên bản mới (v5.30.2): trình duyệt đòi tệp của bản cũ nên báo
 * «Failed to fetch dynamically imported module». Tải lại trang là lấy được bản mới.
 * App tự tải lại MỘT lần (nhớ mốc trong sessionStorage) để không lặp vô hạn nếu lỗi do mạng.
 * Thuần, không import gì: test gọi thẳng.
 */

const STALE_RE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed/i;

export const RELOAD_KEY = "tyzo_stale_reload_at";

/** Đợi ít nhất bấy nhiêu mili giây giữa hai lần tự tải lại. */
export const RELOAD_GAP_MS = 30_000;

export function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return STALE_RE.test(message);
}

type Store = Pick<Storage, "getItem" | "setItem">;

/** true nếu được tự tải lại lúc này (và ghi mốc). Máy chặn lưu thì không tự tải lại, để khách bấm nút. */
export function claimAutoReload(store: Store | null, now = Date.now(), active = false): boolean {
  if (active) return false;
  try {
    if (!store) return false;
    const last = Number(store.getItem(RELOAD_KEY) || 0);
    if (Number.isFinite(last) && now - last < RELOAD_GAP_MS) return false;
    store.setItem(RELOAD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

/** Lấy sessionStorage an toàn (chế độ riêng tư có thể ném lỗi). */
export function sessionStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export const UPDATE_RELOAD_WARNING = {
  title: "Đang có việc chạy trong trang này",
  text: "Tải lại lúc này sẽ mất tiến độ chưa lưu của tệp đang xử lý (nhận dạng, dịch, nút Tiếp tục). Hãy đợi xong rồi lưu hoặc xuất phụ đề trước. Vẫn tải lại?",
  confirmLabel: "Vẫn tải lại",
  cancelLabel: "Đợi xong đã",
  danger: true,
} as const;

/** Bấm «Tải lại» ở thông báo bản mới: có việc đang chạy thì phải được khách đồng ý. Không hỏi được = không tải. */
export async function confirmUpdateReload(
  active: boolean,
  ask: (options: typeof UPDATE_RELOAD_WARNING) => Promise<boolean>,
): Promise<boolean> {
  if (!active) return true;
  try {
    return (await ask(UPDATE_RELOAD_WARNING)) === true;
  } catch {
    return false;
  }
}
