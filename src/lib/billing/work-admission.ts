/** Shared PostgreSQL admission, bounded at the door: callers retry 429 instead of accumulating a polling backlog. */
import { randomBytes } from "node:crypto";
import type { Sql } from "../db.ts";
import { inTransaction } from "../db-tx.ts";
import { LEASE_STALE, startBeat } from "./work-lease.ts";
import { UncertainUpstreamError } from "./upstream-outcome.ts";

export type WorkLane = "batch" | "modal" | "live";
export type WorkKey = { userId: string; provider: string; model: string; lane: WorkLane };
export const DEFAULT_ADMISSION = {
  enabled: true,
  batch: 48,
  modal: 8,
  live: 48,
  perUser: 2,
  perUserModal: 3,
  perProvider: 40,
  perModel: 24,
};

export function readLimits(value?: string) {
  if (!value) return DEFAULT_ADMISSION;
  const parsed = JSON.parse(value) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Cấu hình nhận việc không hợp lệ.");
  const limits = { ...DEFAULT_ADMISSION };
  if (parsed.enabled !== undefined) {
    if (typeof parsed.enabled !== "boolean") throw new Error("Cấu hình nhận việc không hợp lệ.");
    limits.enabled = parsed.enabled;
  }
  for (const key of [
    "batch",
    "modal",
    "live",
    "perUser",
    "perUserModal",
    "perProvider",
    "perModel",
  ] as const) {
    if (parsed[key] === undefined) continue;
    const n = parsed[key];
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1 || n > 300)
      throw new Error("Giới hạn nhận việc không hợp lệ.");
    limits[key] = n;
  }
  return limits;
}

export class AdmissionBusy extends Error {
  readonly status: number = 429;
  readonly retryAfter = 2;
  constructor() {
    super("Hệ thống đang xử lý đủ số việc cùng lúc. Vui lòng thử lại sau ít giây.");
  }
}

/** Conflict requires evidence, rather than a short capacity retry. */
export class AdmissionUncertain extends AdmissionBusy {
  readonly status = 409;
  constructor() {
    super();
    this.message =
      "Có công việc đang gửi hoặc cần đối soát. Không tự gửi lại; hãy kiểm tra kết quả trước khi tiếp tục.";
  }
}

// Bound callers waiting for the short database admission section as well as upstream work.
// This is a local pressure valve; PostgreSQL remains the authority across replicas.
const pendingAdmissions = new WeakMap<Sql, Map<WorkLane, number>>();
const MAX_PENDING_ADMISSIONS = 32;

export async function acquireWork(sql: Sql, key: WorkKey): Promise<string | null> {
  const lanes = pendingAdmissions.get(sql) ?? new Map<WorkLane, number>();
  pendingAdmissions.set(sql, lanes);
  const pending = lanes.get(key.lane) ?? 0;
  if (pending >= MAX_PENDING_ADMISSIONS) return null;
  lanes.set(key.lane, pending + 1);
  try {
    return await inTransaction(sql, async (tx) => {
      // One short global critical section makes the count+insert atomic across every app instance.
      await tx`select pg_advisory_xact_lock(84201912)`;
      const settings = await tx<{
        value: string;
      }>`select value from room_settings where key = 'work_admission'`;
      const limits = readLimits(settings[0]?.value);
      if (!limits.enabled) return null;
      await tx`update work_admissions set status = 'unknown', finished_at = clock_timestamp()
      where status = 'running' and heartbeat_at <= clock_timestamp() - ${LEASE_STALE}::interval`;
      const rows = await tx<{
        lane: number;
        own: number;
        provider: number;
        model: number;
        uncertain_own: number;
      }>`
      with active as (
        select lane, user_id, provider, model, status = 'unknown' as uncertain from work_admissions where status in ('running','unknown')
        union all
        select 'batch', user_id, provider, model, state = 'unknown' from run_async_asr_jobs where state in ('pending','running','unknown') and deadline_at > clock_timestamp()
      )
      select count(*)::int as lane,
        count(*) filter (where user_id = ${key.userId})::int as own,
        count(*) filter (where provider = ${key.provider})::int as provider,
        count(*) filter (where provider = ${key.provider} and model = ${key.model})::int as model,
        count(*) filter (where user_id = ${key.userId} and provider = ${key.provider} and uncertain)::int as uncertain_own
      from active where lane = ${key.lane}`;
      const n = rows[0];
      if (n.uncertain_own > 0) throw new AdmissionUncertain();
      if (
        n.lane >= limits[key.lane] ||
        n.own >= (key.lane === "modal" ? limits.perUserModal : limits.perUser) ||
        n.provider >= limits.perProvider ||
        n.model >= limits.perModel
      )
        return null;
      const id = randomBytes(12).toString("hex");
      await tx`insert into work_admissions (id, user_id, provider, model, lane) values (${id}, ${key.userId}, ${key.provider}, ${key.model}, ${key.lane})`;
      return id;
    });
  } finally {
    lanes.set(key.lane, (lanes.get(key.lane) ?? 1) - 1);
  }
}

type WorkEnd = "done" | "unknown";
export async function beginWork(
  sql: Sql,
  key: WorkKey,
): Promise<((end?: WorkEnd) => Promise<void>) | null> {
  const id = await acquireWork(sql, key);
  if (!id) return null;
  const stop = startBeat(
    () => sql`update work_admissions set heartbeat_at = clock_timestamp()
    where id = ${id} and status = 'running' and heartbeat_at > clock_timestamp() - ${LEASE_STALE}::interval`,
  );
  let release: Promise<void> | undefined;
  return (end: WorkEnd = "done") => {
    stop();
    release ??= releaseWork(sql, id, end).catch((error) => {
      release = undefined;
      throw error;
    });
    return release;
  };
}

export async function withWorkAdmission<T>(
  sql: Sql,
  key: WorkKey,
  run: () => Promise<T>,
  outcome?: { uncertain: () => boolean },
): Promise<T> {
  const release = await beginWork(sql, key);
  if (!release) throw new AdmissionBusy();
  let result: T;
  try {
    result = await run();
  } catch (primaryError) {
    try {
      await release(
        primaryError instanceof UncertainUpstreamError || outcome?.uncertain() ? "unknown" : "done",
      );
    } catch (cleanupError) {
      throw new AggregateError(
        [primaryError, cleanupError],
        "Lỗi xử lý và nhả chỗ; cần kiểm tra phiên.",
      );
    }
    throw primaryError;
  }
  await release(outcome?.uncertain() ? "unknown" : "done");
  return result;
}

/** Exposed for long lived bridge sessions; no implicit retry of upstream work. */
export async function releaseWork(sql: Sql, id: string, end: WorkEnd = "done") {
  await sql`update work_admissions set status = ${end}, finished_at = clock_timestamp() where id = ${id} and status in ('running','unknown')`;
}

/** Only the owner-facing server handler may authorize this, after checking upstream evidence.
 * Releases capacity only: never changes a customer's ticket, debit, or provider-spend journal.
 */
export async function resolveAdmissionWith(
  sql: Sql,
  actorId: string,
  id: string,
  evidence: string,
) {
  return inTransaction(sql, async (tx) => {
    await tx`select pg_advisory_xact_lock(84201912)`;
    const rows = await tx<{ user_id: string; provider: string; model: string }>`
      select user_id, provider, model from work_admissions where id = ${id}
        and (status = 'unknown' or (status = 'running' and heartbeat_at <= clock_timestamp() - ${LEASE_STALE}::interval)) for update`;
    if (!rows.length) return false;
    await tx`update work_admissions set status = 'resolved', finished_at = clock_timestamp() where id = ${id}`;
    await tx`insert into room_audit(actor_id, action, target_id, note)
      values (${actorId}, 'xac-nhan-chuong-trinh-da-ket-thuc', ${rows[0].user_id}, ${JSON.stringify({ admission: id, provider: rows[0].provider, model: rows[0].model, evidence })})`;
    return true;
  });
}
