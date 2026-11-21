import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseTally } from "@/lib/usage-tally";

/**
 * Cộng một vào số đếm ẩn danh. Cần đăng nhập để chặn gọi bừa từ ngoài, nhưng KHÔNG ghi tài khoản:
 * chỉ cộng vào ô (ngày, chủ đề, lựa chọn). Lựa chọn lạ thì bỏ qua, không báo lỗi cho khách.
 */
export const recordTally = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseTally(input))
  .handler(async ({ data }) => {
    if (!data) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const { tallyWith } = await import("@/lib/usage-tally");
    await tallyWith(await getSql(), data);
    return { ok: true };
  });
