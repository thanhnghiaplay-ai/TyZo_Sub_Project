import { randomBytes } from "node:crypto";
import type { LiveOpenInput } from "@/lib/live/live-open-rules";

export type LiveOpenResult = { url: string; perMinute: number; balance: number; expiresInSeconds: number };

/**
 * Cấp vé vào cầu nối cho một tài khoản đã xác minh. Dùng chung cho trang web (openLiveTicket)
 * và ứng dụng Android (/api/app-ticket), nên hai đường cùng một luật: tài khoản mở, nhóm Dịch trực tiếp
 * không bảo trì, giới hạn tần suất, model Admin đã mở, đủ Token dịch cho một phút.
 */
export async function issueLiveTicket(userId: string, data: LiveOpenInput): Promise<LiveOpenResult> {
  const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
  await requireOpenAccount(userId);
  // Nhóm Dịch trực tiếp đang bảo trì thì không cấp vé mới. Phiên đang chạy vẫn chạy nốt.
  const { requireServiceOpen } = await import("@/lib/service-status.server");
  await requireServiceOpen("live");
  await takeRate(`live-open:${userId}`, 10, 60);
  const { env } = await import("@/lib/env.server");
  const secret = env("LIVE_BRIDGE_SECRET");
  const { bridgeBase, LIVE_TICKET_TTL_MS } = await import("@/lib/live/live-open-rules");
  const base = bridgeBase(env("LIVE_BRIDGE_URL"));
  if (!secret || !base) throw new Error("Dịch trực tiếp chưa được bật ở phòng này.");
  const { getSql } = await import("@/lib/db");
  const { loadLiveBook } = await import("@/lib/live/live-book");
  const { liveCost, usageForSeconds } = await import("@/lib/live/live-cost");
  const { targetHasVoice } = await import("@/lib/live/langs");
  const { signLiveTicket } = await import("@/lib/live/live-ticket");
  const { turboPerSecond } = await import("@/lib/giay-room");
  const { giayBalance } = await import("@/lib/token-flow");
  const { tokensForBase, formatGiay } = await import("@/lib/token-math");
  const sql = await getSql();
  // Chủ chỉ mở model làm được; chặn thật ở đây, không chỉ ẩn ở ô chọn.
  const { liveOpenProblem, parseLiveShow } = await import("@/lib/live/live-show");
  const shown = await sql<{ value: string }>`select value from room_settings where key = 'live_show'`;
  const problem = liveOpenProblem(parseLiveShow(shown[0]?.value), data.model);
  if (problem) throw new Error(problem);
  const book = await loadLiveBook(sql);
  if (!book) throw new Error("Chưa có bảng giá để tính giây. Hãy thử lại sau.");
  const turbo = await turboPerSecond();
  if (!(turbo && turbo > 0)) throw new Error("Chưa có giá bản Turbo. Chưa tính được giây.");
  const audio = data.audio && targetHasVoice(data.target);
  const minute = liveCost(book, data.model, usageForSeconds(60, audio));
  const perMinute = minute ? tokensForBase(minute.base, turbo) : null;
  if (perMinute == null || !(perMinute > 0)) throw new Error("Model này chưa có giá niêm yết.");
  const balance = await giayBalance(sql, userId);
  if (balance < perMinute) {
    throw new Error(`Token dịch chưa đủ. Mỗi phút khoảng ${formatGiay(perMinute)}. Hãy mua thêm Token dịch ở Tài khoản.`);
  }
  const exp = Date.now() + LIVE_TICKET_TTL_MS;
  const ticket = signLiveTicket(secret, {
    uid: userId,
    sid: randomBytes(10).toString("hex"),
    model: data.model,
    target: data.target,
    source: data.source,
    audio,
    ...(data.words ? { words: data.words } : {}),
    exp,
  });
  return { url: `${base}${base.includes("?") ? "&" : "?"}ticket=${ticket}`, perMinute, balance, expiresInSeconds: Math.round(LIVE_TICKET_TTL_MS / 1000) };
}
