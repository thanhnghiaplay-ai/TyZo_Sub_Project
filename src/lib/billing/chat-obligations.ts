import type { Sql } from "../db.ts";

// No setting is installed by the migration. Both limits require explicit approval.
export async function chatRiskAvailable(tx: Sql, userId: string, estimate: number) {
  const [setting] = await tx<{ value: string }>`
    select value from room_settings where key = 'chat_obligation_budget' for share`;
  if (!setting) return true;

  const limits = JSON.parse(setting.value) as { perUser?: number; total?: number } | null;
  const perUser = limits?.perUser;
  const total = limits?.total;
  if (
    typeof perUser !== "number" ||
    typeof total !== "number" ||
    !Number.isSafeInteger(perUser) ||
    !Number.isSafeInteger(total) ||
    perUser < 1 ||
    total < perUser
  ) {
    throw new Error("Giới hạn đối soát Token chưa hợp lệ.");
  }

  // Ticket -> global budget -> call/obligation. Only new reservations increase this sum.
  // READ COMMITTED takes a fresh snapshot in the statement after acquiring the lock.
  await tx`select pg_advisory_xact_lock(84201913)`;
  const [result] = await tx<{ available: boolean }>`
    select count(*) filter (where estimated_units is null) = 0 and
      coalesce(sum(estimated_units), 0) + ${estimate}::numeric <= ${total}::numeric and
      coalesce(sum(estimated_units) filter (where user_id = ${userId}), 0) + ${estimate}::numeric <= ${perUser}::numeric
      as available
    from run_chat_obligations where status in ('active', 'pending')`;
  return result.available;
}

export async function markChatObligationPending(
  tx: Sql,
  callId: string,
  reportedUsdMicro: number | null = null,
) {
  await tx`update run_chat_obligations
    set status = 'pending', reported_usd_micro = coalesce(${reportedUsdMicro}::bigint, reported_usd_micro)
    where call_id = ${callId} and status in ('active', 'pending')`;
}
