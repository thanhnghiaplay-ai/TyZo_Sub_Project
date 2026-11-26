/** Groq: nhận dạng Whisper theo từng đoạn. Dịch Groq nằm ở `@/lib/sub/groq` (chatCall). */
import { transcribeGroq } from "@/lib/sub/groq";
import type { ChunkAsr } from "./types";

export const groqAsr: ChunkAsr = {
  id: "groq",
  intake: "chunks",
  turnOnly: false,
  parallel: null,
  transcribe: (input) =>
    transcribeGroq(input.packed, input.key, input.language, input.prompt, input.model, input.signal, input.gate, input.onWait, input.ticket),
};
