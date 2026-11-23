import { createFileRoute } from "@tanstack/react-router";

/**
 * Ứng dụng Android: lịch sử Dịch trực tiếp chung với web (cùng tài khoản). Cần khóa máy.
 * GET: danh sách; GET ?id=…: chữ của một phiên; POST: lưu phiên vừa xong; DELETE ?id=… hoặc ?all=1: xóa.
 */
async function owner() {
  const { deviceUserId } = await import("@/lib/app-link.server");
  return deviceUserId();
}

export const Route = createFileRoute("/api/app-history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { fail, failFrom, json } = await import("@/lib/app-api.server");
        try {
          const userId = await owner();
          if (!userId) return fail(401, "Máy này chưa liên kết hoặc đã bị gỡ. Hãy liên kết lại.");
          const { takeRate } = await import("@/lib/guard.server");
          await takeRate(`app-history:${userId}`, 60, 60);
          const { getSql } = await import("@/lib/db");
          const { listHistoryWith, readHistoryWith } = await import("@/lib/live/live-history");
          const sql = await getSql();
          const id = new URL(request.url).searchParams.get("id");
          if (!id) return json(200, { items: await listHistoryWith(sql, userId) });
          const found = await readHistoryWith(sql, userId, id.slice(0, 160));
          return found ? json(200, found) : fail(404, "Không thấy phiên này, có thể đã bị xóa.");
        } catch (error) {
          return failFrom(error);
        }
      },
      POST: async ({ request }) => {
        const { fail, failFrom, json, readJson } = await import("@/lib/app-api.server");
        try {
          const userId = await owner();
          if (!userId) return fail(401, "Máy này chưa liên kết hoặc đã bị gỡ. Hãy liên kết lại.");
          // Một phiên tối đa 2.000 câu, mỗi câu tối đa 600 ký tự mỗi bên.
          const body = await readJson(request, 3 * 1024 * 1024);
          const { cleanHistory, saveHistoryWith } = await import("@/lib/live/live-history");
          const clean = cleanHistory(body, "app");
          if (!clean) return json(200, { saved: false });
          const { takeRate } = await import("@/lib/guard.server");
          await takeRate(`live-history:${userId}`, 30, 60);
          const { getSql } = await import("@/lib/db");
          return json(200, { saved: true, id: await saveHistoryWith(await getSql(), userId, clean) });
        } catch (error) {
          return failFrom(error);
        }
      },
      DELETE: async ({ request }) => {
        const { fail, failFrom, json } = await import("@/lib/app-api.server");
        try {
          const userId = await owner();
          if (!userId) return fail(401, "Máy này chưa liên kết hoặc đã bị gỡ. Hãy liên kết lại.");
          const params = new URL(request.url).searchParams;
          const id = params.get("id");
          if (!id && params.get("all") !== "1") return fail(400, "Thiếu phiên cần xóa.");
          const { getSql } = await import("@/lib/db");
          const { deleteHistoryWith } = await import("@/lib/live/live-history");
          return json(200, { deleted: await deleteHistoryWith(await getSql(), userId, id ? id.slice(0, 160) : null) });
        } catch (error) {
          return failFrom(error);
        }
      },
    },
  },
});
