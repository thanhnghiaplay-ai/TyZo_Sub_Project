import { deepgramAsr } from "@/lib/deepgram-asr";
import { abortError } from "@/lib/sub/groq";
import type { DgSentence } from "@/lib/sub/deepgram";

/** Gửi link cho Deepgram và chờ kết quả cả file. Không tải file về máy. */
export async function recognizeDeepgramUrl(input: {
  url: string;
  language: string;
  key: string;
  ticketId?: string | null;
  signal: AbortSignal;
}): Promise<{ sentences: DgSentence[]; seconds: number }> {
  if (input.signal.aborted) throw abortError();
  const result = await deepgramAsr({ data: { url: input.url, language: input.language, key: input.key, ...(input.ticketId ? { ticketId: input.ticketId } : {}) } });
  if (input.signal.aborted) throw abortError();
  return result;
}
