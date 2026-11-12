import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { AliFiletransInput, AliFiletransResult } from "@/lib/ali-filetrans.server";

export const aliFiletrans = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AliFiletransInput) => input)
  .handler(async ({ context, data }): Promise<AliFiletransResult> => {
    const { runAliFiletrans } = await import("@/lib/ali-filetrans.server");
    return runAliFiletrans(context.userId, data);
  });
