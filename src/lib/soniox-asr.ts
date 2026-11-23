import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { SonioxAsrInput, SonioxStartResult, SonioxStepInput, SonioxStepResult } from "@/lib/soniox-asr.server";

export const sonioxStart = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SonioxAsrInput) => input)
  .handler(async ({ context, data }): Promise<SonioxStartResult> => {
    const { startSonioxAsr } = await import("@/lib/soniox-asr.server");
    return startSonioxAsr(context.userId, data);
  });

export const sonioxStep = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SonioxStepInput) => input)
  .handler(async ({ context, data }): Promise<SonioxStepResult> => {
    const { stepSonioxAsr } = await import("@/lib/soniox-asr.server");
    return stepSonioxAsr(context.userId, data);
  });
