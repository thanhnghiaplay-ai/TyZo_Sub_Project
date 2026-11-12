/** Lỗi khi một lần gọi quá hạn chờ. Được tính như lỗi tạm thời để thử lại. */
export class LoadTimeoutError extends Error {
  constructor(ms: number) {
    super(`Máy chủ chưa trả lời sau ${Math.round(ms / 1000)} giây.`);
    this.name = "LoadTimeoutError";
  }
}

function withTimeout<T>(job: () => Promise<T>, ms: number): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return job();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new LoadTimeoutError(ms)), ms);
    job().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Gọi lại một việc đọc dữ liệu khi lỗi tạm thời (máy chủ lạnh, cơ sở dữ liệu bận). Hết lượt thì ném lỗi cuối.
 * Mỗi lần gọi có hạn chờ `timeoutMs`: máy chủ không trả lời hẳn (treo, không báo lỗi) cũng bị tính là lỗi
 * để thử lại, không để trang đứng chờ mãi. Lần thử sau thường rơi vào instance đã nóng nên nhanh hơn.
 */
export async function retryLoad<T>(
  job: () => Promise<T>,
  delaysMs: number[] = [1500, 4000],
  wait: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
  timeoutMs: number = 8000,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await withTimeout(job, timeoutMs);
    } catch (error) {
      last = error;
      if (attempt < delaysMs.length) await wait(delaysMs[attempt]);
    }
  }
  throw last;
}
