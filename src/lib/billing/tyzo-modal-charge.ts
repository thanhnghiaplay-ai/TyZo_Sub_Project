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
import { randomBytes } from "node:crypto";
import { inTransaction } from "../db-tx.ts";
import { LEASE_STALE, startBeat } from "./work-lease.ts";
import { chargeTokenWith, closeIfWantedWith } from "./token-flow.ts";

export type ModalPartResult = {
  segments: { text: string; start: number; end: number }[];
  tokens: number;
  short: number;
  reused: boolean;
};

export async function runAdmittedModalPartWith(
  sql: Sql,
  input: {
    ticket: string;
    userId: string;
    model: string;
    partHash: string;
    seconds: number;
    estimateTokens: (price: string) => number;
    /** Chỉ để test: nhịp sống (ms). Mặc định LEASE_BEAT_MS. */
    beatMs?: number;
  },
  recognize: (price: string, attempt: string) => Promise<{ segments: ModalPartResult["segments"]; tokens: number }>,
): Promise<ModalPartResult> {
  const { withWorkAdmission } = await import("./work-admission.ts");
  return withWorkAdmission(
    sql,
    { userId: input.userId, provider: "tyzo-modal", model: input.model, lane: "modal" },
    () => runModalPartWith(sql, input, recognize),
  );
}

export async function runModalPartWith(
  sql: Sql,
  input: {
    ticket: string;
    userId: string;
    model: string;
    partHash: string;
    seconds: number;
    estimateTokens: (price: string) => number;
    /** Chỉ để test: nhịp sống (ms). Mặc định LEASE_BEAT_MS. */
    beatMs?: number;
  },
  recognize: (price: string, attempt: string) => Promise<{ segments: ModalPartResult["segments"]; tokens: number }>,
): Promise<ModalPartResult> {
  const { ticket, userId, model, partHash, seconds } = input;
  const own = await sql<{ modal_price: string | null; held: number }>`
    select modal_price, held from run_tickets
    where id = ${ticket} and user_id = ${userId} and asr_model = ${model} and unit = 'token'`;
  if (!own.length || !own[0].modal_price) throw new Error("Phiếu Modal không hợp lệ.");
  const price = own[0].modal_price;
  // Chữ nhận dạng giữ để chống trừ lặp chỉ cần trong lúc chạy; xóa sau 24 giờ (điều khoản mục dữ liệu).
  await sql`delete from run_modal_parts where created_at < now() - interval '24 hours' and status = 'xong'`;
  // RE-001: đoạn mất nhịp (tiến trình đã chết, không ai quyết toán được nữa) trả lại phần giữ và thời lượng cho phiếu.
  await reapStale(sql, ticket);

  // Mã lượt (fencing): chỉ lượt đang giữ mã mới được ghi nhịp, quyết toán hay bỏ đoạn.
  const attempt = randomBytes(9).toString("hex");
  const seen = await sql<{ status: string; tokens: number; segments: string | null }>`
    insert into run_modal_parts (ticket_id, part_hash, seconds, attempt, heartbeat_at) values (${ticket}, ${partHash}, ${seconds}, ${attempt}, now())
    on conflict (ticket_id, part_hash) do nothing
    returning status, tokens, segments`;
  if (!seen.length) {
    const old = await sql<{ status: string; tokens: number; segments: string | null }>`
      select status, tokens, segments from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash}`;
    if (old[0]?.status === "xong" && old[0].segments) {
      return {
        segments: JSON.parse(old[0].segments),
        tokens: old[0].tokens,
        short: 0,
        reused: true,
      };
    }
    throw new Error("Đoạn này đang được nhận dạng. Vui lòng chờ.");
  }

  // Ước tính đoạn này (không làm tròn từng đoạn, để tổng các đoạn không vượt phần giữ của cả phim chỉ vì làm tròn).
  const rawNeed = input.estimateTokens(price);
  if (!Number.isFinite(rawNeed) || rawNeed <= 0 || !Number.isFinite(seconds) || seconds <= 0) {
    await sql`delete from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash} and attempt = ${attempt}`;
    throw new Error("Ước tính đoạn nhận dạng không hợp lệ.");
  }
  const need = Math.ceil(rawNeed);
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
    from t where p.ticket_id = t.id and p.part_hash = ${partHash} and p.attempt = ${attempt}
    returning 1`;
  if (!took.length) {
    await sql`delete from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash} and attempt = ${attempt}`;
    throw new Error("Phiếu Modal đã hết, đã đóng hoặc không còn đủ Token cho đoạn này.");
  }

  try {
    await sql`insert into run_modal_settlements(attempt, ticket_id, part_hash) values (${attempt}, ${ticket}, ${partHash})`;
  } catch (error) {
    await releasePart(sql, ticket, userId, partHash, attempt);
    throw error;
  }

  // RE-001: ghi nhịp sống trong suốt lúc GPU chạy (có thể quá 15 phút); phiếu chỉ đóng khi đoạn hết nhịp hoặc xong.
  const stopBeat = startBeat(
    () =>
      sql`update run_modal_parts set heartbeat_at = now() where ticket_id = ${ticket} and part_hash = ${partHash} and attempt = ${attempt} and status <> 'xong' and heartbeat_at > clock_timestamp() - ${LEASE_STALE}::interval`,
    input.beatMs,
  );
  try {
    let result: Awaited<ReturnType<typeof recognize>>;
    try {
      result = await recognize(price, attempt);
    } catch (error) {
      await releasePart(sql, ticket, userId, partHash, attempt);
      throw error;
    }

    // MAIN-024: trừ Token, ghi phần thiếu, nhả phần giữ riêng và lưu chữ của đoạn trong MỘT giao dịch.
    // RE-001: nhận đoạn bằng mã lượt TRƯỚC khi trừ; lượt đã bị thay (mất nhịp, có lượt khác nhận) thì không trừ gì.
    if (!Number.isFinite(result.tokens) || result.tokens < 0) {
      await releasePart(sql, ticket, userId, partHash, attempt);
      throw new Error("Số Token nhận dạng không hợp lệ.");
    }
    const tokens = Math.ceil(result.tokens);
    let settled: { taken: number; owned: boolean };
    try {
      settled = await inTransaction(sql, async (tx) => {
        const tickets = await tx<{ held: number; modal_reserved: string; status: string }>`
        select held, modal_reserved, status from run_tickets where id = ${ticket} and user_id = ${userId} for update`;
        const observation = await tx<{ observed_at: unknown; charged_tokens: number }>`
        select observed_at, charged_tokens from run_modal_settlements where attempt = ${attempt} for update`;
        if (observation[0]?.observed_at)
          return { taken: Number(observation[0].charged_tokens), owned: true };
        const mine = await tx<{ reserved: string }>`
        update run_modal_parts set status = 'xong', segments = ${JSON.stringify(result.segments)}, heartbeat_at = now()
        where ticket_id = ${ticket} and part_hash = ${partHash} and attempt = ${attempt} and status <> 'xong' and heartbeat_at > clock_timestamp() - ${LEASE_STALE}::interval
        returning reserved`;
        if (!mine.length) {
          await tx`update run_modal_settlements set status = 'can-doi-soat', actual_tokens = ${tokens}, short_tokens = ${tokens}, observed_at = clock_timestamp() where attempt = ${attempt}`;
          await tx`update run_tickets set modal_short = modal_short + ${tokens} where id = ${ticket}`;
          return { taken: 0, owned: false };
        }
        const ownReserved = Number(mine[0].reserved);
        const available =
          tickets[0]?.status === "dang-giu"
            ? Math.max(
                0,
                tickets[0].held - Math.max(0, Number(tickets[0].modal_reserved) - ownReserved),
              )
            : 0;
        const debit = Math.max(0, Math.floor(Math.min(tokens, ownReserved, available)));
        const got = debit > 0 ? await chargeTokenWith(tx, ticket, userId, debit, ownReserved) : 0;
        await tx`update run_tickets set modal_short = modal_short + ${Math.max(0, tokens - got)},
                 modal_reserved = greatest(0, modal_reserved - ${Number(mine[0].reserved)}::numeric)
               where id = ${ticket}`;
        await tx`update run_modal_parts set tokens = ${got}, reserved = 0 where ticket_id = ${ticket} and part_hash = ${partHash} and attempt = ${attempt}`;
        await tx`update run_modal_settlements set status = ${got < tokens ? "can-doi-soat" : "xong"}, actual_tokens = ${tokens},
        charged_tokens = ${got}, short_tokens = ${Math.max(0, tokens - got)}, observed_at = clock_timestamp() where attempt = ${attempt}`;
        return { taken: got, owned: true };
      });
    } catch (error) {
      await releasePart(sql, ticket, userId, partHash, attempt);
      throw error;
    }
    if (!settled.owned) {
      // Đoạn đã được lượt khác nhận (lượt này bị coi là chết): trả chữ cho khách, không trừ lần hai.
      return { segments: result.segments, tokens: 0, short: tokens, reused: true };
    }
    const short = Math.max(0, tokens - settled.taken);
    await closeIfWantedWith(sql, ticket, userId);
    return { segments: result.segments, tokens: settled.taken, short, reused: false };
  } finally {
    stopBeat();
  }
}

/** Đoạn mất nhịp quá LEASE_STALE: tiến trình đã chết. Trả phần giữ, thời lượng cho phiếu, bỏ đoạn (gửi lại được). */
async function reapStale(sql: Sql, ticket: string) {
  await inTransaction(sql, async (tx) => {
    await tx`select id from run_tickets where id = ${ticket} for update`;
    await tx`
    with p as (
      delete from run_modal_parts
      where ticket_id = ${ticket} and status <> 'xong' and heartbeat_at < now() - ${LEASE_STALE}::interval
      returning reserved, seconds, attempt
    ), marked as (
      update run_modal_settlements set status = 'mat-phan-hoi'
      where attempt in (select attempt from p) and observed_at is null returning 1
    )
    update run_tickets set modal_seconds = greatest(0, modal_seconds - coalesce((select sum(seconds) from p), 0)),
      modal_reserved = greatest(0, modal_reserved - coalesce((select sum(reserved) from p), 0))
    where id = ${ticket} and exists (select 1 from p) and (select count(*) from marked) >= 0`;
  });
}

/** Đoạn lỗi: trả lại thời lượng và phần giữ riêng, bỏ đoạn (gửi lại được). Một câu lệnh, chỉ đụng đúng lượt của mình. */
async function releasePart(
  sql: Sql,
  ticket: string,
  userId: string,
  partHash: string,
  attempt: string,
) {
  await inTransaction(sql, async (tx) => {
    await tx`select id from run_tickets where id = ${ticket} and user_id = ${userId} for update`;
    await tx`
    with p as (
      delete from run_modal_parts where ticket_id = ${ticket} and part_hash = ${partHash} and attempt = ${attempt} and status <> 'xong'
      returning reserved, seconds, attempt
    ), marked as (
      update run_modal_settlements set status = 'mat-phan-hoi'
      where attempt in (select attempt from p) and observed_at is null returning 1
    )
    update run_tickets set modal_seconds = greatest(0, modal_seconds - coalesce((select sum(seconds) from p), 0)),
      modal_reserved = greatest(0, modal_reserved - coalesce((select sum(reserved) from p), 0))
    where id = ${ticket} and user_id = ${userId} and exists (select 1 from p) and (select count(*) from marked) >= 0`;
  });
  await closeIfWantedWith(sql, ticket, userId);
}
