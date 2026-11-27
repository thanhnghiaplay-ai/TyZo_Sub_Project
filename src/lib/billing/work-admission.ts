/** Shared PostgreSQL admission, bounded at the door: callers retry 429 instead of accumulating a polling backlog. */
import { randomBytes } from "node:crypto";
import type { Sql } from "../db.ts";
import { inTransaction } from "../db-tx.ts";
import { LEASE_STALE, LEASE_STALE_SECONDS, boundedBeat, startBeat } from "./work-lease.ts";
import { UncertainUpstreamError } from "./upstream-outcome.ts";

export type WorkLane = "batch" | "modal" | "live";
export type WorkKey = {
  userId: string;
  provider: string;
  model: string;
  lane: WorkLane;
  /** RE3-006: bằng chứng gắn suất với việc thật (mã lệnh gọi nhà, phiên live, đoạn Modal). */
  ref?: string;
};
export const DEFAULT_ADMISSION = {
  enabled: true,
  batch: 48,
  modal: 8,
  live: 48,
  perUser: 2,
  perUserModal: 3,
  perProvider: 40,
  perModel: 24,
  /** RE3-005: số suất mỗi nhà chỉ dành cho Dịch trực tiếp (batch/modal không chiếm). 0 = như cũ; Chủ chỉnh trong Admin. */
  liveReserve: 0,
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
    "liveReserve",
  ] as const) {
    if (parsed[key] === undefined) continue;
    const n = parsed[key];
    const min = key === "liveReserve" ? 0 : 1;
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n < min || n > 300)
      throw new Error("Giới hạn nhận việc không hợp lệ.");
    limits[key] = n;
  }
  if (limits.liveReserve >= limits.perProvider) throw new Error("Suất dành cho trực tiếp phải nhỏ hơn suất mỗi nhà.");
  return limits;
}

export class AdmissionBusy extends Error {
  readonly status: number = 429;
  /** RE2-004: vị trí trong hàng chờ công bằng (0 = không xếp hàng, vd. đã dùng đủ suất riêng). */
  readonly position: number;
  readonly retryAfter: number;
  constructor(position = 0) {
    super(
      position > 0
        ? `Đang xếp hàng chờ xử lý (vị trí ${position}). Hệ thống tự thử lại, phần đã làm không mất.`
        : "Hệ thống đang xử lý đủ số việc cùng lúc. Vui lòng thử lại sau ít giây.",
    );
    this.position = position;
    // Người đầu hàng thử lại sớm hơn để suất không bị bỏ trống lâu.
    this.retryAfter = position === 1 ? 1 : 2;
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

/**
 * RE3-004: một câu lệnh tự commit (`tyzo_admit`): khóa toàn cục chỉ giữ trong lúc hàm chạy trên máy chủ CSDL,
 * không qua nhiều lượt khứ hồi. Cấu hình đọc trong hàm (công tắc tắt có hiệu lực ngay); lease quá hạn đánh unknown
 * trong hàm (chỉ mục riêng). RE3-005: nhà/model đếm trên MỌI lane; lane và người dùng đếm theo lane.
 */
export async function acquireWork(sql: Sql, key: WorkKey): Promise<string | null> {
  return (await acquireWorkInfo(sql, key)).id;
}

/** Như acquireWork, kèm vị trí trong hàng chờ công bằng khi bị từ chối (RE2-004). */
export async function acquireWorkInfo(sql: Sql, key: WorkKey): Promise<{ id: string | null; position: number }> {
  const lanes = pendingAdmissions.get(sql) ?? new Map<WorkLane, number>();
  pendingAdmissions.set(sql, lanes);
  const pending = lanes.get(key.lane) ?? 0;
  if (pending >= MAX_PENDING_ADMISSIONS) return { id: null, position: 0 };
  lanes.set(key.lane, pending + 1);
  try {
    maybeSweep(sql);
    const id = randomBytes(12).toString("hex");
    const rows = await sql<{ r: string }>`select tyzo_admit(${id}, ${key.userId}, ${key.provider}, ${key.model},
      ${key.lane}, ${JSON.stringify(DEFAULT_ADMISSION)}::jsonb, ${LEASE_STALE_SECONDS}::int, ${key.ref ?? null}::text) as r`;
    const r = rows[0]?.r;
    if (r === "uncertain") throw new AdmissionUncertain();
    if (r === id) return { id, position: 0 };
    return { id: null, position: r?.startsWith("busy:") ? Number(r.slice(5)) || 0 : 0 };
  } finally {
    lanes.set(key.lane, (lanes.get(key.lane) ?? 1) - 1);
  }
}

/** RE3-006: gắn bằng chứng (mã lệnh gọi nhà…) vào suất đang giữ. Không đổi trạng thái. */
export async function tagWork(sql: Sql, id: string, ref: string) {
  await sql`update work_admissions set ref = ${ref} where id = ${id} and status in ('running','unknown')`;
}

/**
 * RE3-006: đối soát định kỳ (mỗi tiến trình tối đa mỗi 15 giây; lỗi thì giãn tới 5 phút), ngoài đường nóng:
 * lease quá hạn → unknown (vẫn giữ suất, không gửi lại); unknown có bằng chứng ĐỊNH ĐOẠT (lệnh gọi nhà đã quyết toán xong/lỗi rõ, job async xong/hỏng, đoạn Modal xong)
 *    → resolved, ghi room_audit với bằng chứng. Không có bằng chứng thì giữ nguyên, chờ Chủ (không giải phóng theo TTL).
 */
const SWEEP_MS = 15_000;
const SWEEP_MAX_MS = 300_000;
const sweepState = new WeakMap<Sql, { next: number; wait: number; running: boolean }>();
function maybeSweep(sql: Sql) {
  const st = sweepState.get(sql) ?? { next: 0, wait: SWEEP_MS, running: false };
  sweepState.set(sql, st);
  if (st.running || Date.now() < st.next) return;
  st.running = true;
  void sweepAdmissions(sql)
    .then(() => {
      st.wait = SWEEP_MS;
    })
    .catch((error) => {
      st.wait = Math.min(SWEEP_MAX_MS, st.wait * 2);
      console.warn("admission-sweep-failed", String((error as { code?: string })?.code ?? "ERR"));
    })
    .finally(() => {
      st.running = false;
      st.next = Date.now() + st.wait;
    });
}

export async function sweepAdmissions(sql: Sql, limit = 50) {
  await sql`update work_admissions set status = 'unknown', finished_at = clock_timestamp()
    where status = 'running' and heartbeat_at <= clock_timestamp() - ${LEASE_STALE}::interval`;
  const proven = await sql<{ id: string; user_id: string; ref: string; evidence: string }>`
    select w.id, w.user_id, w.ref, e.evidence from work_admissions w
    cross join lateral (
      select 'run_gate_calls:' || c.status as evidence from run_gate_calls c
        where c.id = w.ref and c.status in ('xong', 'loi')
      union all
      select 'run_async_asr_jobs:' || j.state from run_async_asr_jobs j
        where j.call_id = w.ref and j.state in ('done', 'failed')
        and not exists (select 1 from run_gate_calls c2 where c2.id = w.ref and c2.status in ('mat-phan-hoi','can-doi-soat'))
      union all
      select 'run_modal_parts:' || p.status from run_modal_parts p
        where w.ref = 'modal:' || p.ticket_id || ':' || p.part_hash || ':' || p.attempt and p.status = 'xong'
      limit 1
    ) e
    where w.status = 'unknown' and w.ref is not null
    order by w.created_at, w.id limit ${limit}`;
  let resolved = 0;
  for (const row of proven) {
    const changed = await inTransaction(sql, async (tx) => {
      const done = await tx`update work_admissions set status = 'resolved', finished_at = clock_timestamp()
        where id = ${row.id} and status = 'unknown' returning id`;
      if (!done.length) return false;
      await tx`insert into room_audit(actor_id, action, target_id, note)
        values ('he-thong', 'tu-doi-soat-suat', ${row.user_id}, ${JSON.stringify({ admission: row.id, ref: row.ref, evidence: row.evidence })})`;
      return true;
    });
    if (changed) resolved += 1;
  }
  return { resolved };
}

type WorkEnd = "done" | "unknown";
export async function beginWork(
  sql: Sql,
  key: WorkKey,
): Promise<(((end?: WorkEnd) => Promise<void>) & { id: string }) | null> {
  const id = await acquireWork(sql, key);
  if (!id) return null;
  return startLease(sql, id);
}

function startLease(sql: Sql, id: string) {
  const stop = startBeat(
    () =>
      boundedBeat(
        sql,
        (tx) => tx`update work_admissions set heartbeat_at = clock_timestamp()
    where id = ${id} and status = 'running' and heartbeat_at > clock_timestamp() - ${LEASE_STALE}::interval returning id`,
      ),
    // RE3-003: mất lease = suất đã bị đánh unknown (vẫn giữ chỗ, không gửi trùng). Ghi lại để đối soát.
    { onLost: (why) => console.warn("lease-lost", "admission", id, why) },
  );
  let release: Promise<void> | undefined;
  const done = async (end: WorkEnd = "done") => {
    await stop();
    release ??= releaseWork(sql, id, end).catch((error) => {
      release = undefined;
      throw error;
    });
    return release;
  };
  return Object.assign(done, { id });
}

export async function withWorkAdmission<T>(
  sql: Sql,
  key: WorkKey,
  run: (admission: { id: string }) => Promise<T>,
  outcome?: { uncertain: () => boolean },
): Promise<T> {
  const info = await acquireWorkInfo(sql, key);
  if (!info.id) throw new AdmissionBusy(info.position);
  const release = startLease(sql, info.id);
  let result: T;
  try {
    result = await run({ id: release.id });
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
