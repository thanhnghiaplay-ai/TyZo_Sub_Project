import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { DeepgramAsrInput, DeepgramAsrResult } from "@/lib/deepgram-asr.server";

export const deepgramAsr = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: DeepgramAsrInput) => input)
  .handler(async ({ context, data }): Promise<DeepgramAsrResult> => {
    const { runDeepgramAsr } = await import("@/lib/deepgram-asr.server");
    return runDeepgramAsr(context.userId, data);
  });
