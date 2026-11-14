/** Luật nút quay lại. Hàm thuần, không đụng trình duyệt, để test được. */

/** Trình duyệt đang đứng ở trang đầu của phiên (mở thẳng link, tab mới) thì không có trang trước trong app. */
export function canGoBack(state: unknown): boolean {
  if (!state || typeof state !== "object") return false;
  const index = (state as { __TSR_index?: unknown }).__TSR_index;
  return typeof index === "number" && index > 0;
}

export type TabBack<T extends string> = { tab: T; stack: T[] } | null;

/** Ghi lại tab vừa rời để mũi tên quay về đúng tab đó. Không ghi trùng tab liền trước. */
export function pushTabHistory<T extends string>(stack: T[], from: T, to: T): T[] {
  if (from === to) return stack;
  if (stack[stack.length - 1] === from) return stack;
  return [...stack, from];
}

/**
 * Mũi tên trong các tab cùng một trang: về tab vừa xem; hết lịch sử mà chưa ở màn chính thì về màn chính;
 * đã ở màn chính thì trả null (để nút rời trang như bình thường).
 */
export function backTab<T extends string>(stack: T[], current: T, home: T): TabBack<T> {
  if (stack.length > 0) {
    const tab = stack[stack.length - 1];
    return { tab, stack: stack.slice(0, -1) };
  }
  if (current !== home) return { tab: home, stack: [] };
  return null;
}
