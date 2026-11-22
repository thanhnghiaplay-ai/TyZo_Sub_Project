import { randomBytes } from "node:crypto";
import type { LiveOpenInput } from "@/lib/live/live-open-rules";
import type { LiveBook } from "@/lib/live/live-cost";
import type { Sql } from "@/lib/db";

export type LiveOpenResult = { url: string; perMinute: number; balance: number; expiresInSeconds: number };

/**
 * Cấp vé vào cầu nối cho một tài khoản đã xác minh. Dùng chung cho trang web (openLiveTicket)
 * và ứng dụng Android (/api/app-ticket), nên hai đường cùng một luật: tài khoản mở, nhóm Dịch trực tiếp
 * không bảo trì, giới hạn tần suất, model Admin đã mở, đủ Token dịch cho một phút.
 */
/** Bảng giá và giá Turbo đổi chậm (Admin sửa, kéo giá 6 giờ một lần): giữ trong bộ nhớ 60 giây cho đỡ truy vấn. */
const PRICE_CACHE_MS = 60_000;
type PriceCache = { at: number; book: LiveBook | null; turbo: number | null };
let priceCache: PriceCache | null = null;
let priceLoading: Promise<PriceCache> | null = null;

async function cachedPrices(sql: Sql): Promise<PriceCache> {
  if (priceCache && Date.now() - priceCache.at < PRICE_CACHE_MS) return priceCache;
  priceLoading ??= (async () => {
    try {
      const { loadLiveBook } = await import("@/lib/live/live-book");
      const { turboPerSecond } = await import("@/lib/giay-room");
      const [book, turbo] = await Promise.all([loadLiveBook(sql), turboPerSecond()]);
      const next = { at: Date.now(), book, turbo };
      // Chưa có giá thì không giữ, lần sau đọc lại ngay.
      if (book && turbo && turbo > 0) priceCache = next;
      return next;
    } finally {
      priceLoading = null;
    }
  })();
  return priceLoading;
}

/** Chạy song song nhưng báo lỗi theo đúng thứ tự cũ (tài khoản, bảo trì, tần suất), để câu báo không đổi. */
async function inOrder(tasks: Array<Promise<unknown>>) {
  const results = await Promise.allSettled(tasks);
  for (const result of results) if (result.status === "rejected") throw result.reason;
}

export async function issueLiveTicket(userId: string, data: LiveOpenInput): Promise<LiveOpenResult> {
  const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
  // Nhóm Dịch trực tiếp đang bảo trì thì không cấp vé mới. Phiên đang chạy vẫn chạy nốt.
  const { requireServiceOpen } = await import("@/lib/service-status.server");
  const { env } = await import("@/lib/env.server");
  const { getSql } = await import("@/lib/db");
  const { liveCost, usageForSeconds } = await import("@/lib/live/live-cost");
  const { targetHasVoice } = await import("@/lib/live/langs");
  const { signLiveTicket } = await import("@/lib/live/live-ticket");
  const { giayBalance } = await import("@/lib/token-flow");
  const { tokensForBase, formatGiay } = await import("@/lib/token-math");
  const { liveOpenProblem, parseLiveShow } = await import("@/lib/live/live-show");
  const { bridgeBase, LIVE_TICKET_TTL_MS } = await import("@/lib/live/live-open-rules");
  const secret = env("LIVE_BRIDGE_SECRET");
  const base = bridgeBase(env("LIVE_BRIDGE_URL"));
  const sql = await getSql();
  // Mọi truy vấn độc lập chạy cùng lúc (mỗi truy vấn tới Neon Singapore mất khoảng 0,1 giây).
  // Kiểm tài khoản, bảo trì và tần suất vẫn chặn như trước: một cái lỗi là không cấp vé.
  const guards = inOrder([requireOpenAccount(userId), requireServiceOpen("live"), takeRate(`live-open:${userId}`, 10, 60)]);
  const shownQuery = sql<{ value: string }>`select value from room_settings where key = 'live_show'`;
  const pricesQuery = cachedPrices(sql);
  const balanceQuery = giayBalance(sql, userId);
  for (const query of [shownQuery, pricesQuery, balanceQuery]) query.catch(() => undefined);
  await guards;
  if (!secret || !base) throw new Error("Dịch trực tiếp chưa được bật ở phòng này.");
  // Chủ chỉ mở model làm được; chặn thật ở đây, không chỉ ẩn ở ô chọn.
  const shown = await shownQuery;
  const problem = liveOpenProblem(parseLiveShow(shown[0]?.value), data.model);
  if (problem) throw new Error(problem);
  const { book, turbo } = await pricesQuery;
  if (!book) throw new Error("Chưa có bảng giá để tính giây. Hãy thử lại sau.");
  if (!(turbo && turbo > 0)) throw new Error("Chưa có giá bản Turbo. Chưa tính được giây.");
  const audio = data.audio && targetHasVoice(data.target);
  const minute = liveCost(book, data.model, usageForSeconds(60, audio));
  const perMinute = minute ? tokensForBase(minute.base, turbo) : null;
  if (perMinute == null || !(perMinute > 0)) throw new Error("Model này chưa có giá niêm yết.");
  const balance = await balanceQuery;
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
