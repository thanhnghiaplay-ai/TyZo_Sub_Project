/**
 * Đo độ trễ thật của một phiên Dịch trực tiếp, đo ngay ở cầu nối (đồng hồ của cầu nối, không cần đồng hồ khách).
 *
 * - readyMs: từ lúc cầu nối nhận khách tới lúc Alibaba báo sẵn sàng (lần đầu).
 * - firstTextMs: từ khung tiếng đầu tiên gửi đi tới chữ dịch đầu tiên.
 * - tam (chữ tạm): từ lúc bắt đầu một lượt nói (Alibaba báo có tiếng, hoặc chữ gốc đầu tiên của lượt)
 *   tới chữ dịch đầu tiên của lượt đó.
 * - chot (câu chốt): từ lúc hết lượt nói (Alibaba báo im, hoặc lần cuối chữ gốc đổi) tới câu dịch chốt.
 *
 * Đây là số gần đúng: chữ gốc đầu tiên đã trễ hơn tiếng thật một chút. Đủ để so model và so trước/sau khi chỉnh.
 * Hàm thuần, không lưu tài khoản hay chữ.
 */
export type LatencyMark =
  | { kind: "speech"; phase: "start" | "stop" }
  | { kind: "source" }
  | { kind: "translation"; id: string; final: boolean };

export type LatencySummary = {
  readyMs: number | null;
  firstTextMs: number | null;
  tam: number[];
  chot: number[];
};

/** Giữ tối đa chừng này mẫu mỗi loại cho một phiên, phiên dài không phình bộ nhớ. */
export const LATENCY_SAMPLE_CAP = 300;

export class LiveLatency {
  private readonly startedAt: number;
  private readyAt: number | null = null;
  private firstAudioAt: number | null = null;
  private firstTextAt: number | null = null;
  private turnStart: number | null = null;
  private turnEnd: number | null = null;
  private vadStopped = false;
  private readonly seen = new Set<string>();
  private readonly finals = new Set<string>();
  readonly tam: number[] = [];
  readonly chot: number[] = [];

  constructor(startedAt: number) {
    this.startedAt = startedAt;
  }

  ready(at: number) {
    if (this.readyAt == null) this.readyAt = at;
  }

  audio(at: number) {
    if (this.firstAudioAt == null) this.firstAudioAt = at;
  }

  mark(event: LatencyMark, at: number) {
    if (event.kind === "speech") {
      if (event.phase === "start") {
        if (this.turnStart == null) this.turnStart = at;
        this.turnEnd = null;
        this.vadStopped = false;
      } else {
        this.turnEnd = at;
        this.vadStopped = true;
      }
      return;
    }
    if (event.kind === "source") {
      if (this.turnStart == null) this.turnStart = at;
      // Chưa có tin «im» thì lấy lần cuối chữ gốc đổi làm mốc hết lượt.
      if (!this.vadStopped) this.turnEnd = at;
      return;
    }
    if (this.firstTextAt == null) this.firstTextAt = at;
    if (!this.seen.has(event.id)) {
      this.seen.add(event.id);
      if (this.turnStart != null) push(this.tam, at - this.turnStart);
    }
    if (event.final && !this.finals.has(event.id)) {
      this.finals.add(event.id);
      if (this.turnEnd != null && this.turnEnd <= at) push(this.chot, at - this.turnEnd);
      this.turnStart = null;
      this.turnEnd = null;
      this.vadStopped = false;
    }
  }

  summary(): LatencySummary {
    return {
      readyMs: this.readyAt == null ? null : Math.max(0, this.readyAt - this.startedAt),
      firstTextMs: this.firstAudioAt == null || this.firstTextAt == null ? null : Math.max(0, this.firstTextAt - this.firstAudioAt),
      tam: [...this.tam],
      chot: [...this.chot],
    };
  }
}

function push(list: number[], value: number) {
  if (list.length < LATENCY_SAMPLE_CAP && Number.isFinite(value) && value >= 0) list.push(Math.round(value));
}

/** Phân vị kiểu gần nhất (nearest-rank). Danh sách rỗng thì null. */
export function percentile(values: readonly number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1];
}

/** Một dòng tóm tắt cho bảng Admin (đã gom theo model). */
export type LatencyRow = {
  model: string;
  sessions: number;
  readyP50: number | null;
  firstTextP50: number | null;
  tamP50: number | null;
  tamP95: number | null;
  chotP50: number | null;
  chotP95: number | null;
  sentences: number;
  idleStops: number;
};

/** Gom các phiên đã ghi thành dòng theo model. Hàm thuần để test. */
export function latencyRows(
  sessions: ReadonlyArray<{ model: string; readyMs: number | null; firstTextMs: number | null; tam: readonly number[]; chot: readonly number[]; endReason: string }>,
): LatencyRow[] {
  const byModel = new Map<string, typeof sessions[number][]>();
  for (const row of sessions) {
    const list = byModel.get(row.model) ?? [];
    list.push(row);
    byModel.set(row.model, list);
  }
  return [...byModel.entries()]
    .map(([model, list]) => {
      const tam = list.flatMap((row) => row.tam);
      const chot = list.flatMap((row) => row.chot);
      const ready = list.map((row) => row.readyMs).filter((v): v is number => v != null);
      const first = list.map((row) => row.firstTextMs).filter((v): v is number => v != null);
      return {
        model,
        sessions: list.length,
        readyP50: percentile(ready, 50),
        firstTextP50: percentile(first, 50),
        tamP50: percentile(tam, 50),
        tamP95: percentile(tam, 95),
        chotP50: percentile(chot, 50),
        chotP95: percentile(chot, 95),
        sentences: chot.length,
        idleStops: list.filter((row) => row.endReason === "im-lang").length,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);
}

/** Đỉnh biên độ của một khung PCM 16 bit (little-endian). Dùng để biết khung có tiếng hay im. */
export function pcmPeak(bytes: Uint8Array): number {
  let peak = 0;
  const end = bytes.length - (bytes.length % 2);
  for (let i = 0; i < end; i += 2) {
    let v = bytes[i] | (bytes[i + 1] << 8);
    if (v & 0x8000) v -= 0x10000;
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
  }
  return peak;
}

/** Dưới mức này (khoảng -50 dBFS) coi là im lặng. Tab im hẳn là 0; micro phòng ồn thường cao hơn nên không bị dừng nhầm. */
export const SILENT_PEAK = 100;
/** Mặc định tự dừng sau 5 phút không có tiếng. */
export const IDLE_STOP_MS = 5 * 60_000;

/** Đọc LIVE_IDLE_STOP_MIN: 0 = tắt; 1–60 phút; sai thì mặc định 5 phút. */
export function cleanIdleStopMs(raw: unknown): number {
  if (raw == null || String(raw).trim() === "") return IDLE_STOP_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return IDLE_STOP_MS;
  if (n === 0) return 0;
  return Math.round(Math.min(60, Math.max(1, n)) * 60_000);
}
