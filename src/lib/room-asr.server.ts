import type { GroqLiveRow } from "@/lib/sub/groq-board";

/**
 * Phần chung của mọi nhà nhận dạng chạy bằng key phòng ở cửa Trả theo lượt:
 * kiểm phiếu giữ chỗ và trừ Token dịch theo số giây thực. Nhà mới (Alibaba, Deepgram, ...) dùng chung, không viết lại.
 */
export async function assertRoomTicket(userId: string, ticketId: string | undefined) {
  if (!ticketId || !/^[a-f0-9]{24}$/.test(ticketId)) throw new Error("Thiếu phiếu giữ chỗ. Hãy bấm chạy lại.");
  const { getSql } = await import("@/lib/db");
  const { ticketLive } = await import("@/lib/run-ticket");
  const sql = await getSql();
  if (!(await ticketLive(sql, ticketId, userId))) throw new Error("Phiếu đã đóng hoặc không còn phần giữ.");
}

/** Key phòng của một nhà, đọc từ room_settings. Thiếu thì báo bằng tiếng Việt. */
export async function roomKeyOf(settingKey: string, label: string, minLength: number): Promise<string> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from room_settings where key = ${settingKey}`;
  const key = rows[0]?.value?.trim() || "";
  if (key.length < minLength) throw new Error(`Phòng chưa lưu key ${label}.`);
  return key;
}

/** Trừ tiền nhận dạng của một phiếu. `rows` là bảng giá của nhà đó, `deskKey` là khóa chứa phần trăm chênh của nhà. */
export async function chargeRoomAsr(input: { userId: string; ticketId: string; seconds: number; model: string; rows: GroqLiveRow[]; deskKey: string }) {
  const { getSql } = await import("@/lib/db");
  const { loadPriceBook } = await import("@/lib/run-board.server");
  const { parseRunDesk } = await import("@/lib/run-desk");
  const { asrCost } = await import("@/lib/run-bill");
  const { chargeTicketWith } = await import("@/lib/run-ticket");
  const sql = await getSql();
  const live = await loadPriceBook(sql);
  if (!live) return;
  const deskRaw = await sql<{ value: string }>`select value from room_settings where key = ${input.deskKey}`;
  const desk = parseRunDesk(deskRaw[0]?.value);
  const book = { rate: live.rate, rows: input.rows, desk: { markup: desk.markup, custom: {} } };
  const bare = { ...book, desk: { markup: 0, custom: {} } };
  const cost = asrCost(book, input.model, input.seconds);
  const base = asrCost(bare, input.model, input.seconds) ?? 0;
  const unit = await sql<{ unit: string }>`select unit from run_tickets where id = ${input.ticketId} and user_id = ${input.userId}`;
  if (unit[0]?.unit === "token") {
    const { giayForBaseCost } = await import("@/lib/token-math");
    const giay = giayForBaseCost(live, base);
    if (giay && giay > 0) {
      const { chargeTokenWith } = await import("@/lib/token-flow");
      await chargeTokenWith(sql, input.ticketId, input.userId, giay);
    }
    return;
  }
  if (cost && cost > 0) await chargeTicketWith(sql, input.ticketId, input.userId, cost, base);
}
