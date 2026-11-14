import type { CaptureEnv, StreamLike } from "./live-mic.ts";

/** Bộ xử lý chạy trong luồng âm thanh riêng, gom 2048 mẫu rồi gửi về trang. */
const WORKLET = `
class LiveMic extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.n = 0; }
  process(inputs) {
    const input = inputs[0];
    if (input && input.length) {
      if (!this.buf.length) this.buf = input.map(() => []);
      input.forEach((channel, i) => this.buf[i].push(channel.slice()));
      this.n += input[0].length;
      if (this.n >= 2048) {
        const out = this.buf.map((parts) => { const all = new Float32Array(this.n); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; } return all; });
        this.port.postMessage(out, out.map((a) => a.buffer));
        this.buf = []; this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("live-mic", LiveMic);
`;

type AudioCtxCtor = typeof AudioContext;

function contextCtor(): AudioCtxCtor {
  const w = globalThis as unknown as { AudioContext?: AudioCtxCtor; webkitAudioContext?: AudioCtxCtor };
  const ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!ctor) throw Object.assign(new Error("no audio"), { name: "NotFoundError" });
  return ctor;
}

/** Nối luồng âm thanh bất kỳ (micro hoặc tab) vào đường lấy mẫu. Ưu tiên AudioWorklet, không có thì dùng ScriptProcessor. */
export async function openBrowserGraph(stream: StreamLike, onChunk: (channels: Float32Array[]) => void) {
  const context = new (contextCtor())();
  if (context.state === "suspended") await context.resume().catch(() => undefined);
  const source = context.createMediaStreamSource(stream as MediaStream);
  // Đi qua một nút im lặng tới loa để trình duyệt chịu chạy, nhưng không phát lại tiếng thu.
  const mute = context.createGain();
  mute.gain.value = 0;
  mute.connect(context.destination);
  let node: AudioNode;
  let url = "";
  try {
    if (!context.audioWorklet) throw new Error("no worklet");
    url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
    await context.audioWorklet.addModule(url);
    const worklet = new AudioWorkletNode(context, "live-mic");
    worklet.port.onmessage = (event: MessageEvent<Float32Array[]>) => onChunk(event.data);
    node = worklet;
  } catch {
    const legacy = context.createScriptProcessor(4096, 1, 1);
    legacy.onaudioprocess = (event) => onChunk([new Float32Array(event.inputBuffer.getChannelData(0))]);
    node = legacy;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
  source.connect(node);
  node.connect(mute);
  return {
    sampleRate: context.sampleRate,
    async close() {
      try {
        source.disconnect();
        node.disconnect();
      } catch {
        /* đã ngắt */
      }
      await context.close();
    },
  };
}

/** Micro thật: tắt tự khử vọng và tự chỉnh âm lượng mặc định của trình duyệt chỉ khi cần; ở đây giữ khử ồn để dịch rõ hơn. */
export function micEnv(deviceId?: string): CaptureEnv {
  return {
    getStream: () =>
      navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
      }),
    openGraph: openBrowserGraph,
  };
}
