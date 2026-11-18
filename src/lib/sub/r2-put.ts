/** Tải một Blob lên link PUT đã ký, tự thử lại khi mạng chập chờn. Phần gửi được truyền vào nên test bằng bản giả. */

export type PutOutcome = { status: number };
export type PutSend = (onProgress: (sent: number, total: number) => void) => Promise<PutOutcome>;

export function putFailedText(status: number): string {
  if (status === 0) return "Không tải âm thanh lên kho tạm được. Kiểm tra mạng rồi thử lại.";
  if (status === 403) return "Link tải lên đã hết hạn hoặc bị từ chối. Hãy bấm chạy lại.";
  return `Kho tạm trả lỗi ${status} khi tải âm thanh lên.`;
}

export async function putWithRetry(
  send: PutSend,
  options: { retries?: number; waitMs?: (attempt: number) => number; signal?: AbortSignal; onProgress?: (sent: number, total: number) => void; sleep?: (ms: number) => Promise<void> } = {},
): Promise<void> {
  const retries = options.retries ?? 2;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let last = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (options.signal?.aborted) {
      const abort = new Error("Đã hủy.");
      abort.name = "AbortError";
      throw abort;
    }
    let outcome: PutOutcome;
    try {
      outcome = await send(options.onProgress ?? (() => {}));
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") throw error;
      outcome = { status: 0 };
    }
    if (outcome.status >= 200 && outcome.status < 300) return;
    last = outcome.status;
    // 4xx (trừ 408/429) là lỗi thật, thử lại không giúp gì.
    if (last >= 400 && last < 500 && last !== 408 && last !== 429) break;
    if (attempt < retries) await sleep(options.waitMs ? options.waitMs(attempt) : 1500 * (attempt + 1));
  }
  throw new Error(putFailedText(last));
}

/** Bản chạy ở trình duyệt: XMLHttpRequest vì fetch chưa có tiến độ tải lên. */
export function xhrPutSend(url: string, blob: Blob, contentType: string, signal?: AbortSignal): PutSend {
  return (onProgress) =>
    new Promise<PutOutcome>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const abort = () => xhr.abort();
      signal?.addEventListener("abort", abort, { once: true });
      xhr.open("PUT", url);
      xhr.setRequestHeader("content-type", contentType);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded, event.total);
      };
      xhr.onload = () => {
        signal?.removeEventListener("abort", abort);
        resolve({ status: xhr.status });
      };
      xhr.onerror = () => {
        signal?.removeEventListener("abort", abort);
        resolve({ status: 0 });
      };
      xhr.onabort = () => {
        signal?.removeEventListener("abort", abort);
        const error = new Error("Đã hủy.");
        error.name = "AbortError";
        reject(error);
      };
      xhr.send(blob);
    });
}
