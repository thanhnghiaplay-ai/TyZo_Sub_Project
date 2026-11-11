import { createFileRoute } from "@tanstack/react-router";
import { ALIBABA_API } from "@/lib/sub/provider";

const ALLOWED = new Set(["/models", "/audio/transcriptions", "/chat/completions", "/audio/speech"]);
const BODY_LIMIT: Record<string, number> = {
  "/audio/transcriptions": 25 * 1024 * 1024,
  "/chat/completions": 512 * 1024,
  "/audio/speech": 20 * 1024,
};
const RATE_PER_MINUTE = 240;

function fail(status: number, message: string, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

export const Route = createFileRoute("/api/room-alibaba")({
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
        const path = request.headers.get("x-alibaba-path") || "";
        if (!ALLOWED.has(path)) return fail(400, "Yêu cầu không được phép.");
        try {
          await requireOpenAccount(user.id);
          await takeRate(`room-alibaba:${user.id}`, RATE_PER_MINUTE, 60);
        } catch (error) {
          if (error instanceof AccountBlockedError) return fail(403, error.message);
          if (error instanceof RateLimitError) return fail(429, error.message, { "retry-after": String(error.retryAfter) });
          throw error;
        }

        const limit = BODY_LIMIT[path] ?? 0;
        let body: ArrayBuffer | undefined;
        if (path !== "/models") {
          const declared = Number(request.headers.get("content-length") || 0);
          if (declared > limit) return fail(413, "Nội dung gửi lên quá lớn.");
          body = await request.arrayBuffer();
          if (body.byteLength > limit) return fail(413, "Nội dung gửi lên quá lớn.");
        }

        const { getSql } = await import("@/lib/db");
        const { parseRunDesk, parseModelList } = await import("@/lib/run-desk");
        const { ALIBABA_ROWS } = await import("@/lib/sub/alibaba-catalog");
        const { loadPriceBook } = await import("@/lib/run-board.server");
        const sql = await getSql();
        const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
        const desk = parseRunDesk(saved[0]?.value);
        if (desk.maintenance) return fail(403, desk.note || "Cửa trả theo lượt đang bảo trì.");
        const keys = await sql<{ value: string }>`select value from room_settings where key = 'alibaba_key'`;
        const key = keys[0]?.value?.trim();
        if (!key) return fail(503, "Phòng chưa lưu key Alibaba.");

        const headers = new Headers();
        headers.set("Authorization", `Bearer ${key}`);
        const contentType = request.headers.get("content-type");
        if (path !== "/models" && contentType) headers.set("Content-Type", contentType);

        if (path === "/models") {
          const upstream = await fetch(`${ALIBABA_API}/models`, { method: "GET", headers });
          return relay(upstream);
        }

        const { readRequest, chargeWith } = await import("@/lib/run-gate");
        const parsed = await readRequest(path, contentType, body!);
        if (!parsed) return fail(400, "Không đọc được model trong yêu cầu.");
        if (parsed.problem) return fail(400, parsed.problem);
        const offered = await sql<{ value: string }>`select value from room_settings where key = 'alibaba_models'`;
        const models = parseModelList(offered[0]?.value);
        if (!models) return fail(503, "Phòng chưa đồng bộ model Alibaba.");
        if (!models.includes(parsed.model)) return fail(403, "Model này không có trong cửa trả theo lượt.");
        const live = await loadPriceBook(sql);
        if (!live) return fail(503, "Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
        const ali = await sql<{ value: string }>`select value from room_settings where key = 'alibaba_desk'`;
        const aliDesk = parseRunDesk(ali[0]?.value);
        const book = { rate: live.rate, rows: ALIBABA_ROWS, desk: { markup: aliDesk.markup, custom: aliDesk.custom } };

        const outcome = await chargeWith({
          sql,
          book,
          path,
          model: parsed.model,
          chars: parsed.chars,
          userId: user.id,
          ticketId: request.headers.get("x-run-ticket") || "",
          body: body!,
          contentType,
          cap: desk.cap,
          send: () => fetch(`${ALIBABA_API}${path}`, { method: "POST", headers, body: body! }),
        });
        if (outcome.kind === "reject") return fail(outcome.status, outcome.message);
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
