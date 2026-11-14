import { createFileRoute } from "@tanstack/react-router";

/**
 * TAB "TẢI VIDEO" — MODULE RỜI (API). Gỡ: xem ghi chú đầu src/routes/tai-video.tsx.
 * Cần đăng nhập, giới hạn tần suất theo tài khoản, chỉ nhận yêu cầu cùng trang.
 */
const RATE_PER_MINUTE = 12;

function json(status: number, body: unknown, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

export const Route = createFileRoute("/api/tai-video")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
        try {
          assertSameSiteRequest();
        } catch {
          return json(403, { error: "Yêu cầu từ trang khác bị chặn." });
        }
        const { getSessionUser } = await import("@/lib/auth/verify.server");
        const { requireOpenAccount, takeRate, AccountBlockedError, RateLimitError } = await import("@/lib/guard.server");
        const user = await getSessionUser();
        if (!user) return json(401, { error: "Cần đăng nhập để dùng mục này." });
        try {
          await requireOpenAccount(user.id);
          await takeRate(`tai-video:${user.id}`, RATE_PER_MINUTE, 60);
        } catch (error) {
          if (error instanceof AccountBlockedError) return json(403, { error: error.message });
          if (error instanceof RateLimitError) return json(429, { error: error.message }, { "retry-after": String(error.retryAfter) });
          throw error;
        }

        let url = "";
        try {
          const body = (await request.json()) as { url?: unknown };
          url = typeof body.url === "string" ? body.url.slice(0, 2048) : "";
        } catch {
          return json(400, { error: "Yêu cầu không hợp lệ." });
        }
        if (!url.trim()) return json(400, { error: "Hãy dán link trang." });

        const { scanPage, ScanError } = await import("@/lib/tai-video.server");
        try {
          return json(200, await scanPage(url));
        } catch (error) {
          if (error instanceof ScanError) return json(error.status, { error: error.message });
          return json(500, { error: "Chưa quét được trang này." });
        }
      },
    },
  },
});
