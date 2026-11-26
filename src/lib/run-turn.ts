import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { CHAT_TICKET_PREFIX, MAX_RUN_SECONDS, parseHoldPart } from "@/lib/run-bill";

export type RunTicketOpen = { id: string; held: number; perMinute: number; balance: number };

const MODEL_RE = /^[a-z0-9./_-]{2,80}$|^auto$/i;

/** Mở phiếu cho một lần chạy: giữ Token dịch trước, trả mã phiếu. Mọi yêu cầu sau gắn mã này. */
export const openRunTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { fileName: string; seconds: number; asrModel: string; chatModel: string; part?: string }) => {
    const seconds = Math.ceil(Number(input.seconds));
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > MAX_RUN_SECONDS) throw new Error("Thời lượng tệp không đúng.");
    if (!MODEL_RE.test(input.asrModel || "") || !MODEL_RE.test(input.chatModel || "")) throw new Error("Tên model không đúng.");
    const part = parseHoldPart(input.part);
    const base = String(input.fileName || "").trim().slice(0, 120);
    // Phiếu phần dịch mang tên riêng (máy chủ tự gắn, không tin máy khách) để Admin phân biệt và Tổng quan không đếm đôi.
    const fileName = part === "chat" ? (CHAT_TICKET_PREFIX + base.replace(CHAT_TICKET_PREFIX, "")).slice(0, 120) : base;
    return { fileName, seconds, asrModel: input.asrModel, chatModel: input.chatModel, part };
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
    const hold = holdGiay({ groq: book, rows, asrProvider: asr.provider, asrModel: asr.model, chatProvider: chat.provider, chatModel: chat.model, seconds: data.seconds, part: data.part });
    if (hold == null || hold < 1) throw new Error("Chưa có giá bản Turbo hoặc model này chưa có giá gốc.");
    let modalPrice: string | undefined;
    if (asr.provider === "tyzo-modal" && data.part !== "chat") {
      const settings = await sql<{value:string}>`select value from room_settings where key='tyzo_modal_price'`;
      if (!settings.length) throw new Error("Chủ chưa đặt giá TyZo Modal.");
      const { parseModalPrice } = await import("./sub/tyzo-modal-price");
      const price = parseModalPrice(JSON.parse(settings[0].value));
      if (rows["tyzo-modal"]?.find(r => r.id === asr.model)?.usdPerHour !== price[asr.model.endsWith("-ky") ? "ky" : "nhanh"]) throw new Error("Giá vừa thay đổi. Vui lòng thử lại.");
      modalPrice = JSON.stringify(price);
    }
    const id = randomBytes(12).toString("hex");
    await releaseStaleWith(sql, context.userId);
    const result = await openGiayWith(sql, {
      id,
      userId: context.userId,
      fileName: data.fileName,
      seconds: data.seconds,
      rate: Math.round((hold * 60) / data.seconds),
      hold, modalPrice,
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
