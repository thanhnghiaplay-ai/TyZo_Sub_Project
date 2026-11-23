/**
 * «Lọc cho giọng nói» cho tiếng lấy thẳng từ máy (tab trên web, tiếng đang phát trên ứng dụng Android).
 * Chủ hỏi 23/11/2026: vì sao micro nhận dạng chuẩn hơn? Vì micro qua bộ lọc ồn và tự chỉnh âm lượng của trình duyệt,
 * còn tiếng lấy thẳng thì thô: nhạc nền trầm lấn giọng, video tiếng nhỏ thì Alibaba bỏ sót câu.
 *
 * Chạy trên tiếng 16 kHz mono ngay trước khi gửi (cùng cách với android VoiceFilter.kt):
 *  1. Lọc thông cao 150 Hz và thông thấp 6 kHz (hai bộ lọc bậc hai): bớt trống, bass, tiếng rít; giữ dải tiếng nói.
 *  2. Tự chỉnh âm lượng: đưa mức trung bình về TARGET_RMS, tăng tối đa MAX_GAIN lần, giảm tối đa còn MIN_GAIN.
 *     Đoạn im (đỉnh thô dưới SILENT_PEAK, cùng ngưỡng không gửi của live-gate) thì không tăng: im vẫn là im,
 *     nên không gửi tiếng ồn nền và không trừ thêm Token dịch.
 *  3. Chặn đỉnh mềm để không vỡ tiếng khi tăng.
 */
export const VOICE_RATE = 16_000;
export const TARGET_RMS = 0.1;
export const MAX_GAIN = 8;
export const MIN_GAIN = 0.5;
/** Cùng ngưỡng với SILENT_PEAK (live-gate.ts, LiveService.kt): 100 trên thang 16 bit. */
export const SILENT_LEVEL = 100 / 32768;
const LIMIT = 0.9;

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

/** Hệ số bộ lọc bậc hai Butterworth (Q = 0,707), theo công thức RBJ. */
function biquad(kind: "high" | "low", freq: number, rate: number): Biquad {
  const w = (2 * Math.PI * freq) / rate;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2);
  const a0 = 1 + alpha;
  const b1 = kind === "high" ? -(1 + cos) : 1 - cos;
  const b0 = kind === "high" ? (1 + cos) / 2 : (1 - cos) / 2;
  return { b0: b0 / a0, b1: b1 / a0, b2: b0 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}

class Stage {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;
  private readonly k: Biquad;
  constructor(k: Biquad) {
    this.k = k;
  }
  run(x: number): number {
    const { b0, b1, b2, a1, a2 } = this.k;
    const y = b0 * x + b1 * this.x1 + b2 * this.x2 - a1 * this.y1 - a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

export class VoiceFilter {
  private readonly high: Stage;
  private readonly low: Stage;
  /** Mức năng lượng trung bình trượt (~0,4 giây) của tiếng đã lọc. */
  private energy = TARGET_RMS * TARGET_RMS;
  private gain = 1;
  private readonly energyStep: number;
  private readonly gainStep: number;

  constructor(rate = VOICE_RATE) {
    this.high = new Stage(biquad("high", 150, rate));
    this.low = new Stage(biquad("low", Math.min(6000, rate * 0.45), rate));
    this.energyStep = 1 / (rate * 0.4);
    this.gainStep = 1 / (rate * 0.05);
  }

  /** Lọc tại chỗ một đoạn tiếng (số thực -1..1). Trả chính mảng đó. */
  process(samples: Float32Array): Float32Array {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
    const quiet = peak < SILENT_LEVEL;
    for (let i = 0; i < samples.length; i++) {
      const y = this.low.run(this.high.run(samples[i]));
      if (!quiet) this.energy += (y * y - this.energy) * this.energyStep;
      const want = quiet ? 1 : Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_RMS / Math.sqrt(Math.max(this.energy, 1e-9))));
      this.gain += (want - this.gain) * this.gainStep;
      samples[i] = softLimit(y * this.gain);
    }
    return samples;
  }
}

function softLimit(v: number): number {
  const a = Math.abs(v);
  if (a <= LIMIT) return v;
  const over = LIMIT + (1 - LIMIT) * Math.tanh((a - LIMIT) / (1 - LIMIT));
  return v < 0 ? -over : over;
}
