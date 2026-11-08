import { SR } from "@/lib/sub/text";

const ID = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const concat = (parts: Uint8Array[]) => {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const vint = (n: number) => {
  let value = BigInt(n);
  let width = 1;
  while (value + 1n >= 1n << (7n * BigInt(width))) width++;
  const out = new Uint8Array(width);
  value |= 1n << (7n * BigInt(width));
  for (let i = width - 1; i >= 0; i--) {
    out[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return out;
};
const uInt = (n: number, width: number) => {
  const out = new Uint8Array(width);
  let value = BigInt(n);
  for (let i = width - 1; i >= 0; i--) {
    out[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return out;
};
const f64 = (n: number) => {
  const out = new Uint8Array(8);
  new DataView(out.buffer).setFloat64(0, n, false);
  return out;
};
const text = (s: string) => new TextEncoder().encode(s);
const el = (hex: string, data: Uint8Array) => concat([ID(hex), vint(data.length), data]);

type OpusPacket = { data: Uint8Array; timestampUs: number; durationUs: number };

function opusPrivate(description: Uint8Array | null, sampleRate: number, channels: number) {
  if (description && description.length >= 19 && text("OpusHead").every((b, i) => description[i] === b)) {
    return new Uint8Array(description);
  }
  const head = new Uint8Array(19);
  head.set(text("OpusHead"));
  head[8] = 1;
  head[9] = channels;
  head[10] = 0x00;
  head[11] = 0x0f;
  new DataView(head.buffer).setUint32(12, sampleRate, true);
  return head;
}

function buildOpusWebm(packets: OpusPacket[], description: Uint8Array | null, sampleRate: number, channels: number) {
  const head = opusPrivate(description, sampleRate, channels);
  const preSkip = head.length >= 12 ? head[10] | (head[11] << 8) : 3840;
  const delayNs = Math.round((preSkip / 48000) * 1e9);
  const durationMs = packets.length
    ? Math.max(1, Math.round((packets[packets.length - 1].timestampUs + (packets[packets.length - 1].durationUs || 20000)) / 1000))
    : 1;
  const ebml = el(
    "1A45DFA3",
    concat([
      el("4286", uInt(1, 1)),
      el("42F7", uInt(1, 1)),
      el("42F2", uInt(4, 1)),
      el("42F3", uInt(8, 1)),
      el("4282", text("webm")),
      el("4287", uInt(4, 1)),
      el("4285", uInt(2, 1)),
    ]),
  );
  const info = el(
    "1549A966",
    concat([el("2AD7B1", uInt(1000000, 3)), el("4489", f64(durationMs)), el("4D80", text("sub")), el("5741", text("sub"))]),
  );
  const track = el(
    "1654AE6B",
    el(
      "AE",
      concat([
        el("D7", uInt(1, 1)),
        el("73C5", uInt(1, 1)),
        el("83", uInt(2, 1)),
        el("86", text("A_OPUS")),
        el("56AA", uInt(delayNs, 4)),
        el("56BB", uInt(80000000, 4)),
        el("63A2", head),
        el("E1", concat([el("B5", f64(48000)), el("9F", uInt(channels, 1))])),
      ]),
    ),
  );
  const clusters: Uint8Array[] = [];
  let clusterStart = 0;
  let blocks: Uint8Array[] = [];
  const flush = () => {
    if (!blocks.length) return;
    clusters.push(el("1F43B675", concat([el("E7", uInt(clusterStart, 4)), ...blocks])));
    blocks = [];
  };
  for (const packet of packets) {
    const ms = Math.max(0, Math.round(packet.timestampUs / 1000));
    if (blocks.length && ms - clusterStart > 24000) {
      flush();
      clusterStart = ms;
    }
    const rel = Math.max(-32768, Math.min(32767, ms - clusterStart));
    const body = new Uint8Array(4 + packet.data.length);
    body[0] = 0x81;
    body[1] = (rel >> 8) & 255;
    body[2] = rel & 255;
    body[3] = 0x80;
    body.set(packet.data, 4);
    blocks.push(el("A3", body));
  }
  flush();
  return new Blob([concat([ebml, el("18538067", concat([info, track, ...clusters]))])], { type: "audio/webm" });
}

function upsample(samples: Float32Array, from: number, to: number) {
  const outLen = Math.max(1, Math.round((samples.length * to) / from));
  const out = new Float32Array(outLen);
  const ratio = from / to;
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio;
    const i0 = Math.min(samples.length - 1, Math.floor(x));
    const i1 = Math.min(samples.length - 1, i0 + 1);
    const t = x - i0;
    out[i] = samples[i0] * (1 - t) + samples[i1] * t;
  }
  return out;
}

type EncoderInstance = {
  configure: (cfg: { codec: string; sampleRate: number; numberOfChannels: number; bitrate: number }) => void;
  encode: (audio: { close: () => void }) => void;
  flush: () => Promise<void>;
  close: () => void;
  encodeQueueSize: number;
};

type AudioDataCtor = new (init: {
  format: string;
  sampleRate: number;
  numberOfFrames: number;
  numberOfChannels: number;
  timestamp: number;
  data: Float32Array;
}) => { close: () => void };

async function samplesToOpusWebm(samples: Float32Array, signal?: AbortSignal): Promise<Blob | null> {
  const Encoder = (globalThis as unknown as { AudioEncoder?: new (init: unknown) => EncoderInstance }).AudioEncoder;
  const AudioData = (globalThis as unknown as { AudioData?: AudioDataCtor }).AudioData;
  if (!Encoder || !AudioData) return null;
  if (signal?.aborted) return null;
  const rates = [16000, 48000];
  let rate = 0;
  const bitrate = 20000;
  for (const candidate of rates) {
    const support = await (
      Encoder as unknown as {
        isConfigSupported: (cfg: unknown) => Promise<{ supported?: boolean } | null>;
      }
    ).isConfigSupported({ codec: "opus", sampleRate: candidate, numberOfChannels: 1, bitrate }).catch(() => null);
    if (support?.supported) {
      rate = candidate;
      break;
    }
  }
  if (!rate) return null;
  const pcm = rate === 16000 ? samples : upsample(samples, 16000, rate);
  const packets: OpusPacket[] = [];
  let description: Uint8Array | null = null;
  let failed: unknown = null;
  const frame = Math.round(rate / 50);
  let encoder: EncoderInstance | undefined;
  try {
    encoder = new Encoder({
      output: (chunk: { byteLength: number; timestamp?: number; duration?: number; copyTo: (d: Uint8Array) => void }, meta?: { decoderConfig?: { description?: ArrayBuffer | ArrayBufferView } }) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        if (meta?.decoderConfig?.description && !description) {
          const raw = meta.decoderConfig.description;
          const view = ArrayBuffer.isView(raw)
            ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
            : new Uint8Array(raw);
          description = new Uint8Array(view);
        }
        packets.push({ data, timestampUs: chunk.timestamp || 0, durationUs: chunk.duration || 20000 });
      },
      error: (error: unknown) => {
        failed = error;
      },
    });
    encoder.configure({ codec: "opus", sampleRate: rate, numberOfChannels: 1, bitrate });
    let frames = 0;
    for (let i = 0; i < pcm.length; i += frame) {
      if (signal?.aborted) return null;
      const slice = pcm.subarray(i, Math.min(pcm.length, i + frame));
      const exact = new Float32Array(frame);
      exact.set(slice);
      const audio = new AudioData({
        format: "f32-planar",
        sampleRate: rate,
        numberOfFrames: frame,
        numberOfChannels: 1,
        timestamp: Math.round((i / rate) * 1e6),
        data: exact,
      });
      encoder.encode(audio);
      audio.close();
      frames++;
      if (frames % 40 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      if (encoder.encodeQueueSize > 12) {
        await new Promise<void>((resolve) => {
          const wait = () => (encoder && encoder.encodeQueueSize < 4 ? resolve() : setTimeout(wait, 8));
          wait();
        });
      }
    }
    await encoder.flush();
  } catch {
    return null;
  } finally {
    try {
      encoder?.close();
    } catch {
      /* already closed */
    }
  }
  if (failed || !packets.length) return null;
  const blob = buildOpusWebm(packets, description, rate, 1);
  const wavSize = 44 + samples.length * 2;
  if (blob.size < 80 || blob.size > wavSize * 0.9) return null;
  return blob;
}

export function toWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 32768 : clamped * 32767, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function linearResample(audioBuffer: AudioBuffer): Float32Array {
  const from = audioBuffer.sampleRate || SR;
  const length = audioBuffer.length;
  const channels = audioBuffer.numberOfChannels;
  const outLen = Math.max(1, Math.round(audioBuffer.duration * SR));
  const out = new Float32Array(outLen);
  const data: Float32Array[] = [];
  for (let channel = 0; channel < channels; channel++) data.push(audioBuffer.getChannelData(channel));
  const ratio = from / SR;
  if (ratio > 1.01) {
    for (let i = 0; i < outLen; i++) {
      const start = Math.min(length - 1, Math.floor(i * ratio));
      const end = Math.min(length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
      let sample = 0;
      let count = 0;
      for (let channel = 0; channel < channels; channel++) {
        for (let j = start; j < end; j++) {
          sample += data[channel][j];
          count++;
        }
      }
      out[i] = count ? sample / count : 0;
    }
    return out;
  }
  for (let i = 0; i < outLen; i++) {
    const x = i * ratio;
    const i0 = Math.min(length - 1, Math.floor(x));
    const i1 = Math.min(length - 1, i0 + 1);
    const t = x - i0;
    let sample = 0;
    for (let channel = 0; channel < channels; channel++) sample += data[channel][i0] * (1 - t) + data[channel][i1] * t;
    out[i] = sample / channels;
  }
  return out;
}

export async function audioBufferTo16k(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const frames = Math.max(1, Math.ceil(audioBuffer.duration * SR));
  try {
    const offline = new OfflineAudioContext(1, frames, SR);
    const source = offline.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    return new Float32Array(rendered.getChannelData(0));
  } catch {
    return linearResample(audioBuffer);
  }
}

export type PackedAudio = { blob: Blob; name: string; wav?: () => Blob };

export async function packAudio(samples: Float32Array, signal?: AbortSignal): Promise<PackedAudio> {
  try {
    const webm = await samplesToOpusWebm(samples, signal);
    if (signal?.aborted) {
      const error = new Error("Đã hủy.");
      error.name = "AbortError";
      throw error;
    }
    if (webm) return { blob: webm, name: "audio.webm", wav: () => toWav(samples) };
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError" || signal?.aborted) {
      const abort = new Error("Đã hủy.");
      abort.name = "AbortError";
      throw abort;
    }
  }
  return { blob: toWav(samples), name: "audio.wav" };
}
