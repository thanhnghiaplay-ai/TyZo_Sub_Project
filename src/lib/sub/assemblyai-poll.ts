import { assemblyaiErrorText, assemblyaiId, assemblyaiStatus, type AssemblyaiSubmit } from "./assemblyai.ts";

/**
 * Vòng gửi rồi hỏi của AssemblyAI, tách khỏi máy chủ để test được bằng yêu cầu giả (không gọi mạng thật).
 * `request` do máy chủ cấp (gắn key và địa chỉ), ở đây chỉ lo thứ tự gọi, nhịp hỏi và hạn chót.
 */
export type AaiRequest = (path: string, init?: { method: "GET" | "POST" | "DELETE"; body?: string }) => Promise<{ status: number; payload: unknown }>;

export type AaiJobOptions = {
  request: AaiRequest;
  body: AssemblyaiSubmit;
  /** Tổng thời gian chờ tối đa (mili giây) tính từ lúc gửi. */
  deadlineMs: number;
  /** Nhịp hỏi. AssemblyAI cho tối đa 60 lần GET mỗi phút mỗi bản, nên không nhanh hơn 1 giây. */
  intervalMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const SLEEP = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Gửi, hỏi tới khi xong, rồi xóa bản phiên âm ở phía AssemblyAI (không giữ dữ liệu khách). Trả bản phiên âm đã xong. */
export async function runAssemblyaiJob(options: AaiJobOptions): Promise<unknown> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? SLEEP;
  const interval = Math.max(1000, options.intervalMs);
  const started = now();
  const first = await options.request("/transcript", { method: "POST", body: JSON.stringify(options.body) });
  if (first.status < 200 || first.status >= 300) throw new Error(assemblyaiErrorText(first.status, first.payload));
  const id = assemblyaiId(first.payload);
  if (!id || !/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw new Error("AssemblyAI không trả mã bản phiên âm. Hãy chạy lại.");
  let result: unknown = null;
  let failure: Error | null = null;
  try {
    let payload = first.payload;
    for (;;) {
      const status = assemblyaiStatus(payload);
      if (status === "completed") {
        result = payload;
        break;
      }
      if (status === "error") {
        failure = new Error(assemblyaiErrorText(400, payload));
        break;
      }
      if (now() - started >= options.deadlineMs) {
        failure = new Error("AssemblyAI xử lý quá lâu. Hãy thử file ngắn hơn hoặc chạy lại.");
        break;
      }
      await sleep(interval);
      const next = await options.request(`/transcript/${id}`, { method: "GET" });
      if (next.status < 200 || next.status >= 300) {
        failure = new Error(assemblyaiErrorText(next.status, next.payload));
        break;
      }
      payload = next.payload;
    }
  } finally {
    // Xóa dữ liệu phiên âm ở AssemblyAI; lỗi xóa không làm hỏng kết quả.
    await options.request(`/transcript/${id}`, { method: "DELETE" }).catch(() => null);
  }
  if (failure) throw failure;
  return result;
}

/** Tách vòng thành hai lệnh ngắn để mỗi lần gọi máy chủ chỉ chạy vài giây (không chạm hạn chạy của hàm). */
export async function startAssemblyaiJob(request: AaiRequest, body: AssemblyaiSubmit): Promise<string> {
  const first = await request("/transcript", { method: "POST", body: JSON.stringify(body) });
  if (first.status < 200 || first.status >= 300) throw new Error(assemblyaiErrorText(first.status, first.payload));
  const id = assemblyaiId(first.payload);
  if (!id || !/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw new Error("AssemblyAI không trả mã bản phiên âm. Hãy chạy lại.");
  return id;
}

export type AaiStep = { state: "running" } | { state: "done"; payload: unknown };

/** Hỏi một lần. Xong hoặc lỗi thì xóa bản phiên âm ở AssemblyAI; lỗi thì ném câu tiếng Việt. */
export async function stepAssemblyaiJob(request: AaiRequest, id: string): Promise<AaiStep> {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw new Error("Mã bản phiên âm không hợp lệ.");
  const next = await request(`/transcript/${id}`, { method: "GET" });
  if (next.status < 200 || next.status >= 300) {
    await request(`/transcript/${id}`, { method: "DELETE" }).catch(() => null);
    throw new Error(assemblyaiErrorText(next.status, next.payload));
  }
  const status = assemblyaiStatus(next.payload);
  if (status === "completed") {
    await request(`/transcript/${id}`, { method: "DELETE" }).catch(() => null);
    return { state: "done", payload: next.payload };
  }
  if (status === "error") {
    await request(`/transcript/${id}`, { method: "DELETE" }).catch(() => null);
    throw new Error(assemblyaiErrorText(400, next.payload));
  }
  return { state: "running" };
}
