/** A provider has already performed the work: persist its numeric cost before any best-effort aggregation. */
import { randomBytes } from "node:crypto";
import type { Sql } from "./db.ts";
import { inTransaction } from "./db-tx.ts";

export type SpendObservation = {
  id?: string;
  provider: string;
  model: string;
  baseVnd: number;
  rate: number;
};

/** Cộng một quan sát đã lưu vào tổng hợp ngày (một lần). Trả false khi đã cộng hoặc không có. */
export async function postObservation(sql: Sql, id: string) {
  return inTransaction(sql, async (tx) => {
    const rows = await tx<{
      day: string;
      provider: string;
      model: string;
      base_vnd: string;
      usd_micro: string;
      posted_at: unknown;
    }>`
      select day::text as day,provider,model,base_vnd,usd_micro,posted_at from provider_spend_events where id=${id} for update`;
    const row = rows[0];
    if (!row || row.posted_at) return false;
    await tx`insert into provider_spend(day,provider,model,calls,base_vnd,usd_micro)
      values(${row.day},${row.provider},${row.model},1,${row.base_vnd},${row.usd_micro})
      on conflict(day,provider,model) do update set calls=provider_spend.calls+1,
      base_vnd=provider_spend.base_vnd+excluded.base_vnd,usd_micro=provider_spend.usd_micro+excluded.usd_micro`;
    await tx`update provider_spend_events set posted_at=clock_timestamp(),tries=tries+1,last_error_code='' where id=${id}`;
    return true;
  });
}

export async function noteFailure(sql: Sql, id: string, error: unknown) {
  const raw = (error as { code?: unknown })?.code;
  const code = typeof raw === "string" && /^[A-Z0-9]{5}$/.test(raw) ? raw : "POST_FAILED";
  try {
    await sql`update provider_spend_events set tries=tries+1,last_error_code=${code} where id=${id} and posted_at is null`;
  } catch (secondary) {
    throw new AggregateError(
      [error, secondary],
      "Lỗi ghi tổng hợp và ghi trạng thái chi phí; cần đối soát.",
    );
  }
  console.warn("provider-spend-pending", id, code);
}

export async function recordSpendDurablyWith(sql: Sql, input: SpendObservation) {
  const id = input.id ?? randomBytes(18).toString("hex");
  if (
    !id ||
    id.length > 160 ||
    !input.provider ||
    input.provider.length > 40 ||
    !input.model ||
    input.model.length > 120 ||
    !Number.isFinite(input.baseVnd) ||
    input.baseVnd < 0 ||
    !Number.isFinite(input.rate) ||
    input.rate <= 0
  )
    throw new Error("Số liệu chi phí nhà cung cấp không hợp lệ.");
  const base = input.baseVnd,
    usd = Math.round((input.baseVnd / input.rate) * 1_000_000);
  if (base > Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(usd))
    throw new Error("Chi phí nhà cung cấp vượt giới hạn.");
  const added = await sql`insert into provider_spend_events(id,provider,model,base_vnd,usd_micro)
    values(${id},${input.provider},${input.model},${base},${usd}) on conflict(id) do nothing returning id`;
  const rows = await sql<{ provider: string; model: string; base_vnd: string; usd_micro: string }>`
    select provider,model,base_vnd,usd_micro from provider_spend_events where id=${id}`;
  const row = rows[0];
  if (
    !row ||
    row.provider !== input.provider ||
    row.model !== input.model ||
    Number(row.base_vnd) !== base ||
    Number(row.usd_micro) !== usd
  )
    throw new Error("Mã quan sát chi phí đã dùng với số liệu khác; cần đối soát.");
  try {
    await postObservation(sql, id);
    return { id, pending: false, duplicate: !added.length };
  } catch (error) {
    await noteFailure(sql, id, error);
    return { id, pending: true, duplicate: !added.length };
  }
}

/** Bounded replay of stored observations, never another upstream call. Safe across competing replicas. */
export async function drainSpendJournal(sql: Sql, limit = 25) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    throw new Error("Giới hạn đối soát chi phí không hợp lệ.");
  const rows = await sql<{
    id: string;
  }>`select id from provider_spend_events where posted_at is null order by created_at,id limit ${limit}`;
  let posted = 0,
    pending = 0;
  for (const { id } of rows) {
    try {
      if (await postObservation(sql, id)) posted++;
    } catch (error) {
      await noteFailure(sql, id, error);
      pending++;
    }
  }
  return { posted, pending };
}
