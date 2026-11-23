import { sonioxErrorText, sonioxId, sonioxStatus, type SonioxBody } from "./soniox.ts";

/**
 * Vòng gửi rồi hỏi của Soniox, tách khỏi máy chủ để test được bằng yêu cầu giả (không gọi mạng thật).
 * `request` do máy chủ cấp (gắn key và địa chỉ, dựng JSON cho POST), ở đây chỉ lo thứ tự gọi, nhịp hỏi và hạn chót.
 */
export type SonioxRequest = (
  path: string,
  init?: { method: "GET" | "POST" | "DELETE"; body?: SonioxBody },
) => Promise<{ status: number; payload: unknown }>;

type SonioxJobOptions = {
  request: SonioxRequest;
  body: SonioxBody;
  /** Tổng thời gian chờ tối đa (mili giây) tính từ lúc gửi. */
  deadlineMs: number;
  /** Nhịp hỏi trạng thái. Không nhanh hơn 1 giây. */
  intervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const SLEEP = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Gửi, hỏi tới khi completed, lấy transcript, rồi xóa bản phiên âm ở phía Soniox (không giữ dữ liệu khách).
 * Trả transcript kèm `audio_duration_ms` lấy từ lần hỏi trạng thái cuối (endpoint transcript không có số này).
 * Bản phiên âm lỗi hoặc quá hạn thì ném lỗi tiếng Việt, và vẫn xóa.
 */
export async function runSonioxJob(options: SonioxJobOptions): Promise<unknown> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? SLEEP;
  const interval = Math.max(1000, options.intervalMs);
  const started = now();
  const first = await options.request("/transcriptions", { method: "POST", body: options.body });
  if (first.status < 200 || first.status >= 300) throw new Error(sonioxErrorText(first.status, first.payload));
  const id = sonioxId(first.payload);
  if (!id || !/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw new Error("Soniox không trả mã bản phiên âm. Hãy chạy lại.");
  let result: unknown = null;
  let failure: Error | null = null;
  try {
    for (;;) {
      if (now() - started >= options.deadlineMs) {
        failure = new Error("Soniox xử lý quá lâu. Hãy thử file ngắn hơn hoặc chạy lại.");
        break;
      }
      await sleep(interval);
      const next = await options.request(`/transcriptions/${id}`, { method: "GET" });
      if (next.status < 200 || next.status >= 300) {
        failure = new Error(sonioxErrorText(next.status, next.payload));
        break;
      }
      const status = sonioxStatus(next.payload);
      if (status === "queued" || status === "processing" || status === "unknown") continue;
      if (status === "completed") {
        const transcript = await options.request(`/transcriptions/${id}/transcript`, { method: "GET" });
        if (transcript.status < 200 || transcript.status >= 300) {
          failure = new Error(sonioxErrorText(transcript.status, transcript.payload));
        } else {
          const duration = (next.payload as { audio_duration_ms?: unknown } | null)?.audio_duration_ms;
          result = { ...(transcript.payload && typeof transcript.payload === "object" ? (transcript.payload as object) : {}), audio_duration_ms: duration };
        }
        break;
      }
      // error: bản phiên âm không cho ra kết quả.
      failure = new Error(sonioxErrorText(400, next.payload));
      break;
    }
  } finally {
    // Xóa bản phiên âm (kể cả đang chạy) ở Soniox; lỗi xóa không làm hỏng kết quả.
    await options.request(`/transcriptions/${id}`, { method: "DELETE" }).catch(() => null);
  }
  if (failure) throw failure;
  return result;
}

/** Tách vòng thành hai lệnh ngắn để mỗi lần gọi máy chủ chỉ chạy vài giây (không chạm hạn chạy của hàm). */
export async function startSonioxJob(request: SonioxRequest, body: SonioxBody): Promise<string> {
  const first = await request("/transcriptions", { method: "POST", body });
  if (first.status < 200 || first.status >= 300) throw new Error(sonioxErrorText(first.status, first.payload));
  const id = sonioxId(first.payload);
  if (!id || !/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw new Error("Soniox không trả mã bản phiên âm. Hãy chạy lại.");
  return id;
}

type SonioxStep = { state: "running" } | { state: "done"; payload: unknown };

/** Hỏi một lần. Completed thì lấy transcript (gộp audio_duration_ms của lần hỏi này) rồi xóa; lỗi thì xóa rồi ném lỗi tiếng Việt. */
export async function stepSonioxJob(request: SonioxRequest, id: string): Promise<SonioxStep> {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw new Error("Mã bản phiên âm không hợp lệ.");
  const drop = () => request(`/transcriptions/${id}`, { method: "DELETE" }).catch(() => null);
  const next = await request(`/transcriptions/${id}`, { method: "GET" });
  if (next.status < 200 || next.status >= 300) {
    await drop();
    throw new Error(sonioxErrorText(next.status, next.payload));
  }
  const status = sonioxStatus(next.payload);
  if (status === "queued" || status === "processing" || status === "unknown") return { state: "running" };
  if (status === "completed") {
    const transcript = await request(`/transcriptions/${id}/transcript`, { method: "GET" });
    if (transcript.status < 200 || transcript.status >= 300) {
      await drop();
      throw new Error(sonioxErrorText(transcript.status, transcript.payload));
    }
    await drop();
    const duration = (next.payload as { audio_duration_ms?: unknown } | null)?.audio_duration_ms;
    return {
      state: "done",
      payload: { ...(transcript.payload && typeof transcript.payload === "object" ? (transcript.payload as object) : {}), audio_duration_ms: duration },
    };
  }
  await drop();
  throw new Error(sonioxErrorText(400, next.payload));
}
