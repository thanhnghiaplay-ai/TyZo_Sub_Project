/**
 * Hạn chót cho một lần gọi mạng, tính cả lúc đọc hết phần thân phản hồi.
 * Hàm thuần, không import gì của app, chạy được trong test Node.
 *
 * Trước đây hạn chót chỉ bao đến lúc máy chủ trả đầu phản hồi. Đầu về rồi mà phần thân đứng giữa chừng
 * thì `response.json()` chờ mãi và cả lần dịch treo. Ở đây có hai hạn riêng:
 * - header: từ lúc gửi đến lúc có đầu phản hồi.
 * - body: từ lúc có đầu phản hồi đến lúc `handle` đọc xong.
 */

export const HEADER_TIMEOUT_MS = 120_000;
export const BODY_TIMEOUT_MS = 120_000;

export type DeadlinePhase = "header" | "body";

/** Hạn chót của chính mình đã hết. Khác với người dùng bấm hủy và khác với lỗi mạng. */
export class DeadlineError extends Error {
  readonly phase: DeadlinePhase;
  readonly ms: number;
  constructor(phase: DeadlinePhase, ms: number) {
    super(phase === "header" ? "Máy chủ không trả lời kịp." : "Máy chủ gửi dữ liệu dở dang rồi dừng.");
    this.name = "DeadlineError";
    this.phase = phase;
    this.ms = ms;
  }
}

function cancelled(): Error {
  const error = new Error("Đã hủy.");
  error.name = "AbortError";
  return error;
}

export type DeadlineOptions = {
  /** Tín hiệu hủy của người dùng. */
  signal?: AbortSignal;
  headerMs?: number;
  bodyMs?: number;
};

/**
 * Gửi `send`, rồi chạy `handle` trên phản hồi dưới hạn chót body. `handle` phải đọc hết phần thân
 * (json, text, blob) trước khi trả về, vì hạn chót chỉ dừng khi `handle` xong.
 * Ném: AbortError khi người dùng hủy, DeadlineError khi quá hạn, còn lại là lỗi gốc (mạng, JSON hỏng).
 */
export async function withDeadlines<T>(
  send: (signal: AbortSignal) => Promise<Response>,
  handle: (response: Response) => Promise<T>,
  options: DeadlineOptions = {},
): Promise<T> {
  const { signal, headerMs = HEADER_TIMEOUT_MS, bodyMs = BODY_TIMEOUT_MS } = options;
  if (signal?.aborted) throw cancelled();
  const guard = new AbortController();
  const relay = () => guard.abort();
  signal?.addEventListener("abort", relay, { once: true });
  let phase: DeadlinePhase = "header";
  let expired = false;
  const arm = (ms: number) =>
    setTimeout(() => {
      expired = true;
      guard.abort();
    }, ms);
  let timer = arm(headerMs);
  try {
    const response = await send(guard.signal);
    phase = "body";
    clearTimeout(timer);
    timer = arm(bodyMs);
    return await handle(response);
  } catch (error) {
    if (signal?.aborted) throw cancelled();
    if (expired) throw new DeadlineError(phase, phase === "header" ? headerMs : bodyMs);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relay);
  }
}
