import { pcm16BytesToFloat } from "./live-audio.ts";
import { parseBridgeMessage, type BridgeMessage } from "./live-inbox.ts";
import { CaptureError, type CaptureHandle, type CaptureHandlers } from "./live-mic.ts";
import type { ParsedEvent } from "./qwen-protocol.ts";
import { LiveFrameGate } from "./live-gate.ts";

export type SessionState = "idle" | "connecting" | "live" | "closing" | "closed";

/** Phần của WebSocket mà phiên cần. Trình duyệt thật đáp ứng sẵn, test dùng đồ giả. */
export type SocketLike = {
  binaryType: string;
  readyState: number;
  bufferedAmount: number;
  send(data: string | ArrayBufferLike | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number; reason?: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

type SessionDeps = {
  createSocket(url: string): SocketLike;
  startCapture(handlers: CaptureHandlers): Promise<CaptureHandle>;
  player: { play(samples: Float32Array): void; stop(): void };
  /** Chờ tối đa bao lâu cho cầu nối đóng sau khi dừng, mili giây. Mặc định 12000. */
  closeWaitMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

type SessionHandlers = {
  onState?(state: SessionState): void;
  /** Sự kiện chữ gốc, chữ dịch, người nói… để màn hình ghép thành dòng phụ đề. */
  onEvent?(event: ParsedEvent): void;
  onBalance?(info: { heldLeft: number; denied: boolean }): void;
  onLow?(): void;
  onLevel?(level: number): void;
  onReconnecting?(attempt: number): void;
  /** Lỗi cho khách đọc. Phiên có thể vẫn tiếp tục hoặc sắp đóng. */
  onError?(message: string): void;
  /** Phiên đã đóng hẳn. `reason` là lý do cầu nối báo (het-tien, nguoi-dung-dung…), có thể rỗng. */
  onClosed?(info: { reason: string; code: number }): void;
};

const OPEN = 1;

/** Số lần nối lại liên tiếp tối đa khi đường nối bị đứt (giống ứng dụng 0.6). */
export const LIVE_MAX_RETRIES = 3;
/** Cầu nối đóng vì lý do của khách hay của tài khoản: không nối lại. */
const FINAL_REASONS = new Set(["het-tien", "nguoi-dung-dung", "khach-roi", "khach-loi"]);
const FINAL_CODES = new Set([4400, 4402, 4503]);

/**
 * Phiên vừa đóng có nên tự nối lại không: khách không bấm Dừng, không phải hết Token, model hay ngôn ngữ sai,
 * phòng chưa cấu hình. Mạng đứt (1006), cầu nối lỗi (1011), vé hết hạn (4401), cầu nối bỏ cuộc với Alibaba (1000
 * không kèm lý do) thì nối lại.
 */
export function liveRetryable(info: { code: number; reason: string; userStopped: boolean }): boolean {
  if (info.userStopped) return false;
  if (FINAL_REASONS.has(info.reason)) return false;
  return !FINAL_CODES.has(info.code);
}
/** Quá ngưỡng này mà mạng chưa gửi kịp thì bỏ khung mới, tránh dồn bộ nhớ. 1 MB ≈ 31 giây. */
const MAX_BUFFERED = 1_000_000;

const CLOSE_TEXT: Record<number, string> = {
  4400: "Model hoặc ngôn ngữ không được hỗ trợ.",
  4401: "Phiên đã hết hạn. Hãy bấm Bắt đầu lại.",
  4402: "Số dư chưa đủ hoặc đã quá hạn mức hôm nay. Hãy nạp thêm.",
  4503: "Dịch trực tiếp chưa được cấu hình xong ở phòng này.",
  1006: "Mất kết nối tới cầu nối dịch.",
};

/**
 * Một phiên dịch trực tiếp ở trình duyệt: nối cầu nối, đợi sẵn sàng rồi mới thu âm và gửi,
 * phát tiếng dịch về, và dọn sạch (micro, loa, kết nối) trong mọi đường kết thúc.
 */
export class LiveSession {
  state: SessionState = "idle";
  private socket: SocketLike | null = null;
  private capture: CaptureHandle | null = null;
  private capturing = false;
  private userStopped = false;
  private reason = "";
  private errorShown = false;
  private timer: unknown = null;
  private paused = false;
  private gate: LiveFrameGate | null = null;

  private readonly deps: SessionDeps;
  private readonly on: SessionHandlers;

  constructor(deps: SessionDeps, on: SessionHandlers = {}) {
    this.deps = deps;
    this.on = on;
  }

  private setState(next: SessionState) {
    if (this.state === next) return;
    this.state = next;
    this.on.onState?.(next);
  }

  private fail(message: string) {
    this.errorShown = true;
    this.on.onError?.(message);
  }

  start(url: string) {
    if (this.state !== "idle") return;
    this.setState("connecting");
    let socket: SocketLike;
    try {
      socket = this.deps.createSocket(url);
    } catch {
      this.fail("Không mở được kết nối tới cầu nối dịch.");
      this.finish(1006);
      return;
    }
    this.socket = socket;
    socket.binaryType = "arraybuffer";
    socket.onmessage = (event) => this.handleMessage(event.data);
    // Thu ngay khi nối được cầu nối; tiếng được giữ tạm trong trình duyệt tới lúc Alibaba sẵn sàng (live-gate.ts),
    // nên mấy chữ đầu không bị mất mà cầu nối không phải đổi.
    socket.onopen = () => {
      if (this.state === "connecting" && !this.userStopped) void this.beginCapture();
    };
    socket.onerror = () => undefined;
    socket.onclose = (event) => this.finish(event.code);
  }

  private handleMessage(data: unknown) {
    if (typeof data !== "string") {
      if (data instanceof ArrayBuffer && this.state !== "closed") this.deps.player.play(pcm16BytesToFloat(data));
      return;
    }
    const message = parseBridgeMessage(data);
    if (message) this.handleBridge(message);
  }

  private handleBridge(message: BridgeMessage) {
    switch (message.type) {
      case "ready":
        if (this.state === "connecting") {
          this.setState("live");
          void this.beginCapture();
        }
        return;
      case "event":
        // Lỗi của nhà cung cấp (cầu nối đã đổi sang câu tiếng Việt) hiện ở dòng báo lỗi, không lẫn vào phụ đề.
        if (message.event.kind === "error") {
          this.on.onError?.(message.event.message);
          return;
        }
        this.on.onEvent?.(message.event);
        return;
      case "balance":
        this.on.onBalance?.({ heldLeft: message.heldLeft, denied: message.denied });
        return;
      case "low":
        this.on.onLow?.();
        return;
      case "reconnecting":
        this.on.onReconnecting?.(message.attempt);
        return;
      case "closing":
        this.reason = message.reason;
        if (this.state === "live" || this.state === "connecting") this.setState("closing");
        void this.endCapture();
        return;
      case "error":
        this.fail(message.message);
        return;
    }
  }

  private async beginCapture() {
    if (this.capturing || this.capture) return;
    this.capturing = true;
    try {
      const handle = await this.deps.startCapture({
        onFrame: (frame) => this.sendFrame(frame),
        onLevel: (level) => this.on.onLevel?.(level),
        onEnded: () => {
          this.fail("Nguồn âm thanh đã dừng. Phiên sẽ kết thúc.");
          this.stop();
        },
      });
      if (this.state === "closed" || this.userStopped || this.state === "closing") {
        await handle.stop();
        return;
      }
      this.capture = handle;
    } catch (error) {
      this.fail(error instanceof CaptureError ? error.message : "Chưa thu được âm thanh.");
      this.stop();
    } finally {
      this.capturing = false;
    }
  }

  private sendFrame(frame: Uint8Array) {
    const socket = this.socket;
    if (!socket || socket.readyState !== OPEN || (this.state !== "live" && this.state !== "connecting")) return;
    const now = Date.now();
    this.gate ??= new LiveFrameGate(now);
    for (const out of this.gate.push(frame, now, this.state === "live", this.paused)) {
      if (socket.bufferedAmount > MAX_BUFFERED) return;
      socket.send(out);
    }
  }

  /** Tạm dừng / tiếp tục: giữ phiên, không gửi tiếng (không trừ Token) trong lúc tạm dừng. */
  setPaused(paused: boolean) {
    this.paused = paused;
  }

  private async endCapture() {
    const handle = this.capture;
    this.capture = null;
    if (handle) await handle.stop();
  }

  /** Khách bấm dừng. Nói cầu nối dừng nhẹ để nó trả phần dịch cuối và nhả tiền dư. */
  stop() {
    if (this.state === "closed" || this.userStopped) return;
    this.userStopped = true;
    if (this.state === "idle") return void this.finish(1000);
    if (this.state === "live" || this.state === "connecting") this.setState("closing");
    void this.endCapture();
    const socket = this.socket;
    if (socket && socket.readyState === OPEN) {
      try {
        socket.send(JSON.stringify({ type: "stop" }));
      } catch {
        /* đóng cưỡng bức ở dưới */
      }
    }
    const wait = this.deps.closeWaitMs ?? 12000;
    const set = this.deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
    this.timer = set(() => {
      try {
        socket?.close(1000, "het-gio-cho");
      } catch {
        /* đã đóng */
      }
      this.finish(1000);
    }, wait);
  }

  private finish(code: number) {
    if (this.state === "closed") return;
    if (this.timer != null) (this.deps.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>)))(this.timer);
    this.timer = null;
    void this.endCapture();
    this.deps.player.stop();
    this.setState("closed");
    const expected = this.userStopped || code === 1000 || this.reason !== "";
    if (!expected && !this.errorShown) this.fail(CLOSE_TEXT[code] ?? "Kết nối dịch trực tiếp đã đóng.");
    this.on.onClosed?.({ reason: this.reason, code });
  }
}
