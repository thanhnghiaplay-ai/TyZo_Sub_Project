/**
 * GIỮ TRƯỚC CHO TỪNG LỆNH GỌI Groq/Alibaba ở cửa trả theo lượt (hồ sơ sửa triệt để RE-002, R3-001, MAIN-041).
 *
 * Trước đây cửa chỉ kiểm phiếu còn `held > 0` rồi gọi nhà; nhiều lệnh song song cùng dựa vào một phần giữ, tổng tiền
 * nhà tính vượt phần khách đã giữ và phòng chịu. Nay mỗi lệnh giữ riêng phần ước tính (đơn giá KHÔNG đổi) trong một
 * câu lệnh, cộng vào `run_tickets.modal_reserved` (cột giữ chung cho mọi việc đang chạy trên phiếu, cả đoạn TyZo):
 *   - Còn phần chưa ai giữ: giữ min(ước tính, phần còn lại). Tổng phần giữ không bao giờ vượt `held`.
 *   - Hết phần chưa giữ nhưng còn lệnh khác đang chạy: trả «bận» (429, thử lại sau) — lệnh kia xong sẽ nhả.
 *   - Hết thật: 402 như cũ.
 * Trong lúc gọi nhà, lệnh ghi nhịp sống; tiến trình chết thì phần giữ được dọn sau LEASE_STALE (reapGateCalls).
 * Quyết toán: trừ số thật (không quá `held`) rồi nhả phần giữ, trong một giao dịch; gọi nhiều lần cũng chỉ nhả một lần.
 */
import { randomBytes } from "node:crypto";
import type { Sql } from "../db.ts";
import { LEASE_STALE } from "./work-lease.ts";

export type GateReserve = { kind: "ok"; callId: string; reserved: number } | { kind: "busy" } | { kind: "none" };

/** Lệnh mất nhịp (tiến trình đã chết): nhả phần giữ, ghi «mat-phan-hoi» để đối soát (nhà có thể đã tính tiền). Một câu lệnh. */
export async function reapGateCalls(sql: Sql, ticketId: string) {
  await sql`
    with dead as (
      select id, reserved from run_gate_calls
      where ticket_id = ${ticketId} and status = 'dang-chay' and heartbeat_at < now() - ${LEASE_STALE}::interval
      for update
    ),
    mark as (
      update run_gate_calls g set status = 'mat-phan-hoi', reserved = 0 from dead where g.id = dead.id returning dead.reserved
    )
    update run_tickets set modal_reserved = greatest(0, modal_reserved - (select coalesce(sum(reserved), 0) from mark))
    where id = ${ticketId} and exists (select 1 from mark)`;
}

export async function reserveGateCall(sql: Sql, input: { ticketId: string; userId: string; estimate: number }): Promise<GateReserve> {
  const callId = randomBytes(12).toString("hex");
  const estimate = Math.max(0, Number(input.estimate) || 0);
  await reapGateCalls(sql, input.ticketId);
  // Giữ min(ước tính, phần chưa ai giữ) và ghi lệnh, trong một câu lệnh (khóa dòng phiếu: lệnh song song xếp hàng).
  const rows = await sql<{ reserved: string }>`
    with cur as (
      select id, least(${estimate}::numeric, held - modal_reserved) as x from run_tickets
      where id = ${input.ticketId} and user_id = ${input.userId} and status = 'dang-giu' and held - modal_reserved > 0
      for update
    ),
    t as (
      update run_tickets set modal_reserved = modal_reserved + cur.x from cur where run_tickets.id = cur.id returning cur.id, cur.x
    )
    insert into run_gate_calls (id, ticket_id, reserved)
    select ${callId}, t.id, t.x from t
    returning reserved`;
  if (rows.length) return { kind: "ok", callId, reserved: Number(rows[0].reserved) };
  const live = await sql`select 1 from run_tickets where id = ${input.ticketId} and user_id = ${input.userId} and status = 'dang-giu' and held > 0`;
  if (!live.length) return { kind: "none" };
  const other = await sql`
    select 1 from run_gate_calls where ticket_id = ${input.ticketId} and status = 'dang-chay'
    union all
    select 1 from run_modal_parts where ticket_id = ${input.ticketId} and status <> 'xong' and heartbeat_at > now() - ${LEASE_STALE}::interval
    limit 1`;
  return other.length ? { kind: "busy" } : { kind: "none" };
}

/** Ghi nhịp sống của lệnh đang gọi nhà. */
export function beatGateCall(sql: Sql, callId: string) {
  return sql`update run_gate_calls set heartbeat_at = now() where id = ${callId} and status = 'dang-chay'`;
}

/**
 * Nhả phần giữ của lệnh (một lần). `status`: xong (đã trừ trong cùng giao dịch), loi (nhà báo lỗi), mat-phan-hoi.
 * Trả true nếu lệnh này vừa được nhả bởi lần gọi này.
 */
export async function releaseGateCall(sql: Sql, callId: string, status: "xong" | "loi" | "mat-phan-hoi") {
  const rows = await sql`
    with c as (
      select id, ticket_id, reserved from run_gate_calls where id = ${callId} and status = 'dang-chay' for update
    ),
    done as (
      update run_gate_calls g set status = ${status}, reserved = 0, heartbeat_at = now() from c where g.id = c.id returning c.ticket_id, c.reserved
    )
    update run_tickets t set modal_reserved = greatest(0, t.modal_reserved - done.reserved)
    from done where t.id = done.ticket_id
    returning 1`;
  return rows.length > 0;
}
