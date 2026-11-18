/**
 * Ghép âm thanh 16 kHz đơn kênh thành một tệp WAV 16-bit từng đoạn một.
 * Mỗi đoạn đổi sang PCM rồi bỏ mẫu gốc, nên phim dài vẫn không phải giữ cả bộ mẫu thực trong bộ nhớ
 * (tệp cuối là các mảnh Blob, trình duyệt tự quản). 1 giờ ≈ 115 MB.
 */

const RATE = 16000;

export function floatToPcm16(samples: Float32Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(samples.length * 2));
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), true);
  }
  return out;
}

export function wavHeader(sampleCount: number, rate = RATE): Uint8Array<ArrayBuffer> {
  const dataBytes = sampleCount * 2;
  const out = new Uint8Array(new ArrayBuffer(44));
  const view = new DataView(out.buffer);
  const text = (at: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // đơn kênh
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, dataBytes, true);
  return out;
}

export class WavBuilder {
  private parts: Uint8Array<ArrayBuffer>[] = [];
  private count = 0;

  push(samples: Float32Array): void {
    if (!samples.length) return;
    this.parts.push(floatToPcm16(samples));
    this.count += samples.length;
  }

  get samples(): number {
    return this.count;
  }

  get seconds(): number {
    return this.count / RATE;
  }

  finish(): Blob {
    return new Blob([wavHeader(this.count), ...this.parts], { type: "audio/wav" });
  }
}

export type SpanRead = (start: number, end: number) => Promise<Float32Array | null>;

/** Đọc lần lượt từng đoạn `spanSeconds` giây rồi ghép. Một đoạn không giải mã được thì báo rõ đoạn nào. */
export async function packWavFromReader(
  read: SpanRead,
  duration: number,
  options: { spanSeconds?: number; signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<Blob> {
  const span = options.spanSeconds ?? 300;
  if (!(duration > 0)) throw new Error("Không đọc được thời lượng âm thanh.");
  const builder = new WavBuilder();
  for (let start = 0; start < duration; start += span) {
    if (options.signal?.aborted) {
      const abort = new Error("Đã hủy.");
      abort.name = "AbortError";
      throw abort;
    }
    const end = Math.min(duration, start + span);
    const samples = await read(start, end);
    if (!samples) throw new Error(`Không giải mã được âm thanh từ phút ${Math.floor(start / 60)}.`);
    builder.push(samples);
    options.onProgress?.(end, duration);
  }
  if (!builder.samples) throw new Error("Không tìm thấy âm thanh trong file.");
  return builder.finish();
}
