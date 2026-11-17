import { createFileRoute } from "@tanstack/react-router";
import { auraErrorText, auraSpeakUrl, isAuraModel } from "@/lib/sub/aura";
import { authHeader } from "@/lib/sub/provider";

/** Chỉ đọc giọng. Nhận dạng Deepgram chưa chạy ở cửa trả theo lượt. */
const ALLOWED = new Set(["/audio/speech"]);
const BODY_LIMIT = 20 * 1024;
const RATE_PER_MINUTE = 240;
const UPSTREAM_TIMEOUT_MS = 60_000;

function fail(status: number, message: string, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

/**
 * Cửa trả theo lượt cho giọng đọc Deepgram Aura, giống giọng Orpheus: khách gửi `{model, input}`,
 * máy chủ dùng key Deepgram của phòng và trừ Token dịch theo số ký tự (chargeWith, đường /audio/speech).
 * Đoạn Deepgram trả lỗi thì không mất tiền.
 */
export const Route = createFileRoute("/api/room-deepgram")({
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
        const path = request.headers.get("x-deepgram-path") || "";
        if (!ALLOWED.has(path)) return fail(400, "Yêu cầu không được phép.");
        try {
          await requireOpenAccount(user.id);
          await takeRate(`room-deepgram:${user.id}`, RATE_PER_MINUTE, 60);
        } catch (error) {
          if (error instanceof AccountBlockedError) return fail(403, error.message);
          if (error instanceof RateLimitError) return fail(429, error.message, { "retry-after": String(error.retryAfter) });
          throw error;
        }

        const declared = Number(request.headers.get("content-length") || 0);
        if (declared > BODY_LIMIT) return fail(413, "Nội dung gửi lên quá lớn.");
        const body = await request.arrayBuffer();
        if (body.byteLength > BODY_LIMIT) return fail(413, "Nội dung gửi lên quá lớn.");

        const { getSql } = await import("@/lib/db");
        const { parseRunDesk, parseModelList } = await import("@/lib/run-desk");
        const { loadPriceBook } = await import("@/lib/run-board.server");
        const { readRequest, chargeWith } = await import("@/lib/run-gate");
        const { deepgramRowFor } = await import("@/lib/sub/deepgram-catalog");
        const { applyUsdFix, parseUsdFix } = await import("@/lib/usd-fix");
        const { AURA_PRICE_ID } = await import("@/lib/sub/aura");
        const sql = await getSql();

        const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
        const desk = parseRunDesk(saved[0]?.value);
        if (desk.maintenance) return fail(403, desk.note || "Cửa trả theo lượt đang bảo trì.");
        const keys = await sql<{ value: string }>`select value from room_settings where key = 'deepgram_key'`;
        const key = keys[0]?.value?.trim();
        if (!key) return fail(503, "Phòng chưa lưu key Deepgram.");

        const parsed = await readRequest(path, request.headers.get("content-type"), body);
        if (!parsed) return fail(400, "Không đọc được model trong yêu cầu.");
        if (parsed.problem) return fail(400, parsed.problem);
        if (!isAuraModel(parsed.model)) return fail(403, "Model này không có trong cửa trả theo lượt.");
        if (parsed.chars > 2000) return fail(413, "Đoạn đọc quá dài.");
        const offered = await sql<{ value: string }>`select value from room_settings where key = 'deepgram_models'`;
        const models = parseModelList(offered[0]?.value);
        if (!models) return fail(503, "Phòng chưa đồng bộ model Deepgram.");
        if (!models.includes(parsed.model)) return fail(403, "Model này không có trong cửa trả theo lượt.");

        const live = await loadPriceBook(sql);
        if (!live) return fail(503, "Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
        const fixRaw = await sql<{ value: string }>`select value from room_settings where key = 'usd_fix'`;
        const fix = parseUsdFix(fixRaw[0]?.value);
        const own = deepgramRowFor(parsed.model);
        if (!own) return fail(422, "Model này chưa có giá niêm yết.");
        // Số Chủ sửa ở dòng chung `aura-2` áp cho mọi giọng. Bảng Groq giữ nguyên để có giá Turbo quy ra Token dịch.
        const [priced] = applyUsdFix([own], { [own.id]: fix[AURA_PRICE_ID] ?? { hour: null, inn: null, out: null, chars: null } });
        const book = { rate: live.rate, rows: [...live.rows, priced], desk: { markup: 0, custom: {} } };

        const text = (() => {
          try {
            return String((JSON.parse(new TextDecoder().decode(body)) as { input?: unknown }).input ?? "");
          } catch {
            return "";
          }
        })();

        let outcome: Awaited<ReturnType<typeof chargeWith>>;
        try {
          outcome = await chargeWith({
            sql,
            book,
            path,
            model: parsed.model,
            chars: parsed.chars,
            userId: user.id,
            ticketId: "",
            body,
            cap: desk.cap,
            send: () =>
              fetch(auraSpeakUrl(parsed.model), {
                method: "POST",
                headers: { Authorization: authHeader("deepgram", key), "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
                signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
              }),
          });
        } catch (error) {
          if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
            return fail(504, "Deepgram không trả lời xong kịp. Phần này chưa tính tiền, hãy thử lại.");
          }
          throw error;
        }
        if (outcome.kind === "reject") return fail(outcome.status, outcome.message);
        if (!outcome.response.ok) {
          let payload: unknown = null;
          try {
            payload = await outcome.response.json();
          } catch {
            payload = null;
          }
          return fail(outcome.response.status === 429 ? 429 : 502, auraErrorText(outcome.response.status, payload));
        }
        const out = new Headers();
        out.set("content-type", outcome.response.headers.get("content-type") || "audio/mpeg");
        return new Response(outcome.response.body, { status: 200, headers: out });
      },
    },
  },
});
