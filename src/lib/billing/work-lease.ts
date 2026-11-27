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

/**
 * Gọi `beat` đều đặn cho tới khi `stop()`.
 * - Single-flight: nhịp sau chỉ được lên lịch khi nhịp trước đã xong (CSDL chậm không làm chồng truy vấn).
 * - Nhịp trả mảng rỗng (UPDATE … RETURNING không trúng dòng) = mất lease → `onLost("fenced")`, ngừng nhịp.
 * - Lỗi được đếm; quá `staleMs` không có nhịp thành công → `onLost("deadline")`, ngừng nhịp.
 * - `stop()` trả promise chờ nhịp đang chạy (nếu có) xong; không bao giờ reject.
 */
export function startBeat(
  beat: () => Promise<unknown>,
  options: number | BeatOptions = LEASE_BEAT_MS,
): () => Promise<void> {
  const opts = typeof options === "number" ? { everyMs: options } : options;
  const everyMs = opts.everyMs ?? LEASE_BEAT_MS;
  const staleMs = opts.staleMs ?? Math.max(everyMs, LEASE_STALE_SECONDS * 1000 - everyMs);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;
  let lastOk = Date.now();
  const lose = (why: LeaseLost) => {
    if (stopped) return;
    stopped = true;
    metrics.lost += 1;
    try {
      opts.onLost?.(why);
    } catch {
      /* người nghe lỗi không được làm hỏng việc chính */
    }
  };
  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(run, nextDelay(everyMs));
  };
  const run = () => {
    timer = null;
    if (stopped) return;
    const started = Date.now();
    metrics.inFlight += 1;
    inFlight = (async () => {
      try {
        const result = await beat();
        metrics.beats += 1;
        if (Array.isArray(result) && result.length === 0) return lose("fenced");
        lastOk = Date.now();
      } catch {
        metrics.failures += 1;
      } finally {
        metrics.inFlight -= 1;
        metrics.slowestMs = Math.max(metrics.slowestMs, Date.now() - started);
      }
      if (Date.now() - lastOk >= staleMs) return lose("deadline");
    })().finally(() => {
      inFlight = null;
      schedule();
    });
  };
  schedule();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
    return inFlight ?? Promise.resolve();
  };
}

/**
 * Chạy một câu nhịp với timeout THẬT ở máy chủ CSDL: giao dịch ngắn `SET LOCAL statement_timeout`.
 * Kết nối không hỗ trợ giao dịch (fixture) thì chạy thẳng.
 */
export function boundedBeat<T>(sql: Sql, run: (tx: Sql) => Promise<T>, timeoutMs = BEAT_STATEMENT_TIMEOUT_MS) {
  if (!sql.begin) return run(sql);
  const ms = Math.max(100, Math.floor(timeoutMs));
  return sql.begin(async (tx) => {
    await tx`select set_config('statement_timeout', ${String(ms)}, true)`;
    return run(tx);
  });
}
