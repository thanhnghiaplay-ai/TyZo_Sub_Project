/** Gọi lại một việc đọc dữ liệu khi lỗi tạm thời (máy chủ lạnh, cơ sở dữ liệu bận). Hết lượt thì ném lỗi cuối. */
export async function retryLoad<T>(
  job: () => Promise<T>,
  delaysMs: number[] = [1500, 4000],
  wait: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await job();
    } catch (error) {
      last = error;
      if (attempt < delaysMs.length) await wait(delaysMs[attempt]);
    }
  }
  throw last;
}
