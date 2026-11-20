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
    const { parseRunDesk, parseModelList } = await import("@/lib/run-desk");
    const { dearestChatModel: pickChat } = await import("@/lib/run-bill");
    const { holdGiay, formatGiay } = await import("@/lib/token-math");
    const { loadPriceBook } = await import("@/lib/run-board.server");
    const { loadAlibabaRows } = await import("@/lib/sub/alibaba-board.server");
    const { openGiayWith, giayBalance } = await import("@/lib/token-flow");
    const { releaseStaleWith } = await import("@/lib/run-ticket");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const desk = parseRunDesk(saved[0]?.value);
    if (desk.maintenance) throw new Error(desk.note || "Cửa trả theo lượt đang bảo trì.");
    const offered = await sql<{ value: string }>`select value from room_settings where key = 'run_models'`;
    const models = parseModelList(offered[0]?.value);
    if (!models) throw new Error("Phòng chưa đồng bộ danh sách model cho cửa trả theo lượt.");
    const { asrHouse } = await import("@/lib/sub/asr-house");
    const aliAsr = data.asrModel === "qwen-audio-3.0-asr-flash-filetrans";
    const dgAsr = asrHouse(data.asrModel) === "deepgram";
    const aaiAsr = asrHouse(data.asrModel) === "assemblyai";
    const smAsr = asrHouse(data.asrModel) === "speechmatics";
    const sxAsr = asrHouse(data.asrModel) === "soniox";
    const auto = data.chatModel === "auto";
    if ((!aliAsr && !dgAsr && !aaiAsr && !smAsr && !sxAsr && !models.includes(data.asrModel)) || (!auto && !models.includes(data.chatModel))) {
      const { roomRefusal } = await import("@/lib/sub/room-models");
      const asrOff = !aliAsr && !dgAsr && !aaiAsr && !smAsr && !sxAsr && !models.includes(data.asrModel);
      throw new Error(roomRefusal(asrOff ? data.asrModel : data.chatModel));
    }
    const book = await loadPriceBook(sql);
    if (!book) throw new Error("Chưa có bảng giá để tính tiền. Hãy thử lại sau.");
    const bare = { rate: book.rate, rows: book.rows, desk: { markup: 0 as const, custom: {} } };
    const aliRows = await loadAlibabaRows(sql);
    let hold: number | null = null;
    if (dgAsr) {
      const dgKey = await sql<{ value: string }>`select value from room_settings where key = 'deepgram_key'`;
      if (!dgKey[0]?.value?.trim()) throw new Error("Phòng chưa lưu key Deepgram.");
      const offeredDg = parseModelList((await sql<{ value: string }>`select value from room_settings where key = 'deepgram_models'`)[0]?.value);
      if (offeredDg && !offeredDg.includes(data.asrModel)) throw new Error(`Model ${data.asrModel} không có trong cửa trả theo lượt (key phòng chưa có model này).`);
      const { loadDeepgramRows } = await import("@/lib/sub/deepgram-board.server");
      const dgRows = await loadDeepgramRows(sql);
      const chatModel = auto ? pickChat(bare, models) : data.chatModel;
      hold = chatModel ? holdGiay({ groq: book, aliRows, dgRows, asrProvider: "deepgram", asrModel: data.asrModel, chatModel, seconds: data.seconds }) : null;
    } else if (aaiAsr) {
      const aaiKey = await sql<{ value: string }>`select value from room_settings where key = 'assemblyai_key'`;
      if (!aaiKey[0]?.value?.trim()) throw new Error("Phòng chưa lưu key AssemblyAI.");
      const offeredAai = parseModelList((await sql<{ value: string }>`select value from room_settings where key = 'assemblyai_models'`)[0]?.value);
      if (offeredAai && !offeredAai.includes(data.asrModel)) throw new Error(`Model ${data.asrModel} không có trong cửa trả theo lượt (key phòng chưa có model này).`);
      const { loadAssemblyaiRows } = await import("@/lib/sub/assemblyai-board.server");
      const aaiRows = await loadAssemblyaiRows(sql);
      const chatModel = auto ? pickChat(bare, models) : data.chatModel;
      hold = chatModel ? holdGiay({ groq: book, aliRows, aaiRows, asrProvider: "assemblyai", asrModel: data.asrModel, chatModel, seconds: data.seconds }) : null;
    } else if (smAsr) {
      const smKey = await sql<{ value: string }>`select value from room_settings where key = 'speechmatics_key'`;
      if (!smKey[0]?.value?.trim()) throw new Error("Phòng chưa lưu key Speechmatics.");
      const offeredSm = parseModelList((await sql<{ value: string }>`select value from room_settings where key = 'speechmatics_models'`)[0]?.value);
      if (offeredSm && !offeredSm.includes(data.asrModel)) throw new Error(`Model ${data.asrModel} không có trong cửa trả theo lượt (key phòng chưa có model này).`);
      const { loadSpeechmaticsRows } = await import("@/lib/sub/speechmatics-board.server");
      const smRows = await loadSpeechmaticsRows(sql);
      const chatModel = auto ? pickChat(bare, models) : data.chatModel;
      hold = chatModel ? holdGiay({ groq: book, aliRows, smRows, asrProvider: "speechmatics", asrModel: data.asrModel, chatModel, seconds: data.seconds }) : null;
    } else if (sxAsr) {
      const sxKey = await sql<{ value: string }>`select value from room_settings where key = 'soniox_key'`;
      if (!sxKey[0]?.value?.trim()) throw new Error("Phòng chưa lưu key Soniox.");
      const offeredSx = parseModelList((await sql<{ value: string }>`select value from room_settings where key = 'soniox_models'`)[0]?.value);
      if (offeredSx && !offeredSx.includes(data.asrModel)) throw new Error(`Model ${data.asrModel} không có trong cửa trả theo lượt (key phòng chưa có model này).`);
      const { loadSonioxRows } = await import("@/lib/sub/soniox-board.server");
      const sxRows = await loadSonioxRows(sql);
      const chatModel = auto ? pickChat(bare, models) : data.chatModel;
      hold = chatModel ? holdGiay({ groq: book, aliRows, sxRows, asrProvider: "soniox", asrModel: data.asrModel, chatModel, seconds: data.seconds }) : null;
    } else if (aliAsr) {
      const aliKey = await sql<{ value: string }>`select value from room_settings where key = 'alibaba_key'`;
      if (!aliKey[0]?.value?.trim()) throw new Error("Phòng chưa lưu key Alibaba.");
      const chatModel = auto ? pickChat(bare, models) : data.chatModel;
      hold = chatModel ? holdGiay({ groq: book, aliRows, asrProvider: "alibaba", asrModel: data.asrModel, chatModel, seconds: data.seconds }) : null;
    } else {
      const chatModel = auto ? pickChat(bare, models) : data.chatModel;
      hold = chatModel ? holdGiay({ groq: book, aliRows, asrProvider: "groq", asrModel: data.asrModel, chatModel, seconds: data.seconds }) : null;
    }
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
