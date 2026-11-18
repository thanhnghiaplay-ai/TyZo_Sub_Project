import { speechmaticsErrorText, speechmaticsId, speechmaticsStatus, type SpeechmaticsConfig } from "./speechmatics.ts";

/**
 * Vòng gửi rồi hỏi của Speechmatics, tách khỏi máy chủ để test được bằng yêu cầu giả (không gọi mạng thật).
 * `request` do máy chủ cấp (gắn key và địa chỉ vùng, dựng multipart cho POST), ở đây chỉ lo thứ tự gọi, nhịp hỏi và hạn chót.
 * Với POST, `config` là đối tượng cấu hình; máy chủ gói nó thành trường `config` (JSON) của multipart.
 */
export type SmRequest = (
  path: string,
  init?: { method: "GET" | "POST" | "DELETE"; config?: SpeechmaticsConfig },
) => Promise<{ status: number; payload: unknown }>;

export type SmJobOptions = {
  request: SmRequest;
  config: SpeechmaticsConfig;
  /** Tổng thời gian chờ tối đa (mili giây) tính từ lúc gửi. */
  deadlineMs: number;
  /** Nhịp hỏi trạng thái job. Không nhanh hơn 1 giây. */
  intervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const SLEEP = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Gửi job, hỏi tới khi done, lấy transcript json-v2, rồi xóa job ở phía Speechmatics (không giữ dữ liệu khách).
 * Trả transcript. Job bị từ chối hoặc quá hạn thì ném lỗi tiếng Việt, và vẫn xóa job.
 */
export async function runSpeechmaticsJob(options: SmJobOptions): Promise<unknown> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? SLEEP;
  const interval = Math.max(1000, options.intervalMs);
  const started = now();
  const first = await options.request("/jobs", { method: "POST", config: options.config });
  if (first.status < 200 || first.status >= 300) throw new Error(speechmaticsErrorText(first.status, first.payload));
  const id = speechmaticsId(first.payload);
  if (!id || !/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw new Error("Speechmatics không trả mã job. Hãy chạy lại.");
  let result: unknown = null;
  let failure: Error | null = null;
  try {
    for (;;) {
      if (now() - started >= options.deadlineMs) {
        failure = new Error("Speechmatics xử lý quá lâu. Hãy thử file ngắn hơn hoặc chạy lại.");
        break;
      }
      await sleep(interval);
      const next = await options.request(`/jobs/${id}`, { method: "GET" });
      if (next.status < 200 || next.status >= 300) {
        failure = new Error(speechmaticsErrorText(next.status, next.payload));
        break;
      }
      const status = speechmaticsStatus(next.payload);
      if (status === "running" || status === "unknown") continue;
      if (status === "done") {
        const transcript = await options.request(`/jobs/${id}/transcript?format=json-v2`, { method: "GET" });
        if (transcript.status < 200 || transcript.status >= 300) failure = new Error(speechmaticsErrorText(transcript.status, transcript.payload));
        else result = transcript.payload;
        break;
      }
      // rejected, deleted, expired: job không cho ra kết quả.
      failure = new Error(speechmaticsErrorText(400, next.payload));
      break;
    }
  } finally {
    // Xóa job (kể cả đang chạy) ở Speechmatics; lỗi xóa không làm hỏng kết quả.
    await options.request(`/jobs/${id}?force=true`, { method: "DELETE" }).catch(() => null);
  }
  if (failure) throw failure;
  return result;
}
