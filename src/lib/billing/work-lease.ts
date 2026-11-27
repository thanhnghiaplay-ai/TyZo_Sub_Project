/** Nhịp sống chung cho mọi việc gọi nhà cung cấp; phiếu chỉ đóng/đánh unknown khi nhịp đã quá hạn. */
import type { Sql } from "../db.ts";

export const LEASE_BEAT_MS = 30_000;
/** Lớn hơn 4 lần nhịp: một hai nhịp trễ (CSDL chậm) không làm việc còn sống bị coi là chết. */
export const LEASE_STALE_SECONDS = 150;
export const LEASE_STALE = `${LEASE_STALE_SECONDS} seconds`;
/** Một nhịp chạy quá mức này bị CSDL hủy (SET LOCAL statement_timeout), không treo kết nối. */
export const BEAT_STATEMENT_TIMEOUT_MS = 10_000;

/** Lý do mất lease: `fenced` = nhịp cập nhật 0 dòng (đã bị thay/đánh unknown/nhả); `deadline` = quá hạn không nhịp được. */
export type LeaseLost = "fenced" | "deadline";

export type BeatOptions = {
  everyMs?: number;
  /** Quá thời gian này không có nhịp thành công thì coi là mất lease. Mặc định LEASE_STALE − 1 nhịp. */
  staleMs?: number;
  onLost?: (why: LeaseLost) => void;
  /** Thời gian chờ nhịp đang chạy khi đóng bình thường. */
  stopGraceMs?: number;
};

/** RE3-003: số đo toàn tiến trình (đọc từ trang trạng thái/nhật ký). */
const metrics = { beats: 0, failures: 0, lost: 0, inFlight: 0, slowestMs: 0 };
export function leaseMetrics() {
  return { ...metrics };
}

/** Jitter ±10% để các lease mở cùng lúc không nhịp dồn một thời điểm. `r` trong [0, 1). */
export function nextDelay(everyMs: number, r = Math.random()): number {
  return Math.floor(everyMs * (0.9 + 0.2 * r));
}

/** A stalled driver cannot postpone the lease deadline or schedule another heartbeat. */
export function startBeat(
  beat: (signal: AbortSignal) => Promise<unknown>,
  options: number | BeatOptions = LEASE_BEAT_MS,
): () => Promise<void> {
  const opts = typeof options === "number" ? { everyMs: options } : options;
  const everyMs = opts.everyMs ?? LEASE_BEAT_MS;
  const staleMs = opts.staleMs ?? Math.max(everyMs, LEASE_STALE_SECONDS * 1000 - everyMs);
  const stopGraceMs = opts.stopGraceMs ?? 1_000;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let expiresAt = 0;
  let inFlight: { controller: AbortController; drained: Promise<void> } | undefined;
  let closing: Promise<void> | undefined;

  const stopScheduling = () => {
    stopped = true;
    clearTimeout(timer);
    clearTimeout(deadline);
  };
  const lose = (why: LeaseLost) => {
    if (stopped) return;
    stopScheduling();
    inFlight?.controller.abort();
    metrics.lost += 1;
    try {
      opts.onLost?.(why);
    } catch {
      /* người nghe lỗi không được làm hỏng việc chính */
    }
  };
  const armDeadline = () => {
    clearTimeout(deadline);
    expiresAt = performance.now() + staleMs;
    deadline = setTimeout(() => lose("deadline"), staleMs);
  };
  const schedule = () => {
    if (!stopped) timer = setTimeout(run, nextDelay(everyMs));
  };
  const run = () => {
    if (stopped) return;
    if (performance.now() >= expiresAt) return lose("deadline");
    const started = performance.now();
    const controller = new AbortController();
    metrics.inFlight += 1;
    const drained = Promise.resolve()
      .then(() => beat(controller.signal))
      .then(
        (result) => {
          if (stopped) return;
          if (performance.now() >= expiresAt) return lose("deadline");
          metrics.beats += 1;
          if (Array.isArray(result) && result.length === 0) return lose("fenced");
          armDeadline();
        },
        () => {
          if (!stopped) metrics.failures += 1;
        },
      )
      .finally(() => {
        metrics.inFlight -= 1;
        metrics.slowestMs = Math.max(metrics.slowestMs, Math.round(performance.now() - started));
        inFlight = undefined;
        schedule();
      });
    inFlight = { controller, drained };
  };

  armDeadline();
  schedule();
  return () => {
    if (closing) return closing;
    if (stopped) return Promise.resolve();
    stopScheduling();
    const pending = inFlight;
    if (!pending) return Promise.resolve();
    closing = new Promise<void>((resolve) => {
      const grace = setTimeout(() => {
        pending.controller.abort();
        resolve();
      }, stopGraceMs);
      void pending.drained.then(() => {
        clearTimeout(grace);
        resolve();
      });
    });
    return closing;
  };
}

/** Bound SQL execution on the server and cancel stalled PostgreSQL transactions via their connection. */
export function boundedBeat<T>(
  sql: Sql,
  run: (tx: Sql) => Promise<T>,
  { timeoutMs = BEAT_STATEMENT_TIMEOUT_MS, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
) {
  signal?.throwIfAborted();
  if (!sql.begin) return run(sql);
  const ms = Math.max(100, Math.floor(timeoutMs));
  return sql.begin(async (tx) => {
    signal?.throwIfAborted();
    await tx`select set_config('statement_timeout', ${String(ms)}, true)`;
    signal?.throwIfAborted();
    return run(tx);
  }, signal);
}
