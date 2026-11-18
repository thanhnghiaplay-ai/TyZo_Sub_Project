import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { SonioxAsrInput, SonioxAsrResult } from "@/lib/soniox-asr.server";

export const sonioxAsr = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: SonioxAsrInput) => input)
  .handler(async ({ context, data }): Promise<SonioxAsrResult> => {
    const { runSonioxAsr } = await import("@/lib/soniox-asr.server");
    return runSonioxAsr(context.userId, data);
  });
