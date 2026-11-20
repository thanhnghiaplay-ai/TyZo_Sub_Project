import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { MAX_RUN_SECONDS } from "@/lib/run-bill";

export type RunTicketOpen = { id: string; held: number; perMinute: number; balance: number };

const MODEL_RE = /^[a-z0-9./_-]{2,80}$|^auto$/i;

/** Mở phiếu cho một lần chạy: giữ Token dịch trước, trả mã phiếu. Mọi yêu cầu sau gắn mã này. */
export const openRunTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { fileName: string; seconds: number; asrModel: string; chatModel: string }) => {
    const seconds = Math.ceil(Number(input.seconds));
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > MAX_RUN_SECONDS) throw new Error("Thời lượng tệp không đúng.");
    if (!MODEL_RE.test(input.asrModel || "") || !MODEL_RE.test(input.chatModel || "")) throw new Error("Tên model không đúng.");
    const fileName = String(input.fileName || "").trim().slice(0, 120);
    return { fileName, seconds, asrModel: input.asrModel, chatModel: input.chatModel };
  })
  .handler(async ({ context, data }): Promise<RunTicketOpen> => {
    const { randomBytes } = await import("node:crypto");
    const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    // Nhóm Dịch bình thường đang bảo trì thì không giữ tiền cho lượt mới. Phiếu đã mở vẫn chạy nốt.
    const { requireServiceOpen } = await import("@/lib/service-status.server");
    await requireServiceOpen("normal");
    await takeRate(`run-open:${context.userId}`, 20, 60);
    const { getSql } = await import("@/lib/db");
    const { parseRunDesk } = await import("@/lib/run-desk");
    const { holdGiay, formatGiay } = await import("@/lib/token-math");
    const { loadPriceBook } = await import("@/lib/run-board.server");
    const { openGiayWith, giayBalance } = await import("@/lib/token-flow");
    const { releaseStaleWith } = await import("@/lib/run-ticket");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const desk = parseRunDesk(saved[0]?.value);
    if (desk.maintenance) throw new Error(desk.note || "Cửa trả theo lượt đang bảo trì.");
    // Không nhánh riêng từng nhà: nhà của model, key, danh sách model và giá đều tra theo bảng chung (room-turn.ts).
    const { loadRoomHouses, loadProviderRows } = await import("@/lib/price-books.server");
    const { roomUse, dearestRoomChat } = await import("@/lib/room-turn");
    const houses = await loadRoomHouses(sql);
    const asr = roomUse(houses, data.asrModel, "asr");
    if ("error" in asr) throw new Error(asr.error);
    const book = await loadPriceBook(sql);
    if (!book) throw new Error("Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
    const rows = await loadProviderRows(sql);
    const chat = data.chatModel === "auto" ? dearestRoomChat(houses, book, rows) : roomUse(houses, data.chatModel, "chat");
    if (!chat) throw new Error("Phòng chưa có model dịch nào có giá cho cửa trả theo lượt.");
    if ("error" in chat) throw new Error(chat.error);
    const hold = holdGiay({ groq: book, rows, asrProvider: asr.provider, asrModel: asr.model, chatProvider: chat.provider, chatModel: chat.model, seconds: data.seconds });
    if (hold == null || hold < 1) throw new Error("Chưa có giá bản Turbo hoặc model này chưa có giá gốc.");
    const id = randomBytes(12).toString("hex");
    await releaseStaleWith(sql, context.userId);
    const result = await openGiayWith(sql, {
      id,
      userId: context.userId,
      fileName: data.fileName,
      seconds: data.seconds,
      rate: Math.round((hold * 60) / data.seconds),
      hold,
      asrModel: data.asrModel,
      chatModel: data.chatModel,
    });
    if ("error" in result) throw new Error(`Chưa đủ Token dịch. Lần này cần giữ ${formatGiay(hold)}. Hãy mua Token dịch ở Tài khoản.`);
    const left = await giayBalance(sql, context.userId);
    return { id, held: hold, perMinute: Math.round((hold * 60) / data.seconds), balance: left };
  });

/** Kết thúc phiếu: trừ số giây thực, nhả phần giữ thừa về gói còn hạn. Gọi nhiều lần cũng an toàn. */
export const closeRunTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; failed?: boolean }) => {
    const id = String(input.id || "").trim();
    if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("Mã phiếu không đúng.");
    return { id, failed: Boolean(input.failed) };
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const { closeTicketWith } = await import("@/lib/run-ticket");
    const sql = await getSql();
    const done = await closeTicketWith(sql, data.id, context.userId, data.failed);
    return { closed: Boolean(done), charged: done?.charged ?? 0, freed: done?.freed ?? 0 };
  });
