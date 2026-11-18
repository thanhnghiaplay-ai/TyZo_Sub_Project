import { assemblyaiStart, assemblyaiStep } from "@/lib/assemblyai-asr";
import { abortError } from "@/lib/sub/groq";
import { pollUntilDone } from "@/lib/sub/poll-loop";
import type { AaiSentence } from "@/lib/sub/assemblyai";

const POLL_MS = 3_000;
/** Chờ tối đa 3 giờ cho một file; quá thì báo lỗi rõ thay vì hỏi mãi. */
const MAX_WAIT_MS = 3 * 60 * 60 * 1000;

/** Gửi link cho AssemblyAI (lệnh ngắn), rồi hỏi lặp từng lệnh ngắn tới khi xong. Lỗi mạng thoáng qua được thử lại. Không tải file về máy. */
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
  const out = await pollUntilDone({
    step: () => assemblyaiStep({ data: { jobId, language: input.language, model: input.model, key: input.key, ...ticket } }),
    signal: input.signal,
    intervalMs: POLL_MS,
    maxWaitMs: MAX_WAIT_MS,
    tooLongMessage: "AssemblyAI xử lý quá lâu. Hãy thử file ngắn hơn hoặc chạy lại.",
  });
  return { sentences: out.sentences, seconds: out.seconds };
}
