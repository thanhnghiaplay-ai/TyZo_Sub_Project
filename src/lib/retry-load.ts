/** Gọi lại một việc đọc dữ liệu khi lỗi tạm thời (máy chủ lạnh, cơ sở dữ liệu bận). Hết lượt thì ném lỗi cuối. */
export async function retryLoad<T>(
  job: () => Promise<T>,
  delaysMs: number[] = [1500, 4000],
  wait: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
  again: (error: unknown) => boolean = () => true,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await job();
    } catch (error) {
      last = error;
      if (!again(error) || attempt >= delaysMs.length) throw error;
      await wait(delaysMs[attempt]);
    }
  }
  throw last;
}

/** Cắt việc quá hạn để trang không đứng im khi máy chủ bị cắt. */
export function withDeadline<T>(job: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Máy chủ chưa trả lời.")), ms);
    job.then(
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

/** Mở trang quản lý: thử lại khi máy chủ lạnh, không thử lại khi chưa đăng nhập. */
export function openAdminPlace<T>(job: () => Promise<T>): Promise<T> {
  return retryLoad(
    () => withDeadline(job(), 8000),
    [1000, 2000, 3000, 4000],
    (ms) => new Promise((done) => setTimeout(done, ms)),
    (error) => !(error instanceof Error && error.message === "Unauthorized"),
  );
}
