/**
 * THU TIỀN MỘT ĐOẠN TYZO MODAL trên phiếu Trả theo lượt. Tách khỏi cửa máy chủ để thử được trên Postgres thật.
 *
 * Thứ tự: (1) ghi đoạn vào run_modal_parts theo (phiếu, mã băm âm thanh) — đoạn đã xong thì trả lại kết quả cũ,
 * không gọi GPU, không trừ; đoạn đang chạy thì từ chối gửi trùng; (2) cộng thời lượng vào phiếu, không quá thời
 * lượng đã giữ; còn phải giữ đủ Token cho ước tính đoạn này; (3) gọi Modal; lỗi thì trả lại thời lượng và xóa đoạn;
 * (4) trừ Token theo số thực; phiếu không còn đủ thì trừ phần còn lại và ghi phần thiếu vào modal_short.
 */
import type { Sql } from "./db.ts";
import { chargeTokenWith } from "./token-flow.ts";

export type ModalPartResult = { segments: { text: string; start: number; end: number }[]; tokens: number; short: number; reused: boolean };

export async function runModalPartWith(
  sql: Sql,
  input: { ticket: string; userId: string; model: string; partHash: string; seconds: number; estimateTokens: (price: string) => number },
  recognize: (price: string) => Promise<{ segments: ModalPartResult["segments"]; tokens: number }>,
): Promise<ModalPartResult> {
  const { ticket, userId, model, partHash, seconds } = input;
  const own = await sql<{ modal_price: string | null; held: number }>`
    select modal_price, held from run_tickets
    where id = ${ticket} and user_id = ${userId} and asr_model = ${model} and unit = 'token'`;
  if (!own.length || !own[0].modal_price) throw new Error("Phiếu Modal không hợp lệ.");
  const price = own[0].modal_price;
  // Chữ nhận dạng giữ để chống trừ lặp chỉ cần trong lúc chạy; xóa sau 24 giờ (điều khoản mục dữ liệu).
  await sql`delete from run_modal_parts where created_at < now() - interval '24 hours'`;

  const seen = await sql<{ status: string; tokens: number; segments: string | null }>`
    insert into run_modal_parts (ticket_id, part_hash, seconds) values (${ticket}, ${partHash}, ${seconds})
    on conflict (ticket_id, part_hash) do nothing
    returning status, tokens, segments`;
  if (!seen.length) {
    const old = await sql<{ status: string; tokens: number; segments: string | null }>`
      select status, tokens, segments from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash}`;
    if (old[0]?.status === "xong" && old[0].segments) {
      return { segments: JSON.parse(old[0].segments), tokens: old[0].tokens, short: 0, reused: true };
    }
    throw new Error("Đoạn này đang được nhận dạng. Vui lòng chờ.");
  }

  const need = Math.max(1, Math.ceil(input.estimateTokens(price)));
  const took = await sql`
    update run_tickets set modal_seconds = modal_seconds + ${seconds}
    where id = ${ticket} and user_id = ${userId} and status = 'dang-giu' and unit = 'token'
      and held >= ${need} and modal_seconds + ${seconds} <= seconds + 1
    returning 1`;
  if (!took.length) {
    await sql`delete from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash}`;
    throw new Error("Phiếu Modal đã hết, đã đóng hoặc không còn đủ Token cho đoạn này.");
  }

  let result: Awaited<ReturnType<typeof recognize>>;
  try {
    result = await recognize(price);
  } catch (error) {
    await sql`update run_tickets set modal_seconds = greatest(0, modal_seconds - ${seconds}) where id = ${ticket} and user_id = ${userId}`;
    await sql`delete from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash}`;
    throw error;
  }

  const tokens = Math.max(0, Math.ceil(result.tokens));
  const taken = tokens > 0 ? await chargeTokenWith(sql, ticket, userId, tokens) : 0;
  const short = Math.max(0, tokens - taken);
  if (short > 0) await sql`update run_tickets set modal_short = modal_short + ${short} where id = ${ticket}`;
  await sql`update run_modal_parts set status = 'xong', tokens = ${taken}, segments = ${JSON.stringify(result.segments)}
            where ticket_id = ${ticket} and part_hash = ${partHash}`;
  return { segments: result.segments, tokens: taken, short, reused: false };
}
