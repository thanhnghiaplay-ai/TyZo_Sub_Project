import { LiveFramer } from "./live-frames.ts";
import { micErrorMessage } from "./live-mic-errors.ts";

export type TrackLike = { stop(): void };
export type StreamLike = { getTracks(): TrackLike[] };

/** Đồ thật của trình duyệt, tách ra để test bằng đồ giả. */
export type CaptureEnv = {
  /** Xin luồng âm thanh. Ném lỗi chuẩn của trình duyệt nếu bị từ chối. */
  getStream(): Promise<StreamLike>;
  /** Dựng đường lấy mẫu từ luồng, mỗi lần có dữ liệu thì gọi `onChunk` với các kênh. */
  openGraph(stream: StreamLike, onChunk: (channels: Float32Array[]) => void): Promise<{ sampleRate: number; close(): Promise<void> | void }>;
};

export type CaptureHandlers = {
  onFrame(frame: Uint8Array): void;
  onLevel?(level: number): void;
  /** Luồng tự dừng (rút micro, tab bị đóng…). */
  onEnded?(): void;
};

export type CaptureHandle = { stop(): Promise<void> };

export class CaptureError extends Error {}

/**
 * Bắt đầu thu: luồng → khung PCM 16 kHz 100 ms. Lỗi nào cũng trả câu tiếng Việt qua `CaptureError`
 * và luôn nhả micro, không để đèn micro cứ sáng khi thất bại.
 */
export async function startCapture(env: CaptureEnv, handlers: CaptureHandlers, describe: (error: unknown) => string = micErrorMessage): Promise<CaptureHandle> {
  let stream: StreamLike;
  try {
    stream = await env.getStream();
  } catch (error) {
    throw new CaptureError(describe(error));
  }
  const release = () => stream.getTracks().forEach((track) => track.stop());
  let graph: { sampleRate: number; close(): Promise<void> | void };
  let framer: LiveFramer | null = null;
  let stopped = false;
  try {
    graph = await env.openGraph(stream, (channels) => {
      if (stopped || !framer) return;
      for (const frame of framer.push(channels)) handlers.onFrame(frame);
      handlers.onLevel?.(framer.level);
    });
    framer = new LiveFramer(graph.sampleRate);
  } catch (error) {
    release();
    throw new CaptureError(describe(error));
  }
  for (const track of stream.getTracks() as Array<TrackLike & { addEventListener?: (type: string, listener: () => void) => void }>) {
    track.addEventListener?.("ended", () => {
      if (!stopped) handlers.onEnded?.();
    });
  }
  return {
    async stop() {
      if (stopped) return;
      stopped = true;
      const rest = framer?.flush();
      if (rest) handlers.onFrame(rest);
      release();
      try {
        await graph.close();
      } catch {
        /* đã đóng */
      }
    },
  };
}
