/**
 * Chọn khung tiếng nào gửi lên cầu nối (trình duyệt). Cùng cách với ứng dụng Android 0.7:
 *  - Chưa sẵn sàng (Alibaba đang mở phiên): giữ tạm tối đa PENDING_SECONDS, sẵn sàng thì gửi hết, khỏi mất mấy chữ đầu.
 *  - Im quá QUIET_MS (sau câu đã gửi đủ khoảng lặng để Alibaba chốt): không gửi, không tốn mạng, không trừ Token.
 *    Có tiếng lại thì gửi kèm PREROLL_FRAMES khung im ngay trước đó, để không mất âm đầu của câu.
 *  - Tạm dừng: không gửi gì.
 * Hàm thuần, không đụng mạng hay âm thanh thật.
 */
export const SILENT_PEAK = 100;
export const QUIET_MS = 1500;
export const PREROLL_FRAMES = 3;
const PENDING_SECONDS = 5;
const PCM_BYTES_PER_SEC = 16000 * 2;

/** Đỉnh biên độ của khung PCM 16 bit little-endian. Dưới SILENT_PEAK (khoảng -50 dBFS) coi là im. */
export function pcmPeak(bytes: Uint8Array): number {
  let peak = 0;
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    let v = bytes[i] | (bytes[i + 1] << 8);
    if (v & 0x8000) v -= 0x10000;
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
  }
  return peak;
}

export class LiveFrameGate {
  private pending: Uint8Array[] = [];
  private pendingBytes = 0;
  private preroll: Uint8Array[] = [];
  private lastLoud: number;

  constructor(now: number) {
    this.lastLoud = now;
  }

  /** Trả các khung cần gửi ngay (có thể rỗng), theo thứ tự. */
  push(frame: Uint8Array, now: number, ready: boolean, paused: boolean): Uint8Array[] {
    if (paused) {
      this.pending = [];
      this.pendingBytes = 0;
      this.preroll = [];
      return [];
    }
    if (pcmPeak(frame) >= SILENT_PEAK) this.lastLoud = now;
    if (!ready) {
      this.pending.push(frame);
      this.pendingBytes += frame.length;
      while (this.pendingBytes > PENDING_SECONDS * PCM_BYTES_PER_SEC && this.pending.length) this.pendingBytes -= this.pending.shift()!.length;
      return [];
    }
    const out = this.pending;
    this.pending = [];
    this.pendingBytes = 0;
    if (now - this.lastLoud > QUIET_MS) {
      this.preroll.push(frame);
      if (this.preroll.length > PREROLL_FRAMES) this.preroll.shift();
      return out;
    }
    out.push(...this.preroll, frame);
    this.preroll = [];
    return out;
  }
}
