import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseLiveOpen, type LiveOpenInput } from "@/lib/live/live-open-rules";
import type { LiveOpenResult } from "@/lib/live/live-issue.server";

export type { LiveOpenResult };

/**
 * Cấp vé vào cầu nối Dịch trực tiếp. Cần đăng nhập, tài khoản đang mở, giới hạn tần suất.
 * Vé do máy chủ chính ký, sống 60 giây; tiền chỉ bị giữ khi cầu nối nhận vé và bắt đầu phiên.
 * Luật cấp vé nằm ở live-issue.server.ts, dùng chung với ứng dụng Android.
 */
export const openLiveTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: LiveOpenInput) => parseLiveOpen(input))
  .handler(async ({ context, data }): Promise<LiveOpenResult> => {
    const { issueLiveTicket } = await import("@/lib/live/live-issue.server");
    return issueLiveTicket(context.userId, data);
  });
