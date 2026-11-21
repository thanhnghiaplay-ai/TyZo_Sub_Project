import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { checkPolishModels, parsePolishModels, type PolishModels } from "@/lib/polish-models";
import { validPolishTokens } from "@/lib/polish-hold";
import { POLISH_PROMPTS_KEY, checkPolishPrompts, describePolishPrompts, parsePolishPrompts, type PolishPrompts } from "@/lib/polish-prompts";

/**
 * Danh sách model trau chuốt Chủ đã đặt. Ai đăng nhập cũng đọc được (khách cần để chọn), chỉ Chủ lưu được.
 * null = Chủ chưa lưu: khách chưa trau chuốt được.
 */
export const getPolishModels = createServerFn({ method: "GET" }).handler(async (): Promise<PolishModels | null> => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = 'polish_models'`;
    return parsePolishModels(rows[0]?.value);
  } catch {
    return null;
  }
});

export const savePolishModels = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: PolishModels) => checkPolishModels(input))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    const prev = await sql<{ value: string }>`select value from room_settings where key = 'polish_models'`;
    const before = parsePolishModels(prev[0]?.value);
    await sql`
      insert into room_settings (key, value) values ('polish_models', ${value})
      on conflict (key) do update set value = ${value}
    `;
    const { describePolishModels } = await import("@/lib/audit-note");
    await writeAudit(context.userId, "mo-trau-chuot", null, describePolishModels(before, data));
    return data;
  });

/** Lệnh trau chuốt theo thể loại Admin đã sửa. Ai đăng nhập cũng đọc (máy khách dựng lệnh), chỉ Admin lưu. Lỗi thì {} (dùng mặc định). */
export const getPolishPrompts = createServerFn({ method: "GET" }).handler(async (): Promise<PolishPrompts> => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = ${POLISH_PROMPTS_KEY}`;
    return parsePolishPrompts(rows[0]?.value);
  } catch {
    return {};
  }
});

export const savePolishPrompts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => checkPolishPrompts(input))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const prev = await sql<{ value: string }>`select value from room_settings where key = ${POLISH_PROMPTS_KEY}`;
    const before = parsePolishPrompts(prev[0]?.value);
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values (${POLISH_PROMPTS_KEY}, ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "sua-lenh-trau-chuot", null, describePolishPrompts(before, data));
    return data;
  });

export type PolishTicketOpen = { id: string; held: number; balance: number };

/**
 * Mở phiếu giữ Token dịch cho một lần trau chuốt bằng cửa trả theo lượt (key phòng).
 * Máy chủ tự kiểm model có trong danh sách Chủ đặt cho thể loại này và trong danh sách cửa trả theo lượt,
 * tự tính khoản giữ từ số token ước (không tin số Token khách khai). Trừ thật theo usage do /api/room-groq làm;
 * đóng phiếu bằng `closeRunTicket` (nhả phần dư, lỗi thì không trừ).
 */
export const openPolishTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { model: string; genre: string; inn: number; out: number }) => {
    const model = String(input.model || "").trim();
    if (!/^[a-z0-9./_-]{2,80}$/i.test(model)) throw new Error("Tên model không đúng.");
    return { model, genre: String(input.genre || "").trim().slice(0, 40), inn: input.inn, out: input.out };
  })
  .handler(async ({ context, data }): Promise<PolishTicketOpen> => {
    const { polishHold } = await import("@/lib/polish-hold");
    const tokens = validPolishTokens(data.inn, data.out);
    if (!tokens) throw new Error("Số lượng cần trau chuốt không đúng.");
    const { randomBytes } = await import("node:crypto");
    const { requireOpenAccount, takeRate } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    const { requireServiceOpen } = await import("@/lib/service-status.server");
    await requireServiceOpen("normal");
    await takeRate(`run-open:${context.userId}`, 20, 60);
    const { getSql } = await import("@/lib/db");
    const { parseRunDesk } = await import("@/lib/run-desk");
    const { loadPriceBook } = await import("@/lib/run-board.server");
    const { openGiayWith, giayBalance } = await import("@/lib/token-flow");
    const { releaseStaleWith } = await import("@/lib/run-ticket");
    const { formatGiay } = await import("@/lib/token-math");
    const { polishIdsFor } = await import("@/lib/polish-models");
    const sql = await getSql();
    const desk = parseRunDesk((await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`)[0]?.value);
    if (desk.maintenance) throw new Error(desk.note || "Cửa trả theo lượt đang bảo trì.");
    const allowed = polishIdsFor(parsePolishModels((await sql<{ value: string }>`select value from room_settings where key = 'polish_models'`)[0]?.value), data.genre);
    if (!allowed?.includes(data.model)) throw new Error("Model này chưa được mở để trau chuốt cho thể loại này.");
    // Mọi nhà: nhà của model, key và danh sách phòng tra theo bảng chung (room-turn.ts), giá theo bảng của đúng nhà.
    const { loadRoomHouses, loadProviderRows } = await import("@/lib/price-books.server");
    const { roomUse } = await import("@/lib/room-turn");
    const { bareBookOf } = await import("@/lib/price-rows");
    const use = roomUse(await loadRoomHouses(sql), data.model, "chat");
    if ("error" in use) throw new Error(use.error);
    const book = await loadPriceBook(sql);
    if (!book) throw new Error("Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
    const hold = polishHold(bareBookOf(use.provider, book, await loadProviderRows(sql)), data.model, tokens.inn, tokens.out, book);
    if (hold == null) throw new Error("Chưa có giá bản Turbo hoặc model này chưa có giá gốc.");
    const id = randomBytes(12).toString("hex");
    await releaseStaleWith(sql, context.userId);
    const opened = await openGiayWith(sql, {
      id,
      userId: context.userId,
      fileName: "Trau chuốt bản dịch",
      seconds: 0,
      rate: Math.max(1, Math.round(hold)),
      hold,
      asrModel: "",
      chatModel: data.model,
    });
    if ("error" in opened) throw new Error(`Chưa đủ Token dịch. Lần này cần giữ ${formatGiay(hold)}. Hãy mua Token dịch ở Tài khoản.`);
    return { id, held: hold, balance: await giayBalance(sql, context.userId) };
  });

export type PolishChoiceView = {
  id: string;
  name: string;
  ready: boolean;
  reason: string | null;
  /** Token dịch ước cho cả lần trau chuốt này. null khi chưa ước được. */
  tokens: number | null;
  /** Model này có trong cửa trả theo lượt (key phòng) không. */
  inRoom: boolean;
};
export type PolishQuoteView = { rows: PolishChoiceView[]; note: string };

/** Giá ước từng model Chủ đã mở cho thể loại này, bằng Token dịch, theo số token ước của lần trau chuốt hiện tại. */
export const quotePolishChoices = createServerFn({ method: "POST" })
  .validator((input: { genre: string; sendable: number; batches: number; inn: number; out: number }) => {
    const tokens = validPolishTokens(input?.inn, input?.out);
    if (!tokens) throw new Error("Số lượng cần trau chuốt không đúng.");
    const sendable = Math.max(0, Math.min(100000, Math.floor(Number(input.sendable) || 0)));
    const batches = Math.max(0, Math.min(100000, Math.floor(Number(input.batches) || 0)));
    return { genre: String(input.genre || "").trim().slice(0, 40), sendable, batches, inn: tokens.inn, out: tokens.out };
  })
  .handler(async ({ data }): Promise<PolishQuoteView> => {
    const { polishChoices, polishIdsFor, polishNoModelText } = await import("@/lib/polish-models");
    const { getSql } = await import("@/lib/db");
    const { loadPriceBook } = await import("@/lib/run-board.server");
    const sql = await getSql();
    const models = parsePolishModels((await sql<{ value: string }>`select value from room_settings where key = 'polish_models'`)[0]?.value);
    const ids = polishIdsFor(models, data.genre) ?? [];
    if (!ids.length) return { rows: [], note: polishNoModelText(models, data.genre) };
    const book = (await loadPriceBook(sql)) ?? undefined;
    const { loadRoomHouses, loadProviderRows } = await import("@/lib/price-books.server");
    const { roomUse, offerOf } = await import("@/lib/room-turn");
    const { bareBookOf } = await import("@/lib/price-rows");
    const { providerOfModel } = await import("@/lib/sub/room-models");
    const houses = await loadRoomHouses(sql);
    const rows = await loadProviderRows(sql);
    const plan = { sendable: data.sendable, batches: data.batches, inn: data.inn, out: data.out };
    const chatBookFor = (id: string) => (book ? bareBookOf(providerOfModel(id, offerOf(houses)) ?? "groq", book, rows) : undefined);
    const choices = polishChoices({ ids, plan, chatBook: book, groqBook: book, chatBookFor });
    return {
      rows: choices.map((choice) => ({
        id: choice.id,
        name: choice.name,
        ready: choice.quote.ready,
        reason: choice.quote.reason,
        tokens: choice.quote.tokens,
        inRoom: !("error" in roomUse(houses, choice.id, "chat")),
      })),
      note: "",
    };
  });
