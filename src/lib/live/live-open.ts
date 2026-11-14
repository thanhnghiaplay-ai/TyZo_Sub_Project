import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseLiveOpen, type LiveOpenInput } from "@/lib/live/live-open-rules";

export type LiveOpenResult = { url: string; perMinute: number; balance: number; expiresInSeconds: number };

/**
 * Cấp vé vào cầu nối Dịch trực tiếp. Cần đăng nhập, tài khoản đang mở, giới hạn tần suất.
 * Vé do máy chủ chính ký, sống 60 giây; tiền chỉ bị giữ khi cầu nối nhận vé và bắt đầu phiên.
 */
export const openLiveTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: LiveOpenInput) => parseLiveOpen(input))
  .handler(async ({ context, data }): Promise<LiveOpenResult> => {
    const { randomBytes } = await import("node:crypto");
    const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    await takeRate(`live-open:${context.userId}`, 10, 60);
    const { env } = await import("@/lib/env.server");
    const secret = env("LIVE_BRIDGE_SECRET");
    const { bridgeBase, LIVE_TICKET_TTL_MS } = await import("@/lib/live/live-open-rules");
    const base = bridgeBase(env("LIVE_BRIDGE_URL"));
    if (!secret || !base) throw new Error("Dịch trực tiếp chưa được bật ở phòng này.");
    const { getSql } = await import("@/lib/db");
    const { loadLiveBook } = await import("@/lib/live/live-book");
    const { livePerMinute } = await import("@/lib/live/live-cost");
    const { targetHasVoice } = await import("@/lib/live/langs");
    const { signLiveTicket } = await import("@/lib/live/live-ticket");
    const sql = await getSql();
    const book = await loadLiveBook(sql);
    if (!book) throw new Error("Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
    const audio = data.audio && targetHasVoice(data.target);
    const perMinute = livePerMinute(book, data.model, audio);
    if (perMinute == null) throw new Error("Model này chưa có giá niêm yết.");
    const bal = await sql<{ balance: number }>`select balance from room_accounts where user_id = ${context.userId}`;
    const balance = Number(bal[0]?.balance ?? 0);
    if (balance < perMinute) {
      throw new Error(`Số dư chưa đủ. Mỗi phút dịch khoảng ${new Intl.NumberFormat("vi-VN").format(perMinute)} đ. Hãy nạp thêm.`);
    }
    const exp = Date.now() + LIVE_TICKET_TTL_MS;
    const ticket = signLiveTicket(secret, {
      uid: context.userId,
      sid: randomBytes(10).toString("hex"),
      model: data.model,
      target: data.target,
      source: data.source,
      audio,
      exp,
    });
    return { url: `${base}${base.includes("?") ? "&" : "?"}ticket=${ticket}`, perMinute, balance, expiresInSeconds: Math.round(LIVE_TICKET_TTL_MS / 1000) };
  });
