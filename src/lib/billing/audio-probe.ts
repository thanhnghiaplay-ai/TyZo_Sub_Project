/**
 * RE3-002: dò độ dài audio phía máy chủ để GIỮ TRƯỚC Token, có giới hạn thời gian/bộ nhớ, không giải mã.
 *
 * Trả CẬN TRÊN số giây bộ giải mã sẽ phát ra, hoặc `null` khi không xác minh được (cửa từ chối trước khi giữ/gửi).
 * - WAV: đọc từng chunk RIFF; `fmt ` phải là PCM/float hợp lệ và byteRate = sampleRate × blockAlign; độ dài theo
 *   phần `data` CÓ THẬT trong tệp (không tin số khai lớn hơn tệp).
 * - WebM/Matroska Opus (bộ đóng gói của app, MediaRecorder): đi qua từng block, đọc byte TOC của từng gói Opus
 *   (RFC 6716 §3.1) để cộng thời lượng thật của gói, không suy từ dung lượng. Gói rỗng tính 120 ms (cận trên).
 * - Ogg Opus (RFC 7845): ghép gói theo bảng lacing, bỏ OpusHead/OpusTags, cộng như trên.
 * Định dạng khác (mp3, m4a, flac…) chưa có bộ dò đáng tin → null. App chỉ gửi WebM/Opus hoặc WAV PCM16 (codec.ts).
 */

export type AudioProbe =
  | { ok: true; seconds: number; format: "wav" | "webm-opus" | "ogg-opus" }
  | { ok: false; reason: string };

/** Giới hạn công việc của bộ dò (một tệp tối đa 25 MB theo request-body.server.ts). */
const MAX_PACKETS = 400_000;
const MAX_ELEMENTS = 1_000_000;

const fail = (reason: string): AudioProbe => ({ ok: false, reason });

/** Thời lượng một gói Opus theo TOC, đơn vị 1/48000 giây (sample 48 kHz). null = gói không hợp lệ. */
export function opusPacketSamples(packet: Uint8Array): number | null {
  if (packet.length === 0) return 5760; // gói rỗng (mất/DTX): bộ giải mã có thể phát tối đa 120 ms
  const toc = packet[0];
  const config = toc >> 3;
  let frame: number;
  if (config < 12) frame = [480, 960, 1920, 2880][config & 3];
  else if (config < 16) frame = [480, 960][config & 1];
  else frame = [120, 240, 480, 960][config & 3];
  const code = toc & 3;
  let count: number;
  if (code === 0) count = 1;
  else if (code === 1 || code === 2) count = 2;
  else {
    if (packet.length < 2) return null;
    count = packet[1] & 0x3f;
    if (count === 0) return null;
  }
  const total = frame * count;
  return total > 5760 ? null : total; // RFC 6716: một gói tối đa 120 ms
}

function probeWav(b: Uint8Array): AudioProbe {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const tag = (at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
  let at = 12;
  let byteRate = 0;
  let seenFmt = false;
  for (let n = 0; at + 8 <= b.length && n < 4096; n += 1) {
    const id = tag(at);
    const size = v.getUint32(at + 4, true);
    const body = at + 8;
    if (id === "fmt ") {
      if (size < 16 || body + 16 > b.length) return fail("wav: fmt hỏng");
      let format = v.getUint16(body, true);
      const channels = v.getUint16(body + 2, true);
      const rate = v.getUint32(body + 4, true);
      const declaredByteRate = v.getUint32(body + 8, true);
      const blockAlign = v.getUint16(body + 12, true);
      const bits = v.getUint16(body + 14, true);
      if (format === 0xfffe) {
        if (size < 40 || body + 26 > b.length) return fail("wav: extensible hỏng");
        format = v.getUint16(body + 24, true);
      }
      const okBits = format === 1 ? [8, 16, 24, 32].includes(bits) : format === 3 ? [32, 64].includes(bits) : false;
      if (!okBits) return fail("wav: không phải PCM/float");
      if (channels < 1 || channels > 8 || rate < 1000 || rate > 384_000) return fail("wav: kênh/tần số lạ");
      if (blockAlign !== (channels * bits) / 8 || declaredByteRate !== rate * blockAlign)
        return fail("wav: byteRate/blockAlign không khớp");
      byteRate = declaredByteRate;
      seenFmt = true;
    } else if (id === "data") {
      if (!seenFmt) return fail("wav: data trước fmt");
      const present = Math.max(0, b.length - body);
      // Khai 0 hoặc 0xFFFFFFFF (ghi dạng luồng) hoặc lớn hơn tệp: lấy phần có thật.
      const bytes = size === 0 || size === 0xffffffff ? present : Math.min(size, present);
      return { ok: true, seconds: bytes / byteRate, format: "wav" };
    }
    const next = body + size + (size & 1);
    if (next <= at) return fail("wav: chunk hỏng");
    at = next;
  }
  return fail("wav: không thấy data");
}

/** Đọc số nguyên độ dài thay đổi của EBML. `marker` true = giữ bit đánh dấu (ID). */
function vint(b: Uint8Array, at: number, marker: boolean): { value: number; len: number; unknown: boolean } | null {
  const first = b[at];
  if (first === undefined || first === 0) return null;
  let len = 1;
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len += 1;
  if (len > 8 || at + len > b.length) return null;
  let value = marker ? first : first & (0xff >> len);
  let allOnes = value === (0xff >> len);
  for (let i = 1; i < len; i += 1) {
    value = value * 256 + b[at + i];
    if (b[at + i] !== 0xff) allOnes = false;
  }
  return { value, len, unknown: !marker && allOnes };
}

const SEGMENT = 0x18538067,
  CLUSTER = 0x1f43b675,
  TRACKS = 0x1654ae6b,
  TRACK_ENTRY = 0xae,
  CODEC_ID = 0x86,
  TRACK_NUMBER = 0xd7,
  TRACK_TYPE = 0x83,
  SIMPLE_BLOCK = 0xa3,
  BLOCK_GROUP = 0xa0,
  BLOCK = 0xa1;
const LEVEL1 = new Set([0x114d9b74, 0x1549a966, TRACKS, CLUSTER, 0x1c53bb6b, 0x1941a469, 0x1043a770, 0x1254c367]);

function probeWebm(b: Uint8Array): AudioProbe {
  const head = vint(b, 0, true);
  const headSize = head && vint(b, head.len, false);
  if (!head || head.value !== 0x1a45dfa3 || !headSize) return fail("webm: thiếu EBML");
  const docEnd = head.len + headSize.len + headSize.value;
  const doc = new TextDecoder().decode(b.subarray(head.len + headSize.len, docEnd));
  if (!doc.includes("webm") && !doc.includes("matroska")) return fail("webm: DocType lạ");
  const seg = vint(b, docEnd, true);
  const segSize = seg && vint(b, docEnd + seg.len, false);
  if (!seg || seg.value !== SEGMENT || !segSize) return fail("webm: thiếu Segment");
  const segStart = docEnd + seg.len + segSize.len;
  const segEnd = segSize.unknown ? b.length : Math.min(b.length, segStart + segSize.value);

  let audioTrack = -1;
  let tracks = 0;
  let samples = 0;
  let packets = 0;
  let elements = 0;
  let bad: string | null = null;

  const addPacket = (data: Uint8Array) => {
    const s = opusPacketSamples(data);
    if (s === null) bad = "webm: gói Opus hỏng";
    else samples += s;
    packets += 1;
  };

  const readBlock = (at: number, end: number) => {
    const track = vint(b, at, false);
    if (!track || at + track.len + 3 > end) return void (bad = "webm: block hỏng");
    if (track.value !== audioTrack) return void (bad = "webm: block của track lạ");
    const flags = b[at + track.len + 2];
    let p = at + track.len + 3;
    const lacing = (flags >> 1) & 3;
    if (lacing === 0) return addPacket(b.subarray(p, end));
    const count = b[p] + 1;
    p += 1;
    const sizes: number[] = [];
    if (lacing === 1) {
      for (let i = 0; i < count - 1; i += 1) {
        let size = 0;
        for (;;) {
          if (p >= end) return void (bad = "webm: lacing hỏng");
          const x = b[p++];
          size += x;
          if (x !== 255) break;
        }
        sizes.push(size);
      }
    } else if (lacing === 3) {
      const each = (end - p) / count;
      if (!Number.isInteger(each)) return void (bad = "webm: lacing cố định hỏng");
      for (let i = 0; i < count - 1; i += 1) sizes.push(each);
    } else {
      const first = vint(b, p, false);
      if (!first) return void (bad = "webm: lacing EBML hỏng");
      p += first.len;
      let size = first.value;
      sizes.push(size);
      for (let i = 1; i < count - 1; i += 1) {
        const d = vint(b, p, false);
        if (!d) return void (bad = "webm: lacing EBML hỏng");
        p += d.len;
        size += d.value - (2 ** (7 * d.len - 1) - 1);
        if (size < 0) return void (bad = "webm: lacing EBML hỏng");
        sizes.push(size);
      }
    }
    const used = sizes.reduce((a, n) => a + n, 0);
    if (p + used > end) return void (bad = "webm: lacing vượt block");
    sizes.push(end - p - used);
    for (const size of sizes) {
      addPacket(b.subarray(p, p + size));
      p += size;
    }
  };

  const readTrackEntry = (at: number, end: number) => {
    let codec = "",
      number = -1,
      type = -1;
    while (at < end) {
      const id = vint(b, at, true);
      const size = id && vint(b, at + id.len, false);
      if (!id || !size || size.unknown) return void (bad = "webm: track hỏng");
      const body = at + id.len + size.len;
      const data = b.subarray(body, Math.min(end, body + size.value));
      const uint = () => data.reduce((n, x) => n * 256 + x, 0);
      if (id.value === CODEC_ID) codec = new TextDecoder().decode(data);
      else if (id.value === TRACK_NUMBER) number = uint();
      else if (id.value === TRACK_TYPE) type = uint();
      at = body + size.value;
    }
    tracks += 1;
    if (type !== 2 || codec !== "A_OPUS") bad = "webm: không phải track Opus duy nhất";
    else audioTrack = number;
  };

  // Đi theo cây phần tử, chỉ vào Segment / Tracks / TrackEntry / Cluster / BlockGroup.
  const walk = (at: number, end: number, depth: number): number => {
    while (at < end && !bad) {
      if (++elements > MAX_ELEMENTS || packets > MAX_PACKETS) {
        bad = "webm: quá nhiều phần tử";
        break;
      }
      const id = vint(b, at, true);
      const size = id && vint(b, at + id.len, false);
      if (!id || !size) {
        bad = "webm: phần tử hỏng";
        break;
      }
      // Cluster kích thước «không rõ» (MediaRecorder): kéo tới phần tử cấp 1 kế tiếp.
      if (depth === 2 && LEVEL1.has(id.value)) return at;
      const body = at + id.len + size.len;
      const stop = size.unknown ? end : body + size.value;
      if (stop > b.length) {
        bad = "webm: tệp cụt";
        break;
      }
      if (id.value === TRACKS) walk(body, stop, 1);
      else if (id.value === TRACK_ENTRY && depth === 1) readTrackEntry(body, stop);
      else if (id.value === CLUSTER) {
        if (audioTrack < 0) bad = "webm: cluster trước track";
        else {
          const resume = walk(body, stop, 2);
          at = size.unknown ? resume : stop;
          continue;
        }
      } else if (id.value === SIMPLE_BLOCK && depth === 2) readBlock(body, stop);
      else if (id.value === BLOCK_GROUP && depth === 2) walk(body, stop, 3);
      else if (id.value === BLOCK && depth === 3) readBlock(body, stop);
      at = stop;
    }
    return end;
  };
  walk(segStart, segEnd, 0);
  if (bad) return fail(bad);
  if (tracks !== 1 || audioTrack < 0) return fail("webm: cần đúng một track Opus");
  if (!packets) return fail("webm: không có gói");
  return { ok: true, seconds: samples / 48000, format: "webm-opus" };
}

function probeOgg(b: Uint8Array): AudioProbe {
  let at = 0;
  let serial: number | null = null;
  let carry: number[] = [];
  let index = 0;
  let samples = 0;
  let pages = 0;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  while (at < b.length) {
    if (at + 27 > b.length || b[at] !== 0x4f || b[at + 1] !== 0x67 || b[at + 2] !== 0x67 || b[at + 3] !== 0x53)
      return fail("ogg: trang hỏng hoặc cụt");
    if (b[at + 4] !== 0) return fail("ogg: phiên bản lạ");
    const s = v.getUint32(at + 14, true);
    if (serial === null) serial = s;
    else if (s !== serial) return fail("ogg: nhiều luồng");
    const nseg = b[at + 26];
    let p = at + 27 + nseg;
    if (p > b.length) return fail("ogg: cụt");
    for (let i = 0; i < nseg; i += 1) {
      const lace = b[at + 27 + i];
      if (p + lace > b.length) return fail("ogg: cụt");
      for (let k = 0; k < lace; k += 1) carry.push(b[p + k]);
      if (carry.length > 1 << 20) return fail("ogg: gói quá lớn");
      p += lace;
      if (lace < 255) {
        const packet = Uint8Array.from(carry);
        carry = [];
        if (index === 0) {
          if (new TextDecoder().decode(packet.subarray(0, 8)) !== "OpusHead") return fail("ogg: không phải Opus");
        } else if (index === 1) {
          if (new TextDecoder().decode(packet.subarray(0, 8)) !== "OpusTags") return fail("ogg: thiếu OpusTags");
        } else {
          const n = opusPacketSamples(packet);
          if (n === null) return fail("ogg: gói Opus hỏng");
          samples += n;
        }
        index += 1;
        if (index > MAX_PACKETS) return fail("ogg: quá nhiều gói");
      }
    }
    if (++pages > MAX_PACKETS) return fail("ogg: quá nhiều trang");
    at = p;
  }
  if (index < 3) return fail("ogg: không có audio");
  return { ok: true, seconds: samples / 48000, format: "ogg-opus" };
}

export function probeAudioBytes(bytes: Uint8Array): AudioProbe {
  if (bytes.length < 12) return fail("tệp quá ngắn");
  const ascii = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (ascii(0) === "RIFF" && ascii(8) === "WAVE") return probeWav(bytes);
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return probeWebm(bytes);
  if (ascii(0) === "OggS") return probeOgg(bytes);
  return fail("định dạng chưa có bộ dò đáng tin");
}
