import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole } from "./admin-room";
import type { DEFAULT_ADMISSION } from "../billing/work-admission";

export type CapacityLimits = typeof DEFAULT_ADMISSION;
export type CapacitySnapshot = {
  limits: CapacityLimits;
  lanes: { lane: string; running: number; unknown: number }[];
  reconciliation: { unit: string; calls: number; short: number }[];
};

export const getWorkCapacity = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CapacitySnapshot> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("../db");
    const { readLimits } = await import("../billing/work-admission");
    const sql = await getSql();
    const settings = await sql<{
      value: string;
    }>`select value from room_settings where key = 'work_admission'`;
    const lanes = await sql<{ lane: string; running: number; unknown: number }>`
      with slots as (
        select lane, (status = 'running' and heartbeat_at > clock_timestamp() - interval '150 seconds') as live,
          (status = 'unknown' or (status = 'running' and heartbeat_at <= clock_timestamp() - interval '150 seconds')) as uncertain
        from work_admissions where status in ('running','unknown')
        union all
        select 'batch', (state in ('pending','running') and deadline_at > clock_timestamp()),
          (state = 'unknown' or deadline_at <= clock_timestamp())
        from run_async_asr_jobs where state in ('pending','running','unknown')
      )
      select lane, count(*) filter(where live)::int as running, count(*) filter(where uncertain)::int as unknown
      from slots group by lane order by lane`;
    const reconciliation = await sql<{ unit: string; calls: number; short: number }>`
      select unit, sum(calls)::int as calls, sum(short)::float8 as short from (
        select t.unit, count(*)::int as calls, coalesce(sum(c.short_units),0) as short
        from run_gate_calls c join run_tickets t on t.id = c.ticket_id
        where c.status in ('mat-phan-hoi', 'can-doi-soat') group by t.unit
        union all
        select 'token', count(*)::int, coalesce(sum(short_tokens),0)
        from run_modal_settlements where status in ('mat-phan-hoi', 'can-doi-soat') having count(*) > 0
      ) pending group by unit`;

    return { limits: readLimits(settings[0]?.value), lanes, reconciliation };
  });

export const saveWorkCapacity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CapacityLimits) => input)
  .handler(async ({ context, data }): Promise<CapacityLimits> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("../db");
    const { readLimits } = await import("../billing/work-admission");
    const { inTransaction } = await import("../db-tx");
    const next = readLimits(JSON.stringify(data));
    const value = JSON.stringify(next);
    await inTransaction(await getSql(), async (tx) => {
      await tx`select pg_advisory_xact_lock(84201912)`;
      await tx`insert into room_settings (key, value) values ('work_admission', ${value}) on conflict (key) do update set value = excluded.value`;
      await tx`insert into room_audit (actor_id, action, target_id, note) values (${context.userId}, 'gioi-han-nhan-viec', null, ${value})`;
    });
    return next;
  });
