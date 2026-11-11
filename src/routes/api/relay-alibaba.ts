import { createFileRoute } from "@tanstack/react-router";
import { ALIBABA_API } from "@/lib/sub/provider";

const ALLOWED = new Set(["/audio/transcriptions", "/chat/completions", "/audio/speech"]);
const BODY_LIMIT: Record<string, number> = {
  "/audio/transcriptions": 25 * 1024 * 1024,
  "/chat/completions": 512 * 1024,
  "/audio/speech": 20 * 1024,
};

function fail(status: number, message: string, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

/** Chuyển key của khách tới Alibaba. Không lưu key, không tính ví. */
export const Route = createFileRoute("/api/relay-alibaba")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
        try {
          assertSameSiteRequest();
        } catch {
          return fail(403, "Yêu cầu từ trang khác bị chặn.");
        }
        const { getSessionUser } = await import("@/lib/auth/verify.server");
        const { requireOpenAccount, takeRate, AccountBlockedError, RateLimitError } = await import("@/lib/guard.server");
        const user = await getSessionUser();
        if (!user) return fail(401, "Cần đăng nhập.");
        const path = request.headers.get("x-alibaba-path") || "";
        if (!ALLOWED.has(path)) return fail(400, "Yêu cầu không được phép.");
        const key = (request.headers.get("x-user-key") || "").trim();
        if (key.length < 20 || key.length > 200 || /\s/.test(key) || key === "room") return fail(400, "Key Alibaba không đúng.");
        try {
          await requireOpenAccount(user.id);
          await takeRate(`relay-alibaba:${user.id}`, 240, 60);
        } catch (error) {
          if (error instanceof AccountBlockedError) return fail(403, error.message);
          if (error instanceof RateLimitError) return fail(429, error.message, { "retry-after": String(error.retryAfter) });
          throw error;
        }
        const limit = BODY_LIMIT[path] ?? 0;
        const declared = Number(request.headers.get("content-length") || 0);
        if (declared > limit) return fail(413, "Nội dung gửi lên quá lớn.");
        const body = await request.arrayBuffer();
        if (body.byteLength > limit) return fail(413, "Nội dung gửi lên quá lớn.");
        const headers = new Headers();
        headers.set("Authorization", `Bearer ${key}`);
        const contentType = request.headers.get("content-type");
        if (contentType) headers.set("Content-Type", contentType);
        const upstream = await fetch(`${ALIBABA_API}${path}`, { method: "POST", headers, body });
        const out = new Headers();
        const type = upstream.headers.get("content-type");
        if (type) out.set("content-type", type);
        const retry = upstream.headers.get("retry-after");
        if (retry) out.set("retry-after", retry);
        return new Response(upstream.body, { status: upstream.status, headers: out });
      },
    },
  },
});
