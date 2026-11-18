import { assemblyaiStart, assemblyaiStep } from "@/lib/assemblyai-asr";
import { abortError } from "@/lib/sub/groq";
import type { AaiSentence } from "@/lib/sub/assemblyai";

const POLL_MS = 3_000;
/** Chờ tối đa 3 giờ cho một file; quá thì báo lỗi rõ thay vì hỏi mãi. */
const MAX_WAIT_MS = 3 * 60 * 60 * 1000;

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Gửi link cho AssemblyAI (lệnh ngắn), rồi hỏi lặp từng lệnh ngắn tới khi xong. Không tải file về máy. */
export async function recognizeAssemblyaiUrl(input: {
  url: string;
  language: string;
  model: string;
  key: string;
  ticketId?: string | null;
  signal: AbortSignal;
}): Promise<{ sentences: AaiSentence[]; seconds: number }> {
  if (input.signal.aborted) throw abortError();
  const ticket = input.ticketId ? { ticketId: input.ticketId } : {};
  const { jobId } = await assemblyaiStart({ data: { url: input.url, language: input.language, model: input.model, key: input.key, ...ticket } });
  const started = Date.now();
  for (;;) {
    await pause(POLL_MS, input.signal);
    const step = await assemblyaiStep({ data: { jobId, language: input.language, model: input.model, key: input.key, ...ticket } });
    if (input.signal.aborted) throw abortError();
    if (step.state === "done") return { sentences: step.sentences, seconds: step.seconds };
    if (Date.now() - started > MAX_WAIT_MS) throw new Error("AssemblyAI xử lý quá lâu. Hãy thử file ngắn hơn hoặc chạy lại.");
  }
}
