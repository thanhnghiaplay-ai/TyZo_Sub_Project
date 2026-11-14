import { LIVE_PLAY_RATE } from "./live-audio.ts";

/**
 * Tính giờ phát cho từng đoạn tiếng dịch để các đoạn nối liền nhau, không chồng, không hở.
 * Hàm thuần: thời gian đến từ đồng hồ của AudioContext do nơi gọi truyền vào.
 */
export class PlaybackQueue {
  private next = 0;
  private readonly rate: number;
  /** Đệm nhỏ khi bắt đầu hoặc sau khi hụt tiếng, để đoạn đầu không bị cắt. */
  private readonly lead: number;

  constructor(rate = LIVE_PLAY_RATE, lead = 0.06) {
    this.rate = rate;
    this.lead = lead;
  }

  schedule(now: number, samples: number): { at: number; duration: number } {
    const duration = samples / this.rate;
    if (this.next < now + 0.01) this.next = now + this.lead;
    const at = this.next;
    this.next += duration;
    return { at, duration };
  }

  /** Còn bao nhiêu giây tiếng đã xếp mà chưa phát. */
  queued(now: number): number {
    return Math.max(0, this.next - now);
  }

  reset() {
    this.next = 0;
  }
}
