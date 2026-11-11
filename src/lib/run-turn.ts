import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { MAX_RUN_SECONDS, dearestChatModel } from "@/lib/run-bill";
import { ALIBABA_ROWS } from "@/lib/sub/alibaba-catalog";
import { parseServicePacks, providersIn, quotePack } from "@/lib/service-pack";

export type RunTicketOpen = { id: string; held: number; perMinute: number; balance: number };

const MODEL_RE = /^[a-z0-9./_-]{2,80}$|^auto$/i;

/** Mở phiếu cho một lần chạy: giữ tiền trước, trả mã phiếu. Mọi yêu cầu sau gắn mã này. */
export const openRunTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { fileName: string; seconds: number; asrModel: string; chatModel: string; packId?: string; narration?: boolean; scope?: string }) => {
    const seconds = Math.ceil(Number(input.seconds));
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > MAX_RUN_SECONDS) throw new Error("Thời lượng tệp không đúng.");
    if (!MODEL_RE.test(input.asrModel || "") || !MODEL_RE.test(input.chatModel || "")) throw new Error("Tên model không đúng.");
    const fileName = String(input.fileName || "").trim().slice(0, 120);
    const packId = String(input.packId || "").trim();
    if (packId && !/^pack_[a-z0-9]{4,24}$/.test(packId)) throw new Error("Gói không đúng.");
    const scope = input.scope === "translate" ? "translate" : "full";
    return { fileName, seconds, asrModel: input.asrModel, chatModel: input.chatModel, packId, narration: Boolean(input.narration), scope };
  })
  .handler(async ({ context, data }): Promise<RunTicketOpen> => {
    const { randomBytes } = await import("node:crypto");
    const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    await takeRate(`run-open:${context.userId}`, 20, 60);
    const { getSql } = await import("@/lib/db");
    const { parseRunDesk, parseModelList, dayStartIso } = await import("@/lib/run-desk");
    const { estimateHold, estimateTranslateHold } = await import("@/lib/run-bill");
    const { loadPriceBook } = await import("@/lib/run-board.server");
    const { openTicketWith } = await import("@/lib/run-ticket");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const desk = parseRunDesk(saved[0]?.value);
    if (desk.maintenance) throw new Error(desk.note || "Cửa trả theo lượt đang bảo trì.");
    const offered = await sql<{ value: string }>`select value from room_settings where key = 'run_models'`;
    const models = parseModelList(offered[0]?.value);
    const book = await loadPriceBook(sql);
    if (!book) throw new Error("Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
    let hold: number | null = null;
    if (data.packId) {
      const raw = await sql<{ value: string }>`select value from room_settings where key = 'service_packs'`;
      const pack = parseServicePacks(raw[0]?.value).find((item) => item.id === data.packId && item.enabled && item.doors.includes("turn"));
      if (!pack) throw new Error("Gói này không mở ở cửa trả theo lượt.");
      const aliModels = parseModelList((await sql<{ value: string }>`select value from room_settings where key = 'alibaba_models'`)[0]?.value);
      for (const provider of providersIn(pack)) {
        const list = provider === "alibaba" ? aliModels : models;
        const used = Object.values(pack.roles).filter((role) => role?.provider === provider).map((role) => role!.model);
        if (!list || used.some((id) => !list.includes(id))) throw new Error("Gói đang dùng model chưa được đồng bộ.");
      }
      const aliDesk = parseRunDesk((await sql<{ value: string }>`select value from room_settings where key = 'alibaba_desk'`)[0]?.value);
      const quote = quotePack({
        pack,
        seconds: data.seconds,
        door: "turn",
        narration: data.scope === "translate" ? false : data.narration,
        scope: data.scope === "translate" ? "translate" : "full",
        books: {
          groq: book,
          alibaba: { rate: book.rate, rows: ALIBABA_ROWS, desk: { markup: aliDesk.markup, custom: aliDesk.custom } },
        },
      });
      if (!quote.ready) throw new Error("Gói này chưa đủ giá niêm yết để giữ chỗ.");
      hold = quote.hold;
    } else {
      if (!models) throw new Error("Phòng chưa đồng bộ danh sách model cho cửa trả theo lượt.");
      const auto = data.chatModel === "auto";
      if (!models.includes(data.asrModel) || (!auto && !models.includes(data.chatModel))) throw new Error("Model này không có trong cửa trả theo lượt.");
      const chatModel = auto ? dearestChatModel(book, models) : data.chatModel;
      hold =
        data.scope === "translate"
          ? chatModel
            ? estimateTranslateHold(book, chatModel, data.seconds)
            : null
          : chatModel
            ? estimateHold(book, data.asrModel, chatModel, data.seconds)
            : null;
      if (hold == null) throw new Error("Model này chưa có giá niêm yết ở cửa trả theo lượt.");
    }
    const id = randomBytes(12).toString("hex");
    const result = await openTicketWith(sql, {
      id,
      userId: context.userId,
      fileName: data.fileName,
      seconds: data.seconds,
      rate: Math.round((hold * 60) / data.seconds),
      hold,
      cap: desk.cap,
      dayStartIso: dayStartIso(),
    });
    if ("error" in result) {
      throw new Error(
        result.error === "qua-han-muc"
          ? "Đã quá hạn mức trả theo lượt của hôm nay."
          : `Số dư chưa đủ. Lần này cần giữ ${new Intl.NumberFormat("vi-VN").format(hold)} đ. Hãy nạp thêm.`,
      );
    }
    const bal = await sql<{ balance: number }>`select balance from room_accounts where user_id = ${context.userId}`;
    return { id, held: hold, perMinute: Math.round((hold * 60) / data.seconds), balance: Number(bal[0]?.balance ?? 0) };
  });

/** Kết thúc phiếu: trừ số thật, nhả phần giữ thừa về ví. Gọi nhiều lần cũng an toàn. */
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
