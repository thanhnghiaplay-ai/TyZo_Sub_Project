import { createFileRoute } from "@tanstack/react-router";

/**
 * Ứng dụng Android đổi mã liên kết (lấy ở trang Tài khoản) lấy khóa máy.
 * POST {code, name} → {token, email}. DELETE (kèm khóa máy) → gỡ liên kết máy này.
 */
export const Route = createFileRoute("/api/app-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { fail, failFrom, json, readJson } = await import("@/lib/app-api.server");
        try {
          const { takeRate } = await import("@/lib/guard.server");
          const { callerIp, redeemLinkCode } = await import("@/lib/app-link.server");
          const ip = callerIp();
          await takeRate("app-link:public", 120, 600);
          if (ip) await takeRate(`app-link-ip:${ip}`, 10, 600);
          const body = await readJson(request);
          if (!body) return fail(400, "Yêu cầu không đúng.");
          const linked = await redeemLinkCode(body.code, body.name);
          if (!linked) return fail(400, "Mã liên kết sai hoặc đã hết hạn. Hãy lấy mã mới ở trang Tài khoản.");
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          const rows = await sql<{ email: string | null }>`select email from "user" where id = ${linked.userId}`;
          return json(200, { token: linked.token, email: rows[0]?.email ?? "" });
        } catch (error) {
          return failFrom(error);
        }
      },
      DELETE: async () => {
        const { failFrom, json } = await import("@/lib/app-api.server");
        try {
          const { revokeCurrentDevice } = await import("@/lib/app-link.server");
          return json(200, { ok: await revokeCurrentDevice() });
        } catch (error) {
          return failFrom(error);
        }
      },
    },
  },
});
