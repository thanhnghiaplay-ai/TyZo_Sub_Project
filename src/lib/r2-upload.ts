import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { R2UploadInput, R2UploadResult } from "@/lib/r2-upload.server";

export const r2Upload = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: R2UploadInput) => input)
  .handler(async ({ context, data }): Promise<R2UploadResult> => {
    const { createR2Upload } = await import("@/lib/r2-upload.server");
    return createR2Upload(context.userId, data);
  });

export const r2Remove = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { key: string }) => input)
  .handler(async ({ context, data }): Promise<{ removed: boolean }> => {
    const { removeR2Object } = await import("@/lib/r2-upload.server");
    return removeR2Object(context.userId, data.key);
  });

export const r2Status = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<{ ready: boolean }> => {
    const { r2Ready } = await import("@/lib/r2-upload.server");
    return { ready: r2Ready() };
  });
