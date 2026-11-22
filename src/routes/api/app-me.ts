import { createFileRoute } from "@tanstack/react-router";

/** Ứng dụng Android hỏi: tài khoản nào, còn bao nhiêu Token dịch, model nào đang mở. Cần khóa máy. */
export const Route = createFileRoute("/api/app-me")({
  server: {
    handlers: {
      GET: async () => {
        const { fail, failFrom, json } = await import("@/lib/app-api.server");
        try {
          const { deviceUserId } = await import("@/lib/app-link.server");
          const userId = await deviceUserId();
          if (!userId) return fail(401, "Máy này chưa liên kết hoặc đã bị gỡ. Hãy liên kết lại.");
          const { takeRate } = await import("@/lib/guard.server");
          await takeRate(`app-me:${userId}`, 60, 60);
          const { getSql } = await import("@/lib/db");
          const { giayBalance } = await import("@/lib/token-flow");
          const { liveOpenModels, parseLiveShow } = await import("@/lib/live/live-show");
          const { LIVE_MODELS } = await import("@/lib/live/live-open-rules");
          const sql = await getSql();
          const users = await sql<{ email: string | null }>`select email from "user" where id = ${userId}`;
          const shown = await sql<{ value: string }>`select value from room_settings where key = 'live_show'`;
          const { androidRelease } = await import("@/lib/app-release.server");
          return json(200, {
            email: users[0]?.email ?? "",
            app: await androidRelease(),
            balance: await giayBalance(sql, userId),
            models: liveOpenModels(parseLiveShow(shown[0]?.value), LIVE_MODELS),
          });
        } catch (error) {
          return failFrom(error);
        }
      },
    },
  },
});
