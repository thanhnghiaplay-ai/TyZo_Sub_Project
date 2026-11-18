import { assemblyaiAsr } from "@/lib/assemblyai-asr";
import { abortError } from "@/lib/sub/groq";
import type { AaiSentence } from "@/lib/sub/assemblyai";

/** Gửi link cho AssemblyAI và chờ kết quả cả file. Không tải file về máy. */
export async function recognizeAssemblyaiUrl(input: {
  url: string;
  language: string;
  model: string;
  key: string;
  ticketId?: string | null;
  signal: AbortSignal;
}): Promise<{ sentences: AaiSentence[]; seconds: number }> {
  if (input.signal.aborted) throw abortError();
  const result = await assemblyaiAsr({
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
