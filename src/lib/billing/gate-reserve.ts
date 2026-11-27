/** Per-call budget ownership. Every mutation locks ticket BEFORE call; no network inside a transaction. */
import { randomBytes } from "node:crypto";
import type { Sql } from "../db.ts";
import { inTransaction } from "../db-tx.ts";
import { LEASE_STALE } from "./work-lease.ts";
import { chargeTokenWith } from "./token-flow.ts";
import { chargeTicketWith } from "./run-ticket.ts";

export type GateReserve =
  { kind: "ok"; callId: string; reserved: number } | { kind: "busy" } | { kind: "none" };

async function lockTicket(sql: Sql, ticketId: string) {
  return sql`select id from run_tickets where id = ${ticketId} for update`;
}

/** Expiration fences the old call permanently; a late result is evidence, never permission to debit. */
export async function reapGateCalls(sql: Sql, ticketId: string) {
  return inTransaction(sql, async (tx) => {
    await lockTicket(tx, ticketId);
    await tx`
      with dead as (
        select id, reserved from run_gate_calls
        where ticket_id = ${ticketId} and status = 'dang-chay' and heartbeat_at <= clock_timestamp() - ${LEASE_STALE}::interval
          and not exists (select 1 from run_async_asr_jobs j where j.call_id = run_gate_calls.id and j.state in ('pending','running','unknown') and j.deadline_at > clock_timestamp())
        for update
      ), mark as (
        update run_gate_calls g set status = 'mat-phan-hoi', reserved = 0 from dead where g.id = dead.id returning dead.reserved
      )
      update run_tickets set modal_reserved = greatest(0, modal_reserved - (select coalesce(sum(reserved), 0) from mark))
      where id = ${ticketId} and exists (select 1 from mark)`;
  });
}

export async function reserveGateCall(
  sql: Sql,
  input: { ticketId: string; userId: string; estimate: number; provider?: string; model?: string },
): Promise<GateReserve> {
  if (!Number.isFinite(input.estimate) || input.estimate <= 0) return { kind: "none" };
  // Both ledger units are integers. Never authorize a fractional amount that cannot cover its rounded debit.
  const estimate = Math.ceil(input.estimate);
  if (!Number.isSafeInteger(estimate)) return { kind: "none" };
  return inTransaction(sql, async (tx) => {
    await lockTicket(tx, input.ticketId);
    await reapGateCalls(tx, input.ticketId);
    // A separate statement AFTER the lock observes all commits of a preceding owner (READ COMMITTED).
    const live = await tx<{ held: number; modal_reserved: string }>`
      select held, modal_reserved from run_tickets
      where id = ${input.ticketId} and user_id = ${input.userId} and status = 'dang-giu' and not close_wanted and held > 0`;
    if (!live.length || Number(live[0].held) < estimate) return { kind: "none" };
    if (Number(live[0].held) - Number(live[0].modal_reserved) < estimate) return { kind: "busy" };
    const callId = randomBytes(12).toString("hex");
    await tx`update run_tickets set modal_reserved = modal_reserved + ${estimate}::numeric where id = ${input.ticketId}`;
    await tx`insert into run_gate_calls (id, ticket_id, reserved, provider, model)
      values (${callId}, ${input.ticketId}, ${estimate}, ${input.provider ?? ""}, ${input.model ?? ""})`;
    return { kind: "ok", callId, reserved: estimate };
  });
}

/** An expired lease cannot be revived by a delayed heartbeat. */
export function beatGateCall(sql: Sql, callId: string) {
  return sql`update run_gate_calls set heartbeat_at = clock_timestamp()
    where id = ${callId} and status = 'dang-chay' and heartbeat_at > clock_timestamp() - ${LEASE_STALE}::interval returning id`;
}

export async function releaseGateCall(
  sql: Sql,
  callId: string,
  status: "xong" | "loi" | "mat-phan-hoi" | "can-doi-soat",
) {
  return inTransaction(sql, async (tx) => {
    const found = await tx<{
      ticket_id: string;
    }>`select ticket_id from run_gate_calls where id = ${callId}`;
    if (!found.length) return false;
    await lockTicket(tx, found[0].ticket_id);
    const mine = await tx<{
      reserved: string;
    }>`select reserved from run_gate_calls where id = ${callId} and status = 'dang-chay' for update`;
    if (!mine.length) return false;
    await tx`update run_gate_calls set status = ${status}, reserved = 0, heartbeat_at = clock_timestamp() where id = ${callId}`;
    await tx`update run_tickets set modal_reserved = greatest(0, modal_reserved - ${Number(mine[0].reserved)}::numeric) where id = ${found[0].ticket_id}`;
    return true;
  });
}

/** Debit at most this call's own budget, observe provider cost once, and retain any shortfall for reconciliation. */
export async function settleGateCall(
  sql: Sql,
  input: {
    callId: string;
    ticketId: string;
    userId: string;
    units: number;
    base: number;
    provider: string;
    model: string;
    rate: number;
    reconcile: boolean;
  },
) {
  if (
    ![input.units, input.base, input.rate].every(Number.isFinite) ||
    input.units < 0 ||
    input.base < 0 ||
    input.rate <= 0
  ) {
    throw new Error("Số liệu quyết toán không hợp lệ.");
  }
  return inTransaction(sql, async (tx) => {
    await lockTicket(tx, input.ticketId);
    const ticket = await tx<{ unit: string; held: number; modal_reserved: string; status: string }>`
      select unit, held, modal_reserved, status from run_tickets where id = ${input.ticketId} and user_id = ${input.userId}`;
    if (!ticket.length) throw new Error("Phiếu quyết toán không hợp lệ.");
    const calls = await tx<{
      reserved: string;
      status: string;
      observed_at: unknown;
      live: boolean;
      charged_units: string;
    }>`
      select reserved, status, observed_at, charged_units, (heartbeat_at > clock_timestamp() - ${LEASE_STALE}::interval
        or exists(select 1 from run_async_asr_jobs j where j.call_id = run_gate_calls.id and j.state in ('pending','running','unknown') and j.deadline_at > clock_timestamp())) as live
      from run_gate_calls where id = ${input.callId} and ticket_id = ${input.ticketId} for update`;
    if (!calls.length) throw new Error("Lệnh quyết toán không hợp lệ.");
    const c = calls[0];
    if (c.observed_at) return { taken: Number(c.charged_units), replay: true };
    const owned = c.status === "dang-chay" && c.live && ticket[0].status === "dang-giu";
    const reserved = Number(c.reserved);
    const other = Math.max(0, Number(ticket[0].modal_reserved) - reserved);
    const allowance = owned
      ? Math.max(0, Math.floor(Math.min(reserved, ticket[0].held - other)))
      : 0;
    const units = Math.ceil(input.units);
    const debit = Math.min(units, allowance);
    const taken =
      debit > 0
        ? ticket[0].unit === "token"
          ? await chargeTokenWith(tx, input.ticketId, input.userId, debit, reserved)
          : await chargeTicketWith(
              tx,
              input.ticketId,
              input.userId,
              debit,
              units > 0 ? (input.base * debit) / units : 0,
              reserved,
            )
        : 0;
    // Financial evidence must commit with the debit. Do not use the best-effort spend logger here.
    const base = Math.round(input.base);
    if (base > 0)
      await tx`
      insert into provider_spend (day, provider, model, calls, base_vnd, usd_micro)
      values ((now() at time zone 'Asia/Ho_Chi_Minh')::date, ${input.provider}, ${input.model}, 1, ${base}, ${Math.round((base / input.rate) * 1_000_000)})
      on conflict (day, provider, model) do update set calls = provider_spend.calls + 1,
        base_vnd = provider_spend.base_vnd + excluded.base_vnd, usd_micro = provider_spend.usd_micro + excluded.usd_micro`;
    const status = input.reconcile || taken < units || !owned ? "can-doi-soat" : "xong";
    await tx`update run_gate_calls set status = ${status}, reserved = 0, observed_at = clock_timestamp(),
      actual_units = ${units}, charged_units = ${taken}, short_units = ${Math.max(0, units - taken)},
      base_vnd = ${input.base}, provider = ${input.provider}, model = ${input.model} where id = ${input.callId}`;
    if (c.status === "dang-chay")
      await tx`update run_tickets set modal_reserved = greatest(0, modal_reserved - ${reserved}::numeric) where id = ${input.ticketId}`;
    return { taken, replay: false };
  });
}
