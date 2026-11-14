/**
 * Xử lý âm thanh ở trình duyệt cho Dịch trực tiếp. Hàm thuần, không đụng tới micro hay AudioContext,
 * nên test được bằng Node. Cầu nối nhận PCM 16 bit, 16 kHz, mono; tiếng dịch về là PCM 16 bit, 24 kHz, mono.
 */
export const LIVE_SEND_RATE = 16000;
export const LIVE_PLAY_RATE = 24000;

/** Trộn nhiều kênh thành một kênh bằng cách lấy trung bình. */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0].length);
  for (const channel of channels) for (let i = 0; i < out.length; i += 1) out[i] += channel[i] ?? 0;
  for (let i = 0; i < out.length; i += 1) out[i] /= channels.length;
  return out;
}

/** Float [-1, 1] sang số nguyên 16 bit, kẹp ở hai đầu để không bị tràn số. */
export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const value = Math.max(-1, Math.min(1, Number.isFinite(input[i]) ? input[i] : 0));
    out[i] = value < 0 ? Math.round(value * 0x8000) : Math.round(value * 0x7fff);
  }
  return out;
}

/** Ngược lại: PCM 16 bit (little-endian) sang float để phát. Byte lẻ ở cuối bị bỏ. */
export function pcm16BytesToFloat(bytes: ArrayBuffer | Uint8Array): Float32Array {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const count = Math.floor(view.byteLength / 2);
  const data = new DataView(view.buffer, view.byteOffset, count * 2);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const sample = data.getInt16(i * 2, true);
    out[i] = sample < 0 ? sample / 0x8000 : sample / 0x7fff;
  }
  return out;
}

/** Số nguyên 16 bit sang byte little-endian để gửi lên cầu nối. */
export function pcm16ToBytes(samples: Int16Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i += 1) view.setInt16(i * 2, samples[i], true);
  return out;
}

/**
 * Đổi tần số lấy mẫu theo từng đoạn nhỏ liên tiếp (nội suy tuyến tính).
 * Giữ vị trí lẻ và mẫu cuối giữa các đoạn để chỗ nối không bị lệch hay kêu tách.
 */
export class Resampler {
  private readonly step: number;
  private pos = 0;
  private last = 0;
  private hasLast = false;

  constructor(
    fromRate: number,
    toRate: number,
  ) {
    if (!(fromRate > 0) || !(toRate > 0)) throw new Error("Tần số lấy mẫu không đúng.");
    this.step = fromRate / toRate;
  }

  push(input: Float32Array): Float32Array {
    if (input.length === 0) return new Float32Array(0);
    if (this.step === 1) return input;
    // Chuỗi ghép: [mẫu cuối của đoạn trước, ...đoạn này]; vị trí 0 là mẫu cuối của đoạn trước.
    const total = input.length + (this.hasLast ? 1 : 0);
    const at = (index: number) => (this.hasLast ? (index === 0 ? this.last : input[index - 1]) : input[index]);
    const out: number[] = [];
    let pos = this.hasLast ? this.pos + 1 : this.pos;
    while (pos <= total - 1) {
      const base = Math.floor(pos);
      const frac = pos - base;
      const next = base + 1 < total ? at(base + 1) : at(base);
      out.push(at(base) * (1 - frac) + next * frac);
      pos += this.step;
    }
    this.last = input[input.length - 1];
    this.hasLast = true;
    this.pos = pos - total;
    return Float32Array.from(out);
  }
}

/** Mức âm lượng 0..1 của một đoạn (căn bậc hai trung bình bình phương), để vẽ thanh nghe. */
export function levelOf(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  return Math.min(1, Math.sqrt(sum / samples.length));
}
