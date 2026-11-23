/**
 * G.711 μ-law: mỗi mẫu 16 bit nén còn 8 bit (giảm một nửa dữ liệu gửi lên). Chất lượng như điện thoại,
 * đủ cho nhận dạng giọng nói. Ứng dụng Android gửi μ-law khi cầu nối báo nhận được (ready.codecs),
 * cầu nối giải về PCM 16 bit trước khi gửi Alibaba (Alibaba chỉ nhận PCM).
 */
const BIAS = 0x84;
const CLIP = 32635;

const DECODE = (() => {
  const table = new Int16Array(256);
  for (let i = 0; i < 256; i += 1) {
    const u = ~i & 0xff;
    const sign = u & 0x80;
    const exponent = (u >> 4) & 0x07;
    const mantissa = u & 0x0f;
    const magnitude = (((mantissa << 3) + BIAS) << exponent) - BIAS;
    table[i] = sign ? -magnitude : magnitude;
  }
  return table;
})();

/** Một mẫu PCM 16 bit → một byte μ-law. Ứng dụng làm đúng phép này (Kotlin); ở đây để test. */
export function encodeMulawSample(sample: number): number {
  let s = Math.max(-32768, Math.min(32767, Math.round(sample)));
  const sign = s < 0 ? 0x80 : 0;
  if (s < 0) s = -s;
  if (s > CLIP) s = CLIP;
  s += BIAS;
  let exponent = 7;
  for (let mask = 0x4000; (s & mask) === 0 && exponent > 0; mask >>= 1) exponent -= 1;
  const mantissa = (s >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

/** Khung μ-law → khung PCM 16 bit little-endian (dài gấp đôi). */
export function mulawToPcm16(bytes: Uint8Array): Buffer {
  const out = Buffer.alloc(bytes.length * 2);
  for (let i = 0; i < bytes.length; i += 1) out.writeInt16LE(DECODE[bytes[i]], i * 2);
  return out;
}
