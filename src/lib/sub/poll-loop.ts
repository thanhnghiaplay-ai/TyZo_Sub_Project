/**
 * Vòng hỏi lặp phía máy khách cho nhà nhận dạng chạy bất đồng bộ (AssemblyAI, Speechmatics, Soniox).
 * Thuần, không import máy chủ, nên test được bằng hàm giả. Mỗi lần hỏi là một lệnh ngắn gọi tới máy chủ phòng.
 *
 * Lỗi MẠNG tạm thời (không tới được máy chủ phòng) được thử lại vài lần, vì bản phiên âm bên nhà vẫn đang chạy.
 * Lỗi THẬT do nhà nhận dạng hoặc phòng báo (key sai, file hỏng, hết Token...) thì dừng ngay, không thử lại.
 */
export type PollStep<T> = { state: "running" } | ({ state: "done" } & T);

type PollLoopOptions<T> = {
  step: () => Promise<PollStep<T>>;
  signal: AbortSignal;
  intervalMs: number;
  maxWaitMs: number;
  /** Số lần liên tiếp được phép lỗi mạng trước khi bỏ cuộc. */
  maxNetworkRetries?: number;
  tooLongMessage: string;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
};

function abortError() {
  const error = new Error("Đã hủy.");
  error.name = "AbortError";
  return error;
}

function defaultSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Lỗi do không tới được máy chủ (mất mạng, hết giờ chờ, 502/503/504). Lỗi có lời của nhà/phòng thì không thuộc loại này. */
export function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return false;
  const text = `${error.name} ${error.message}`.toLowerCase();
  return /failed to fetch|networkerror|network request failed|load failed|timeout|timed out|\b50[234]\b|fetch failed|econnreset|không kết nối được/.test(text);
}

export async function pollUntilDone<T>(options: PollLoopOptions<T>): Promise<{ state: "done" } & T> {
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const maxRetries = options.maxNetworkRetries ?? 5;
  const started = now();
  let failures = 0;
  for (;;) {
    await sleep(options.intervalMs, options.signal);
    if (options.signal.aborted) throw abortError();
    try {
      const result = await options.step();
      failures = 0;
      if (result.state === "done") return result;
    } catch (error) {
      if (options.signal.aborted) throw abortError();
      if (!isTransientNetworkError(error)) throw error;
      failures += 1;
      if (failures > maxRetries) throw new Error("Mất kết nối tới phòng quá lâu. Kiểm tra mạng rồi chạy lại.");
    }
    if (now() - started > options.maxWaitMs) throw new Error(options.tooLongMessage);
  }
}
