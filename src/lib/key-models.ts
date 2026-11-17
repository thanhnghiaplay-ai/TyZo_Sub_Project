import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isProviderId, type ProviderId } from "@/lib/sub/provider";

/**
 * Hỏi danh sách model của key KHÁCH qua máy chủ (trình duyệt gọi thẳng thường bị CORS chặn).
 * Key chỉ đi qua, KHÔNG lưu, KHÔNG ghi nhật ký. Địa chỉ gọi cố định theo nhà (không nhận địa chỉ từ khách).
 */
export const listKeyModels = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider: ProviderId; key: string }) => {
    const provider = typeof input?.provider === "string" ? input.provider : "";
    if (!isProviderId(provider)) throw new Error("Nhà cung cấp không đúng.");
    const key = input?.key?.trim() ?? "";
    if (key.length < 20 || key.length > 200 || /\s/.test(key)) throw new Error("Key không đúng.");
    return { provider, key };
  })
  .handler(async ({ data }): Promise<string[]> => {
    const { listModelIds } = await import("@/lib/sub/groq");
    return listModelIds(data.key, undefined, data.provider);
  });
