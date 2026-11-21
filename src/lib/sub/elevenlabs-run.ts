import { elevenlabsAsr } from "@/lib/elevenlabs-asr";
import { abortError } from "@/lib/sub/groq";
import type { ElevenlabsSentence } from "@/lib/sub/elevenlabs";

/** Gửi link cho ElevenLabs và chờ kết quả cả file trong một yêu cầu. Không tải file về máy. */
export async function recognizeElevenlabsUrl(input: {
  url: string;
  language: string;
  model: string;
  key: string;
  ticketId?: string | null;
  signal: AbortSignal;
}): Promise<{ sentences: ElevenlabsSentence[]; seconds: number }> {
  if (input.signal.aborted) throw abortError();
  const result = await elevenlabsAsr({
    data: { url: input.url, language: input.language, model: input.model, key: input.key, ...(input.ticketId ? { ticketId: input.ticketId } : {}) },
  });
  if (input.signal.aborted) throw abortError();
  return result;
}
