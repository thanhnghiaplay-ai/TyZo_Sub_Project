import { LIVE_SEND_RATE, Resampler, floatToPcm16, levelOf, mixToMono, pcm16ToBytes } from "./live-audio.ts";

/** Mỗi khung gửi lên cầu nối dài 100 ms: 1600 mẫu 16 kHz × 2 byte = 3200 byte. */
export const FRAME_MS = 100;

/**
 * Gom âm thanh thô từ micro (mọi tần số, nhiều kênh) thành khung PCM 16 kHz mono đều nhau.
 * Đoạn lẻ chưa đủ một khung được giữ lại cho lần sau, nên không mất và không lặp mẫu.
 */
export class LiveFramer {
  private readonly resampler: Resampler;
  private readonly frameSamples = (LIVE_SEND_RATE * FRAME_MS) / 1000;
  private pending = new Int16Array(0);
  /** Mức âm lượng 0..1 của đoạn vừa đẩy vào. */
  level = 0;

  constructor(inputRate: number) {
    this.resampler = new Resampler(inputRate, LIVE_SEND_RATE);
  }

  push(channels: Float32Array[]): Uint8Array[] {
    const mono = mixToMono(channels);
    this.level = levelOf(mono);
    const pcm = floatToPcm16(this.resampler.push(mono));
    const joined = new Int16Array(this.pending.length + pcm.length);
    joined.set(this.pending, 0);
    joined.set(pcm, this.pending.length);
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (joined.length - offset >= this.frameSamples) {
      frames.push(pcm16ToBytes(joined.subarray(offset, offset + this.frameSamples)));
      offset += this.frameSamples;
    }
    this.pending = joined.slice(offset);
    return frames;
  }

  /** Phần lẻ còn lại khi dừng, bù im lặng cho đủ một khung. null nếu không còn gì. */
  flush(): Uint8Array | null {
    if (this.pending.length === 0) return null;
    const padded = new Int16Array(this.frameSamples);
    padded.set(this.pending, 0);
    this.pending = new Int16Array(0);
    return pcm16ToBytes(padded);
  }
}
