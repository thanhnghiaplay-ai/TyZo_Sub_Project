import { aliFiletrans } from "@/lib/ali-filetrans";
import { pollUntilDone } from "@/lib/sub/poll-loop";
import type { AliSentence } from "@/lib/sub/ali-filetrans";

const WAIT_MS = 3_000;
/** Chờ tối đa 3 giờ cho một file (trước đây 30 phút, không đủ cho phim dài). */
const LIMIT_MS = 3 * 60 * 60 * 1000;

/** Gửi link, rồi hỏi đến khi có câu. Lỗi mạng thoáng qua được thử lại. Không tải file về máy. */
export async function recognizeFileUrl(input: {
  url: string;
  language: string;
  key: string;
  ticketId?: string | null;
  signal: AbortSignal;
  onWait?: (message: string) => void;
}): Promise<{ sentences: AliSentence[]; seconds: number }> {
  const ticketId = input.ticketId || undefined;
  const queued = await aliFiletrans({ data: { op: "submit", url: input.url, language: input.language, key: input.key, ticketId } });
  if (queued.state !== "queued") throw new Error("Không gửi được link nhận dạng.");
  const out = await pollUntilDone<{ sentences: AliSentence[]; seconds: number }>({
    step: async () => {
      const status = await aliFiletrans({ data: { op: "status", taskId: queued.taskId, key: input.key, ticketId } });
      if (status.state === "done") return { state: "done", sentences: status.sentences, seconds: status.seconds };
      input.onWait?.("Đang nhận dạng cả file…");
      return { state: "running" };
    },
    signal: input.signal,
    intervalMs: WAIT_MS,
    maxWaitMs: LIMIT_MS,
    tooLongMessage: "Nhận dạng quá lâu. Hãy thử lại.",
  });
  return { sentences: out.sentences, seconds: out.seconds };
}
