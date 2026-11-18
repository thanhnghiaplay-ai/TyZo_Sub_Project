import { speechmaticsAsr } from "@/lib/speechmatics-asr";
import { abortError } from "@/lib/sub/groq";
import type { SmSentence } from "@/lib/sub/speechmatics";

/** Gửi link cho Speechmatics và chờ kết quả cả file. Không tải file về máy. */
export async function recognizeSpeechmaticsUrl(input: {
  url: string;
  language: string;
  model: string;
  key: string;
  ticketId?: string | null;
  signal: AbortSignal;
}): Promise<{ sentences: SmSentence[]; seconds: number }> {
  if (input.signal.aborted) throw abortError();
  const result = await speechmaticsAsr({
    data: {
      url: input.url,
      language: input.language,
      model: input.model,
      key: input.key,
      ...(input.ticketId ? { ticketId: input.ticketId } : {}),
    },
  });
  if (input.signal.aborted) throw abortError();
  return result;
}
