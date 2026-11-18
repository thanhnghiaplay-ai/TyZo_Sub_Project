import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { SpeechmaticsAsrInput, SpeechmaticsAsrResult, SpeechmaticsStartResult, SpeechmaticsStepInput, SpeechmaticsStepResult } from "@/lib/speechmatics-asr.server";

export const speechmaticsAsr = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SpeechmaticsAsrInput) => input)
  .handler(async ({ context, data }): Promise<SpeechmaticsAsrResult> => {
    const { runSpeechmaticsAsr } = await import("@/lib/speechmatics-asr.server");
    return runSpeechmaticsAsr(context.userId, data);
  });

export const speechmaticsStart = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SpeechmaticsAsrInput) => input)
  .handler(async ({ context, data }): Promise<SpeechmaticsStartResult> => {
    const { startSpeechmaticsAsr } = await import("@/lib/speechmatics-asr.server");
    return startSpeechmaticsAsr(context.userId, data);
  });

export const speechmaticsStep = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SpeechmaticsStepInput) => input)
  .handler(async ({ context, data }): Promise<SpeechmaticsStepResult> => {
    const { stepSpeechmaticsAsr } = await import("@/lib/speechmatics-asr.server");
    return stepSpeechmaticsAsr(context.userId, data);
  });
