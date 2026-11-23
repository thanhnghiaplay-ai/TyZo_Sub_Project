import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AssemblyaiAsrInput, AssemblyaiStartResult, AssemblyaiStepInput, AssemblyaiStepResult } from "@/lib/assemblyai-asr.server";

export const assemblyaiStart = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AssemblyaiAsrInput) => input)
  .handler(async ({ context, data }): Promise<AssemblyaiStartResult> => {
    const { startAssemblyaiAsr } = await import("@/lib/assemblyai-asr.server");
    return startAssemblyaiAsr(context.userId, data);
  });

export const assemblyaiStep = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AssemblyaiStepInput) => input)
  .handler(async ({ context, data }): Promise<AssemblyaiStepResult> => {
    const { stepAssemblyaiAsr } = await import("@/lib/assemblyai-asr.server");
    return stepAssemblyaiAsr(context.userId, data);
  });
