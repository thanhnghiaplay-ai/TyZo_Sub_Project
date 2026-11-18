import { sonioxAsr } from "@/lib/soniox-asr";
import { abortError } from "@/lib/sub/groq";
import type { SonioxSentence } from "@/lib/sub/soniox";

/** Gửi link cho Soniox và chờ kết quả cả file. Không tải file về máy. */
export async function recognizeSonioxUrl(input: {
  url: string;
  language: string;
  model: string;
  key: string;
  ticketId?: string | null;
  signal: AbortSignal;
}): Promise<{ sentences: SonioxSentence[]; seconds: number }> {
  if (input.signal.aborted) throw abortError();
  const result = await sonioxAsr({
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
