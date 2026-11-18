import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { SpeechmaticsAsrInput, SpeechmaticsAsrResult } from "@/lib/speechmatics-asr.server";

export const speechmaticsAsr = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SpeechmaticsAsrInput) => input)
  .handler(async ({ context, data }): Promise<SpeechmaticsAsrResult> => {
    const { runSpeechmaticsAsr } = await import("@/lib/speechmatics-asr.server");
    return runSpeechmaticsAsr(context.userId, data);
  });
