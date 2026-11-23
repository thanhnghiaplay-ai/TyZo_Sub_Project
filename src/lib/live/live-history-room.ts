import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { HistoryCue, HistoryItem } from "@/lib/live/live-history";

export type { HistoryCue, HistoryItem };

/** Lịch sử Dịch trực tiếp của chính tài khoản đang đăng nhập (phiên từ web và từ ứng dụng). */
export const listLiveHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<HistoryItem[]> => {
    const { getSql } = await import("@/lib/db");
    const { listHistoryWith } = await import("@/lib/live/live-history");
    return listHistoryWith(await getSql(), context.userId);
  });

export const readLiveHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => ({ id: String(input?.id ?? "").slice(0, 160) }))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const { readHistoryWith } = await import("@/lib/live/live-history");
    const found = await readHistoryWith(await getSql(), context.userId, data.id);
    if (!found) throw new Error("Không thấy phiên này, có thể đã bị xóa.");
    return found;
  });

/** Lưu phiên vừa xong. Gửi lại cùng clientId thì ghi đè. Lỗi lưu không làm hỏng phiên (trình duyệt vẫn giữ bản trên máy). */
export const saveLiveHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => input)
  .handler(async ({ context, data }) => {
    const { cleanHistory, saveHistoryWith } = await import("@/lib/live/live-history");
    const clean = cleanHistory(data, "web");
    if (!clean) return { saved: false };
    const { takeRate } = await import("@/lib/guard.server");
    await takeRate(`live-history:${context.userId}`, 30, 60);
    const { getSql } = await import("@/lib/db");
    return { saved: true, id: await saveHistoryWith(await getSql(), context.userId, clean) };
  });

/** Xóa một phiên (id) hoặc xóa hết (id rỗng). */
export const deleteLiveHistory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string }) => ({ id: input?.id ? String(input.id).slice(0, 160) : null }))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const { deleteHistoryWith } = await import("@/lib/live/live-history");
    return { deleted: await deleteHistoryWith(await getSql(), context.userId, data.id) };
  });
