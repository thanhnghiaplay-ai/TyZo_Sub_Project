import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole } from "./admin-room";
import type { DEFAULT_ADMISSION } from "../billing/work-admission";

export type CapacityLimits = typeof DEFAULT_ADMISSION;
export type CapacitySnapshot = {
  limits: CapacityLimits;
  lanes: { lane: string; running: number; unknown: number }[];
  reconciliation: { unit: string; calls: number; short: number }[];
  uncertainAdmissions: {
    id: string;
    provider: string;
    model: string;
    lane: string;
    created: string;
    userId: string;
    ref: string | null;
  }[];
  /** RE3-006: tổng số suất chưa rõ (mọi trang), con trỏ trang sau, cảnh báo khi chiếm nhiều suất. */
  uncertainTotal: number;
  nextCursor: string | null;
  alert: string | null;
};

const PAGE = 20;
function readCursor(input: unknown): { at: string; id: string } | null {
  if (!input || typeof input !== "object") return null;
  const after = (input as { after?: unknown }).after;
  if (typeof after !== "string" || after.length > 80) return null;
  const [at, id] = after.split("|");
  if (!id || !/^[a-f0-9]{24}$/.test(id) || Number.isNaN(Date.parse(at))) return null;
  return { at, id };
}

export const getWorkCapacity = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { after?: string } | undefined) => ({ cursor: readCursor(input) }))
  .handler(async ({ context, data }): Promise<CapacitySnapshot> => {
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
        where c.status in ('mat-phan-hoi', 'can-doi-soat')
          and not exists (select 1 from run_chat_obligations o where o.call_id = c.id)
        group by t.unit
        union all
        select 'token', count(*)::int, coalesce(sum(short_tokens),0)
        from run_modal_settlements where status in ('mat-phan-hoi', 'can-doi-soat') having count(*) > 0
      ) pending group by unit`;

    const cursor = data.cursor;
    const page = await sql<{
      id: string;
      provider: string;
      model: string;
      lane: string;
      created: string;
      at: string;
      user_id: string;
      ref: string | null;
    }>`
      select id, provider, model, lane, created_at::text as created, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at,
        user_id, ref from work_admissions
      where (status = 'unknown' or (status = 'running' and heartbeat_at <= clock_timestamp() - interval '150 seconds'))
        and (${cursor?.at ?? null}::timestamptz is null or (created_at, id) > (${cursor?.at ?? null}::timestamptz, ${cursor?.id ?? ""}))
      order by created_at, id limit ${PAGE + 1}`;
    const total = await sql<{ n: number }>`select count(*)::int as n from work_admissions
      where status = 'unknown' or (status = 'running' and heartbeat_at <= clock_timestamp() - interval '150 seconds')`;
    const limits = readLimits(settings[0]?.value);
    const shown = page.slice(0, PAGE);
    const uncertainTotal = Number(total[0]?.n ?? 0);
    const heavy = lanes.find((l) => l.unknown > 0 && l.unknown * 4 >= (limits[l.lane as "batch"] ?? Infinity));
    return {
      limits,
      lanes,
      reconciliation,
      uncertainAdmissions: shown.map((r) => ({
        id: r.id,
        provider: r.provider,
        model: r.model,
        lane: r.lane,
        created: r.created,
        userId: r.user_id,
        ref: r.ref,
      })),
      uncertainTotal,
      nextCursor: page.length > PAGE ? `${shown[shown.length - 1].at}|${shown[shown.length - 1].id}` : null,
      alert: heavy
        ? `Việc chưa rõ đang giữ ${heavy.unknown}/${limits[heavy.lane as "batch"]} suất nhóm ${heavy.lane}. Kiểm tra nhà cung cấp và xác nhận theo bằng chứng.`
        : null,
    };
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

export const resolveWorkAdmission = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Hồ sơ xác nhận không hợp lệ.");
    const value = input as { id?: unknown; evidence?: unknown };
    if (
      typeof value.id !== "string" ||
      !/^[a-f0-9]{24}$/.test(value.id) ||
      typeof value.evidence !== "string" ||
      value.evidence.trim().length < 12 ||
      value.evidence.length > 500
    ) {
      throw new Error("Hãy ghi bằng chứng kiểm tra từ 12 đến 500 ký tự.");
    }
    return { id: value.id, evidence: value.evidence.trim() };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("../db");
    const { resolveAdmissionWith } = await import("../billing/work-admission");
    return resolveAdmissionWith(await getSql(), context.userId, data.id, data.evidence);
  });
