import { aliFiletrans } from "@/lib/ali-filetrans";
import { sleep } from "@/lib/sub/groq";
import type { AliSentence } from "@/lib/sub/ali-filetrans";

const WAIT_MS = 3_000;
const LIMIT_MS = 30 * 60 * 1000;

/** Gửi link, rồi hỏi đến khi có câu. Không tải file về máy. */
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
  const deadline = Date.now() + LIMIT_MS;
  for (;;) {
    if (Date.now() > deadline) throw new Error("Nhận dạng quá lâu. Hãy thử lại.");
    const status = await aliFiletrans({ data: { op: "status", taskId: queued.taskId, key: input.key, ticketId } });
    if (status.state === "done") return { sentences: status.sentences, seconds: status.seconds };
    input.onWait?.("Đang nhận dạng cả file…");
    await sleep(WAIT_MS, input.signal);
  }
}
