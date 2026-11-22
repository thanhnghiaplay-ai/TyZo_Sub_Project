import { createFileRoute } from "@tanstack/react-router";

/**
 * Ứng dụng Android xin vé vào cầu nối Dịch trực tiếp. Cùng luật với trang web (issueLiveTicket).
 * Ứng dụng chỉ nhận chữ: tiếng dịch luôn tắt, vì tiếng phát ra sẽ bị chính bộ thu nghe lại.
 */
export const Route = createFileRoute("/api/app-ticket")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { fail, failFrom, json, readJson } = await import("@/lib/app-api.server");
        try {
          const { deviceUserId } = await import("@/lib/app-link.server");
          const userId = await deviceUserId();
          if (!userId) return fail(401, "Máy này chưa liên kết hoặc đã bị gỡ. Hãy liên kết lại.");
          const body = await readJson(request);
          if (!body) return fail(400, "Yêu cầu không đúng.");
          const { parseLiveOpen } = await import("@/lib/live/live-open-rules");
          const data = parseLiveOpen({ model: String(body.model ?? ""), target: String(body.target ?? ""), source: String(body.source ?? ""), audio: false });
          const { issueLiveTicket } = await import("@/lib/live/live-issue.server");
          return json(200, await issueLiveTicket(userId, data));
        } catch (error) {
          return failFrom(error);
        }
      },
    },
  },
});
