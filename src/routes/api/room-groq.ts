import { createFileRoute } from "@tanstack/react-router";

const ALLOWED = new Set(["/models", "/audio/transcriptions", "/chat/completions", "/audio/speech"]);

/** Số yêu cầu tối đa mỗi phút cho một tài khoản. */
const RATE_PER_MINUTE = 240;
/**
 * Tổng thời gian chờ Groq cho một yêu cầu, tính cả lúc đọc hết phần thân. Ngắn hơn hạn 120 giây của trình duyệt
 * để khách nhận lỗi 504 rõ ràng và tự thử lại, thay vì treo tới khi máy chủ bị cắt. Phần thân đứng giữa chừng
 * thì lần đọc trong `chargeWith` cũng bị cắt theo, nên chưa tính tiền.
 */
const UPSTREAM_TIMEOUT_MS = 100_000;
const TIMEOUT_TEXT = "Groq không trả lời xong kịp. Phần này chưa tính tiền, hãy thử lại.";

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function fail(status: number, message: string, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    // x-tyzo-room: lỗi do chính phòng tạo, đã viết cho khách (groq.ts hiện nguyên câu).
    headers: { "content-type": "application/json; charset=utf-8", "x-tyzo-room": "1", ...extra },
  });
}

export const Route = createFileRoute("/api/room-groq")({
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
        if (!user) return fail(401, "Cần đăng nhập để dùng cửa trả theo lượt.");
        const path = request.headers.get("x-groq-path") || "";
        if (!ALLOWED.has(path)) return fail(400, "Yêu cầu không được phép.");
        try {
          await requireOpenAccount(user.id);
          await takeRate(`room-groq:${user.id}`, RATE_PER_MINUTE, 60);
        } catch (error) {
          if (error instanceof AccountBlockedError) return fail(403, error.message);
          if (error instanceof RateLimitError) return fail(429, error.message, { "retry-after": String(error.retryAfter) });
          throw error;
        }

        const { GROQ_BODY_LIMITS, readRequestBytes, requestBodyFailure } = await import("@/lib/request-body.server");
        const limit = GROQ_BODY_LIMITS[path] ?? 0;
        let body: ArrayBuffer | undefined;
        if (path !== "/models") {
          try { body = await readRequestBytes(request, limit); }
          catch (error) {
            const rejected = requestBodyFailure(error);
            if (rejected) return rejected;
            throw error;
          }
        }

        const { getSql } = await import("@/lib/db");
        const { parseRunDesk, parseModelList } = await import("@/lib/run-desk");
        const sql = await getSql();
        const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
        const desk = parseRunDesk(saved[0]?.value);
        if (desk.maintenance) return fail(403, desk.note || "Cửa trả theo lượt đang bảo trì.");
        const keys = await sql<{ value: string }>`select value from room_settings where key = 'run_key'`;
        const key = keys[0]?.value?.trim();
        if (!key) return fail(503, "Trả theo lượt đang tạm đóng. Vui lòng quay lại sau, hoặc chọn «Dùng key AI của tôi».");

        const headers = new Headers();
        headers.set("Authorization", `Bearer ${key}`);
        const contentType = request.headers.get("content-type");
        if (path !== "/models" && contentType) headers.set("Content-Type", contentType);

        // Danh sách model là việc của /models, không tính tiền, không cần phiếu.
        if (path === "/models") {
          try {
            const upstream = await fetch("https://api.groq.com/openai/v1/models", {
              method: "GET",
              headers,
              signal: AbortSignal.any([request.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]),
            });
            return relay(upstream);
          } catch (error) {
            if (isTimeout(error)) return fail(504, TIMEOUT_TEXT);
            throw error;
          }
        }

        const { readRequest, chargeAdmittedWith: chargeWith } = await import("@/lib/billing/run-gate");
        const { loadPriceBook } = await import("@/lib/run-board.server");
        // RE-005: chuẩn hóa giới hạn token trả lời (Groq: max_completion_tokens); gửi Groq đúng thân đã chuẩn hóa.
        const parsed = await readRequest(path, contentType, body!, "max_completion_tokens");
        if (!parsed) return fail(400, "Không đọc được model trong yêu cầu.");
        if (parsed.problem) return fail(400, parsed.problem);
        const offered = await sql<{ value: string }>`select value from room_settings where key = 'run_models'`;
        const models = parseModelList(offered[0]?.value);
        if (!models) return fail(503, "Phòng chưa đồng bộ danh sách model.");
        if (!models.includes(parsed.model)) return fail(403, `Model ${parsed.model} không có trong cửa trả theo lượt (key phòng chưa có model này).`);
        const book = await loadPriceBook(sql);
        if (!book) return fail(503, "Chưa có bảng giá để tính tiền. Hãy thử lại sau.");

        let outcome: Awaited<ReturnType<typeof chargeWith>>;
        try {
          outcome = await chargeWith({
            sql,
            book,
            provider: "groq",
            path,
            model: parsed.model,
            chars: parsed.chars,
            userId: user.id,
            ticketId: request.headers.get("x-run-ticket") || "",
            body: body!,
            cap: desk.cap,
            outCap: parsed.cap,
            contentType,
            signal: request.signal,
            send: () =>
              fetch(`https://api.groq.com/openai/v1${path}`, { method: "POST", headers, body: parsed.body ?? body!, signal: AbortSignal.any([request.signal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)]) }),
          });
        } catch (error) {
          if (isTimeout(error)) return fail(504, TIMEOUT_TEXT);
          throw error;
        }
        if (outcome.kind === "reject") {
            const rejected = fail(outcome.status, outcome.message);
            if (outcome.status === 429) {
              rejected.headers.set("retry-after", String(outcome.retryAfter ?? 2));
              // RE2-004: khách đang trong hàng chờ công bằng; app thử lại đúng nhịp để giữ chỗ.
              if (outcome.queuePosition) rejected.headers.set("x-queue-position", String(outcome.queuePosition));
            }
            return rejected;
          }
        return relay(outcome.response);
      },
    },
  },
});

function relay(upstream: Response) {
  const out = new Headers();
  const type = upstream.headers.get("content-type");
  if (type) out.set("content-type", type);
  const retry = upstream.headers.get("retry-after");
  if (retry) out.set("retry-after", retry);
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
