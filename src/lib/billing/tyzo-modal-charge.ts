/**
 * THU TIỀN MỘT ĐOẠN TYZO MODAL trên phiếu Trả theo lượt. Tách khỏi cửa máy chủ để thử được trên Postgres thật.
 *
 * Thứ tự: (1) ghi đoạn vào run_modal_parts theo (phiếu, mã băm âm thanh) — đoạn đã xong thì trả lại kết quả cũ,
 * không gọi GPU, không trừ; đoạn đang chạy thì từ chối gửi trùng; (2) cộng thời lượng vào phiếu, không quá thời
 * lượng đã giữ; còn phải giữ đủ Token cho ước tính đoạn này; (3) gọi Modal; lỗi thì trả lại thời lượng và xóa đoạn;
 * (4) trừ Token theo số thực; phiếu không còn đủ thì trừ phần còn lại và ghi phần thiếu vào modal_short.
 * Kiểm toán v5.49: bước (2) giữ riêng ước tính từng đoạn (modal_reserved), bước (4) là một giao dịch,
 * và khách đóng phiếu lúc đoạn còn chạy thì đoạn cuối xong mới đóng (closeTokenWith).
 */
import type { Sql } from "../db.ts";
import { inTransaction } from "../db-tx.ts";
import { chargeTokenWith, closeTokenWith } from "./token-flow.ts";

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

  // Ước tính đoạn này (không làm tròn từng đoạn, để tổng các đoạn không vượt phần giữ của cả phim chỉ vì làm tròn).
  const need = Math.max(0, Number(input.estimateTokens(price)) || 0);
  // MAIN-023: giữ riêng phần ước tính của đoạn ngay trong một câu lệnh. Đoạn mới chỉ được gọi GPU khi phần giữ còn lại,
  // SAU KHI trừ các đoạn đang chạy, còn đủ. Phiếu đang chờ đóng thì không nhận đoạn mới.
  const took = await sql`
    with t as (
      update run_tickets set modal_seconds = modal_seconds + ${seconds}, modal_reserved = modal_reserved + ${need}::numeric
      where id = ${ticket} and user_id = ${userId} and status = 'dang-giu' and unit = 'token' and not close_wanted
        and held - modal_reserved >= ${need}::numeric and modal_seconds + ${seconds} <= seconds + 1
      returning id
    )
    update run_modal_parts p set reserved = ${need}::numeric
    from t where p.ticket_id = t.id and p.part_hash = ${partHash}
    returning 1`;
  if (!took.length) {
    await sql`delete from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash}`;
    throw new Error("Phiếu Modal đã hết, đã đóng hoặc không còn đủ Token cho đoạn này.");
  }

  let result: Awaited<ReturnType<typeof recognize>>;
  try {
    result = await recognize(price);
  } catch (error) {
    await releasePart(sql, ticket, userId, partHash, seconds);
    throw error;
  }

  // MAIN-024: trừ Token, ghi phần thiếu, nhả phần giữ riêng và lưu chữ của đoạn trong MỘT giao dịch.
  // Lỗi giữa chừng thì không trừ gì và bỏ đoạn để gửi lại (không có chuyện mất Token mà không có chữ).
  const tokens = Math.max(0, Math.ceil(result.tokens));
  let taken = 0;
  try {
    taken = await inTransaction(sql, async (tx) => {
      const got = tokens > 0 ? await chargeTokenWith(tx, ticket, userId, tokens) : 0;
      await tx`update run_tickets set modal_short = modal_short + ${Math.max(0, tokens - got)},
                 modal_reserved = greatest(0, modal_reserved - coalesce((select reserved from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash}), 0))
               where id = ${ticket}`;
      await tx`update run_modal_parts set status = 'xong', tokens = ${got}, reserved = 0, segments = ${JSON.stringify(result.segments)}
               where ticket_id = ${ticket} and part_hash = ${partHash}`;
      return got;
    });
  } catch (error) {
    await releasePart(sql, ticket, userId, partHash, seconds);
    throw error;
  }
  const short = Math.max(0, tokens - taken);
  await closeIfWanted(sql, ticket, userId);
  return { segments: result.segments, tokens: taken, short, reused: false };
}

/** Đoạn lỗi: trả lại thời lượng và phần giữ riêng, bỏ đoạn (gửi lại được). Một câu lệnh. */
async function releasePart(sql: Sql, ticket: string, userId: string, partHash: string, seconds: number) {
  await sql`
    with p as (
      delete from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash} and status <> 'xong'
      returning reserved
    )
    update run_tickets set modal_seconds = greatest(0, modal_seconds - ${seconds}),
      modal_reserved = greatest(0, modal_reserved - coalesce((select sum(reserved) from p), 0))
    where id = ${ticket} and user_id = ${userId}`;
  await closeIfWanted(sql, ticket, userId);
}

/** Khách đã bấm đóng lúc đoạn còn chạy: đoạn cuối xong thì đóng phiếu (trả phần dư). Còn đoạn khác chạy thì để đoạn đó đóng. */
async function closeIfWanted(sql: Sql, ticket: string, userId: string) {
  const want = await sql<{ close_failed: boolean }>`
    select close_failed from run_tickets where id = ${ticket} and user_id = ${userId} and status = 'dang-giu' and close_wanted`;
  if (want.length) await closeTokenWith(sql, ticket, userId, Boolean(want[0].close_failed));
}
