import { audioBufferTo16k } from "@/lib/sub/codec";
import { SR, streamParts } from "@/lib/sub/text";

const u16 = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u32 = (b: Uint8Array, o: number) => b[o] * 16777216 + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const i32 = (b: Uint8Array, o: number) => {
  const v = u32(b, o);
  return v > 0x7fffffff ? v - 0x100000000 : v;
};
const u64 = (b: Uint8Array, o: number) => u32(b, o) * 4294967296 + u32(b, o + 4);
const tag = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

type Box = { type: string; s: number; e: number };

function boxes(b: Uint8Array, start: number, end: number): Box[] {
  const out: Box[] = [];
  let p = start;
  while (p + 8 <= end) {
    let size = u32(b, p);
    let hdr = 8;
    if (size === 1) {
      size = u64(b, p + 8);
      hdr = 16;
    } else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) break;
    out.push({ type: tag(b, p + 4), s: p + hdr, e: p + size });
    p += size;
  }
  return out;
}
const child = (b: Uint8Array, box: Box | undefined, type: string) =>
  box ? boxes(b, box.s, box.e).find((x) => x.type === type) : undefined;

/** Độ trễ đầu từ elst. skip: giây âm thanh đầu bị bỏ. delay: khoảng trống trước khi tiếng bắt đầu. */
function trackShift(moov: Uint8Array, root: Box, trak: Box, mediaScale: number) {
  const none = { skip: 0, delay: 0 };
  if (!(mediaScale > 0)) return none;
  const elst = child(moov, child(moov, trak, "edts"), "elst");
  if (!elst || moov[elst.s] !== 0 || elst.s + 20 > elst.e) return none;
  const count = u32(moov, elst.s + 4);
  if (!count) return none;
  const segment = u32(moov, elst.s + 8);
  const media = i32(moov, elst.s + 12);
  if (media === -1) {
    const mvhd = child(moov, root, "mvhd");
    const movieScale = mvhd ? u32(moov, mvhd.s + (moov[mvhd.s] === 1 ? 20 : 12)) : 0;
    const delay = movieScale > 0 ? segment / movieScale : 0;
    return { skip: 0, delay: Number.isFinite(delay) && delay > 0 && delay < 5 ? delay : 0 };
  }
  if (media > 0) {
    const skip = media / mediaScale;
    return { skip: Number.isFinite(skip) && skip > 0 && skip < 2 ? skip : 0, delay: 0 };
  }
  return none;
}

function parseEsds(b: Uint8Array, s: number, e: number) {
  let p = s + 4;
  const len = () => {
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const c = b[p++];
      n = (n << 7) | (c & 127);
      if (!(c & 128)) break;
    }
    return n;
  };
  while (p < e) {
    const t = b[p++];
    const l = len();
    const end = Math.min(e, p + l);
    if (t === 3) {
      p += 2;
      const f = b[p++];
      if (f & 0x80) p += 2;
      if (f & 0x40) p += 1 + b[p];
      if (f & 0x20) p += 2;
      continue;
    }
    if (t === 4) {
      p += 13;
      continue;
    }
    if (t === 5) return b.subarray(p, end);
    p = end;
  }
  return null;
}

function parseAsc(a: Uint8Array) {
  let pos = 0;
  const rd = (n: number) => {
    let v = 0;
    while (n--) {
      v = (v << 1) | ((a[pos >> 3] >> (7 - (pos & 7))) & 1);
      pos++;
    }
    return v;
  };
  let type = rd(5);
  const fi = rd(4);
  if (fi === 15 || fi > 12) return null;
  const ch = rd(4);
  if (type === 5 || type === 29) return null;
  return type >= 1 && type <= 4 && ch >= 1 && ch <= 7 ? { type, fi, ch } : null;
}

export type ByteRead = (a: number, b: number, sig?: AbortSignal) => Promise<Uint8Array>;

export type Mp4Stream = {
  dur: number;
  adts: (a: number, b: number, sig?: AbortSignal) => Promise<{ bytes: Uint8Array; t0: number }>;
};

export async function openMp4(read: ByteRead, size: number, gap: number, signal?: AbortSignal): Promise<Mp4Stream> {
  let moov: Uint8Array | null = null;
  for (let p = 0; p + 8 <= size && !moov; ) {
    const h = await read(p, Math.min(size, p + 16), signal);
    let sz = u32(h, 0);
    let hdr = 8;
    if (sz === 1) {
      sz = u64(h, 8);
      hdr = 16;
    } else if (sz === 0) sz = size - p;
    if (sz < hdr) break;
    if (tag(h, 4) === "moov") moov = await read(p, p + sz, signal);
    p += sz;
  }
  if (!moov) throw new Error("không tìm thấy dữ liệu moov");
  const root = boxes(moov, 0, moov.length)[0];
  let sawAudio = false;
  const audioKinds: string[] = [];
  for (const trak of boxes(moov, root.s, root.e).filter((x) => x.type === "trak")) {
    const mdia = child(moov, trak, "mdia");
    const hdlr = child(moov, mdia, "hdlr");
    if (!hdlr || tag(moov, hdlr.s + 8) !== "soun") continue;
    sawAudio = true;
    const mdhd = child(moov, mdia, "mdhd");
    const stbl = child(moov, child(moov, mdia, "minf"), "stbl");
    const stsd = child(moov, stbl, "stsd");
    if (!mdhd || !stbl || !stsd) continue;
    const entry = boxes(moov, stsd.s + 8, stsd.e)[0];
    if (entry && !audioKinds.includes(entry.type)) audioKinds.push(entry.type);
    if (!entry || entry.type !== "mp4a") continue;
    const ver = u16(moov, entry.s + 8);
    const esds = boxes(moov, entry.s + 28 + (ver === 1 ? 16 : ver === 2 ? 36 : 0), entry.e).find((x) => x.type === "esds");
    const asc = esds && parseEsds(moov, esds.s, esds.e);
    const cfg = asc && parseAsc(asc);
    if (!cfg) continue;
    const ts = u32(moov, mdhd.s + (moov[mdhd.s] ? 20 : 12));
    const shift = trackShift(moov, root, trak, ts);
    const stts = child(moov, stbl, "stts");
    const stsz = child(moov, stbl, "stsz");
    const stsc = child(moov, stbl, "stsc");
    const stco = child(moov, stbl, "stco");
    const co64 = child(moov, stbl, "co64");
    if (!stts || !stsz || !stsc || !(stco || co64)) continue;
    const count = u32(moov, stsz.s + 8);
    if (!count || !ts) throw new Error("MP4 phân mảnh (fragmented) chưa hỗ trợ");
    const sizes = new Uint32Array(count);
    const fixed = u32(moov, stsz.s + 4);
    for (let i = 0; i < count; i++) sizes[i] = fixed || u32(moov, stsz.s + 12 + i * 4);
    const nsc = u32(moov, stsc.s + 4);
    const sc: Array<[number, number]> = [];
    for (let i = 0; i < nsc; i++) sc.push([u32(moov, stsc.s + 8 + i * 12), u32(moov, stsc.s + 12 + i * 12)]);
    const cbox = (stco || co64)!;
    const nch = u32(moov, cbox.s + 4);
    const offs = new Float64Array(count);
    for (let c = 0, e = 0, si = 0; c < nch && si < count; c++) {
      while (e + 1 < sc.length && sc[e + 1][0] <= c + 1) e++;
      let o = stco ? u32(moov, cbox.s + 8 + c * 4) : u64(moov, cbox.s + 8 + c * 8);
      for (let k = 0; k < sc[e][1] && si < count; k++, si++) {
        offs[si] = o;
        o += sizes[si];
      }
    }
    let total = 0;
    const nst = u32(moov, stts.s + 4);
    for (let i = 0; i < nst; i++) total += u32(moov, stts.s + 8 + i * 8) * u32(moov, stts.s + 12 + i * 8);
    const mediaDur = total / ts;
    const sdur = mediaDur / count;
    const dur = Math.max(0.2, mediaDur - shift.skip + shift.delay);
    const profile = cfg.type - 1;
    return {
      dur,
      async adts(a, b, sig) {
        const i0 = Math.max(0, Math.floor((a + shift.skip - shift.delay) / sdur) - 2);
        const i1 = Math.min(count, Math.ceil((b + shift.skip - shift.delay) / sdur) + 1);
        const runs: Array<{ s: number; e: number; buf?: Uint8Array }> = [];
        const runOf: number[] = [];
        for (let i = i0; i < i1; i++) {
          let r = runs[runs.length - 1];
          if (!r || offs[i] < r.s || offs[i] - r.e > gap) {
            r = { s: offs[i], e: offs[i] };
            runs.push(r);
          }
          r.e = Math.max(r.e, offs[i] + sizes[i]);
          runOf.push(runs.length - 1);
        }
        for (const r of runs) r.buf = await read(r.s, r.e, sig);
        let n = 0;
        for (let i = i0; i < i1; i++) n += sizes[i] + 7;
        const out = new Uint8Array(n);
        let w = 0;
        for (let i = i0; i < i1; i++) {
          const r = runs[runOf[i - i0]];
          const o = offs[i] - r.s;
          const L = sizes[i] + 7;
          out[w] = 0xff;
          out[w + 1] = 0xf1;
          out[w + 2] = (profile << 6) | (cfg.fi << 2) | (cfg.ch >> 2);
          out[w + 3] = ((cfg.ch & 3) << 6) | (L >> 11);
          out[w + 4] = (L >> 3) & 255;
          out[w + 5] = ((L & 7) << 5) | 0x1f;
          out[w + 6] = 0xfc;
          out.set(r.buf!.subarray(o, o + sizes[i]), w + 7);
          w += L;
        }
        return { bytes: out, t0: i0 * sdur - shift.skip + shift.delay };
      },
    };
  }
  throw new Error(sawAudio ? `âm thanh không phải AAC-LC (${audioKinds.join(", ") || "không rõ loại"})` : "không có luồng âm thanh");
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function looksLikePageLink(url: string) {
  return (
    /(?:^|\.)((?:youtube|youtu)\.be|youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|facebook\.com|instagram\.com|dailymotion\.com)$/i.test(
      hostOf(url),
    ) || /youtube\.com|youtu\.be|vimeo\.com|tiktok\.com/i.test(url)
  );
}

export async function openStream(
  file: File | null,
  url: string,
  signal: AbortSignal,
  forceOld: boolean,
): Promise<{ stream: Mp4Stream | null; why: string }> {
  if (forceOld) return { stream: null, why: "trình duyệt không giải mã được AAC theo đoạn" };
  try {
    let read: ByteRead;
    let size = 0;
    let gap = 0;
    if (file) {
      size = file.size;
      gap = 256 * 1024;
      read = async (a, b) => new Uint8Array(await file.slice(a, b).arrayBuffer());
    } else {
      if (looksLikePageLink(url) || /\.m3u8(\?|#|$)/i.test(url)) return { stream: null, why: "" };
      const head = await fetch(url, { method: "HEAD", signal, mode: "cors", credentials: "omit" });
      size = Number(head.headers.get("content-length")) || 0;
      if (!head.ok || !size) throw new Error("máy chủ không cho biết dung lượng file");
      gap = 24 * 1024 * 1024;
      read = async (a, b, sig) => {
        const guard = new AbortController();
        const relay = () => guard.abort();
        sig?.addEventListener("abort", relay, { once: true });
        const timer = setTimeout(() => guard.abort(), 60_000);
        try {
          const r = await fetch(url, {
            headers: { Range: `bytes=${a}-${b - 1}` },
            signal: guard.signal,
            mode: "cors",
            credentials: "omit",
          });
          if (r.status !== 206) {
            r.body?.cancel().catch(() => {});
            throw new Error("máy chủ không hỗ trợ tải theo đoạn (Range)");
          }
          return new Uint8Array(await r.arrayBuffer());
        } catch (error) {
          if (sig?.aborted) throw error;
          if (guard.signal.aborted) throw new Error("tải đoạn video quá 60 giây không xong");
          throw error;
        } finally {
          clearTimeout(timer);
          sig?.removeEventListener("abort", relay);
        }
      };
    }
    const first = await read(0, Math.min(size, 12), signal);
    if (first.length < 8 || tag(first, 4) !== "ftyp") throw new Error("không phải MP4/M4A/MOV");
    const stream = await openMp4(read, size, gap, signal);
    return { stream, why: "" };
  } catch (error) {
    if (signal.aborted || (error as { name?: string })?.name === "AbortError") {
      const abort = new Error("Đã hủy.");
      abort.name = "AbortError";
      throw abort;
    }
    return { stream: null, why: (error as Error)?.message || String(error) };
  }
}

export async function streamSamples(
  st: Mp4Stream,
  audioContext: AudioContext,
  a: number,
  b: number,
  signal: AbortSignal,
): Promise<Float32Array | null> {
  const { bytes, t0 } = await st.adts(a, b, signal);
  let decoded: AudioBuffer;
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("hết thời gian giải mã")), 25000);
    });
    try {
      const copy = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(copy).set(bytes);
      decoded = await Promise.race([audioContext.decodeAudioData(copy), timeout]);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
  const full = await audioBufferTo16k(decoded);
  const skip = Math.max(0, Math.round((a - t0) * SR));
  return full.subarray(skip, skip + Math.round((b - a) * SR));
}

export { streamParts };
