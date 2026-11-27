import type { Sql } from "../db.ts";
import { inTransaction } from "../db-tx.ts";
import { LEASE_STALE } from "./work-lease.ts";

const PAGE_SIZE = 20;
const CALL_ID = /^[a-f0-9]{24}$/;

export function readChatReview(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("Hồ sơ đối soát không hợp lệ.");
  const { id, usd, evidence } = input as Record<string, unknown>;
  if (
    typeof id !== "string" ||
    !CALL_ID.test(id) ||
    typeof usd !== "string" ||
    !/^\d{1,9}(?:\.\d{1,6})?$/.test(usd) ||
    typeof evidence !== "string" ||
    evidence.trim().length < 12 ||
    evidence.length > 500
  ) {
    throw new Error("Nhập số USD đã xác minh và bằng chứng từ 12 đến 500 ký tự.");
  }
  const [whole, fraction = ""] = usd.split(".");
  return {
    id,
    usdMicro: Number(whole) * 1_000_000 + Number(fraction.padEnd(6, "0")),
    evidence: evidence.trim(),
  };
}

export function readChatReviewCursor(after: unknown) {
  if (after === undefined) return null;
  if (typeof after === "string" && after.length < 64) {
    const [at, id, extra] = after.split("|");
    if (
      extra === undefined &&
      CALL_ID.test(id ?? "") &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(at) &&
      Number.isFinite(Date.parse(at))
    )
      return { at, id };
  }
  throw new Error("Vị trí trang đối soát không hợp lệ.");
}

async function lockReviewOwner(tx: Sql, actorId: string) {
  if (
    !(await tx`select 1 from room_staff where user_id = ${actorId} and role = 'chu' for share`)
      .length
  ) {
    throw new Error("Không đủ quyền.");
  }
}

export function listChatReviews(
  sql: Sql,
  actorId: string,
  cursor: ReturnType<typeof readChatReviewCursor>,
) {
  return inTransaction(sql, async (tx) => {
    await lockReviewOwner(tx, actorId);
    return readReviewPage(tx, cursor);
  });
}

async function readReviewPage(sql: Sql, cursor: ReturnType<typeof readChatReviewCursor>) {
  const rows = await sql<{
    id: string;
    at: string;
    userId: string;
    provider: string;
    model: string;
    legacy: boolean;
    estimatedUnits: string | null;
    reportedUsdMicro: string | null;
  }>`
    select o.call_id as id, to_char(o.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at,
      o.user_id as "userId", o.provider, o.model, o.legacy, o.estimated_units::text as "estimatedUnits",
      o.reported_usd_micro::text as "reportedUsdMicro"
    from run_chat_obligations o left join run_gate_calls c on c.id = o.call_id
    where (o.status = 'pending' or (o.status = 'active' and
      (c.id is null or c.status <> 'dang-chay' or c.heartbeat_at <= clock_timestamp() - ${LEASE_STALE}::interval)))
      and (${cursor?.at ?? null}::timestamptz is null or (o.created_at, o.call_id) > (${cursor?.at ?? null}::timestamptz, ${cursor?.id ?? ""}))
    order by o.created_at, o.call_id limit ${PAGE_SIZE + 1}`;
  const items = rows.slice(0, PAGE_SIZE);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > PAGE_SIZE && last ? `${last.at}|${last.id}` : null };
}

/** Posts verified supplier expense only. The customer wallet and reservation are outside this operation. */
export async function reviewChatObligation(
  sql: Sql,
  actorId: string,
  review: ReturnType<typeof readChatReview>,
) {
  return inTransaction(sql, async (tx) => {
    // Recheck under a lock so concurrent role revocation cannot pass the write boundary.
    await lockReviewOwner(tx, actorId);
    const [ref] = await tx<{
      ticket_id: string;
    }>`select ticket_id from run_chat_obligations where call_id = ${review.id}`;
    if (!ref) return "unavailable";
    await tx`select id from run_tickets where id = ${ref.ticket_id} for update`;
    const [call] = await tx<{ active: boolean }>`
      select (status = 'dang-chay' and heartbeat_at > clock_timestamp() - ${LEASE_STALE}::interval) as active
      from run_gate_calls where id = ${review.id} for update`;
    const [row] = await tx<{
      status: string;
      user_id: string;
      legacy: boolean;
      verified_usd_micro: string | null;
      evidence: string | null;
    }>`
      select status, user_id, legacy, verified_usd_micro::text, evidence from run_chat_obligations
      where call_id = ${review.id} for update`;
    if (!row) return "unavailable";
    if (row.status === "reviewed") {
      return row.verified_usd_micro === String(review.usdMicro) && row.evidence === review.evidence
        ? "replay"
        : "conflict";
    }
    if (call?.active) return "unavailable";

    await tx`update run_chat_obligations set status = 'reviewed', verified_usd_micro = ${review.usdMicro},
      reviewed_at = clock_timestamp(), reviewed_by = ${actorId}, evidence = ${review.evidence}
      where call_id = ${review.id}`;
    if (!row.legacy && review.usdMicro > 0) {
      await tx`insert into provider_spend_events (id, day, provider, model, base_vnd, usd_micro)
        select ${`chat-review:${review.id}`}, (created_at at time zone 'Asia/Ho_Chi_Minh')::date,
          provider, model, rate_vnd * ${review.usdMicro}::numeric / 1000000, ${review.usdMicro}
        from run_chat_obligations where call_id = ${review.id}`;
    }
    await tx`insert into room_audit (actor_id, actor_role, action, target_id, note)
      values (${actorId}, 'chu', 'doi-soat-chi-phi-dich', ${row.user_id}, ${JSON.stringify({
        callId: review.id,
        verifiedUsdMicro: review.usdMicro,
        evidence: review.evidence,
        legacy: row.legacy,
      })})`;
    return "reviewed";
  });
}
