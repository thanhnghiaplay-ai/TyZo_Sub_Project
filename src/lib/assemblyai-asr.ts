import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AssemblyaiAsrInput, AssemblyaiAsrResult } from "@/lib/assemblyai-asr.server";

export const assemblyaiAsr = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AssemblyaiAsrInput) => input)
  .handler(async ({ context, data }): Promise<AssemblyaiAsrResult> => {
    const { runAssemblyaiAsr } = await import("@/lib/assemblyai-asr.server");
    return runAssemblyaiAsr(context.userId, data);
  });
