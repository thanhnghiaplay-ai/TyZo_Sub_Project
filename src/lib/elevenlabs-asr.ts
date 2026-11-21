import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { ElevenlabsAsrInput, ElevenlabsAsrResult } from "@/lib/elevenlabs-asr.server";

export const elevenlabsAsr = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ElevenlabsAsrInput) => input)
  .handler(async ({ context, data }): Promise<ElevenlabsAsrResult> => {
    const { runElevenlabsAsr } = await import("@/lib/elevenlabs-asr.server");
    return runElevenlabsAsr(context.userId, data);
  });
