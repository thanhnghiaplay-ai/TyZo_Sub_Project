import { createFileRoute } from "@tanstack/react-router";

/**
 * CỬA GỌI MODEL CHUNG cho mọi nhà có khả năng dịch (PROVIDERS[id].chat). Không viết riêng nhà nào.
 * - Trả theo lượt (không có x-user-key): dùng key PHÒNG của nhà, kiểm phiếu, kiểm model qua bảng chung (room-turn.ts),
 *   tính giá theo bảng của đúng nhà, quy ra Token dịch theo Whisper Turbo của Groq.
 * - Key của khách (x-user-key): chỉ chuyển tiếp tới nhà cho những nhà trình duyệt không gọi thẳng được. Không lưu key, không tính tiền.
 * Đầu vào: x-provider (mã nhà), x-path (phải đúng đường dịch nhà khai), x-run-ticket (phiếu, cửa phòng).
 */
const BODY_LIMIT = 512 * 1024;
const RATE_PER_MINUTE = 240;
const UPSTREAM_TIMEOUT_MS = 100_000;

function fail(status: number, message: string, extra?: Record<string, string>) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

function relay(upstream: Response) {
  const out = new Headers();
  const type = upstream.headers.get("content-type");
  if (type) out.set("content-type", type);
  const retry = upstream.headers.get("retry-after");
  if (retry) out.set("retry-after", retry);
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

export const Route = createFileRoute("/api/model-call")({
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
        const { PROVIDERS, PROVIDER_IDS, authHeader, providerApi, providerChat, isProviderId } = await import("@/lib/sub/provider");
        const user = await getSessionUser();
        if (!user) return fail(401, "Cần đăng nhập.");
        const provider = request.headers.get("x-provider") || "";
        if (!isProviderId(provider) || !PROVIDER_IDS.includes(provider)) return fail(400, "Nhà cung cấp không đúng.");
        const chat = providerChat(provider);
        const path = request.headers.get("x-path") || "";
        if (!chat || path !== chat.path) return fail(400, `${PROVIDERS[provider].label} không có đường này.`);
        const label = PROVIDERS[provider].label;
        const userKey = (request.headers.get("x-user-key") || "").trim();
        const roomDoor = !userKey;
        if (!roomDoor && (userKey.length < 20 || userKey.length > 200 || /\s/.test(userKey) || userKey === "room")) return fail(400, `Key ${label} không đúng.`);
        try {
          await requireOpenAccount(user.id);
          await takeRate(`model-call:${user.id}`, RATE_PER_MINUTE, 60);
        } catch (error) {
          if (error instanceof AccountBlockedError) return fail(403, error.message);
          if (error instanceof RateLimitError) return fail(429, error.message, { "retry-after": String(error.retryAfter) });
          throw error;
        }
        const declared = Number(request.headers.get("content-length") || 0);
        if (declared > BODY_LIMIT) return fail(413, "Nội dung gửi lên quá lớn.");
        const body = await request.arrayBuffer();
        if (body.byteLength > BODY_LIMIT) return fail(413, "Nội dung gửi lên quá lớn.");
        const contentType = request.headers.get("content-type");
        const target = `${providerApi(provider)}${chat.path}`;
        const headersWith = (key: string) => {
          const headers = new Headers();
          headers.set("Authorization", authHeader(provider, key));
          if (contentType) headers.set("Content-Type", contentType);
          return headers;
        };
        const timeoutText = `${label} không trả lời xong kịp. Phần này chưa tính tiền, hãy thử lại.`;

        if (!roomDoor) {
          try {
            return relay(await fetch(target, { method: "POST", headers: headersWith(userKey), body, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }));
          } catch (error) {
            if (isTimeout(error)) return fail(504, timeoutText);
            throw error;
          }
        }

        const { getSql } = await import("@/lib/db");
        const { parseRunDesk } = await import("@/lib/run-desk");
        const { readRequest, chargeWith } = await import("@/lib/run-gate");
        const { loadPriceBook } = await import("@/lib/run-board.server");
        const { loadRoomHouses, loadProviderRows } = await import("@/lib/price-books.server");
        const { roomUse } = await import("@/lib/room-turn");
        const { rowsOf } = await import("@/lib/price-rows");
        const sql = await getSql();
        const desk = parseRunDesk((await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`)[0]?.value);
        if (desk.maintenance) return fail(403, desk.note || "Cửa trả theo lượt đang bảo trì.");
        const parsed = await readRequest(path, contentType, body);
        if (!parsed) return fail(400, "Không đọc được model trong yêu cầu.");
        if (parsed.problem) return fail(400, parsed.problem);
        const houses = await loadRoomHouses(sql);
        const use = roomUse(houses, parsed.model, "chat");
        if ("error" in use) return fail(403, use.error);
        if (use.provider !== provider) return fail(400, `Model ${parsed.model} không thuộc ${label}.`);
        const groq = await loadPriceBook(sql);
        if (!groq) return fail(503, "Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
        const rows = await loadProviderRows(sql);
        const houseDesk = parseRunDesk((await sql<{ value: string }>`select value from room_settings where key = ${PROVIDERS[provider].settings.desk}`)[0]?.value);
        const book = provider === "groq" ? groq : { rate: groq.rate, rows: rowsOf(provider, groq, rows), desk: { markup: houseDesk.markup, custom: houseDesk.custom } };
        const key = houses[provider].key!;
        try {
          const outcome = await chargeWith({
            sql,
            book,
            unitBook: groq,
            provider,
            path,
            model: parsed.model,
            chars: parsed.chars,
            userId: user.id,
            ticketId: request.headers.get("x-run-ticket") || "",
            body,
            cap: desk.cap,
            send: () => fetch(target, { method: "POST", headers: headersWith(key), body, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }),
          });
          if (outcome.kind === "reject") return fail(outcome.status, outcome.message);
          return relay(outcome.response);
        } catch (error) {
          if (isTimeout(error)) return fail(504, timeoutText);
          throw error;
        }
      },
    },
  },
});
