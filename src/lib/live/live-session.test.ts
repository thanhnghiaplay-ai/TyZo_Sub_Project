import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CaptureError, type CaptureHandle, type CaptureHandlers } from "./live-mic.ts";
import { PlaybackQueue } from "./live-playback.ts";
import { LiveSession, type SessionState, type SocketLike } from "./live-session.ts";

class FakeSocket implements SocketLike {
  binaryType = "blob";
  readyState = 1;
  bufferedAmount = 0;
  sent: Array<string | ArrayBufferLike | ArrayBufferView> = [];
  onopen: SocketLike["onopen"] = null;
  onmessage: SocketLike["onmessage"] = null;
  onclose: SocketLike["onclose"] = null;
  onerror: SocketLike["onerror"] = null;
  send(data: string | ArrayBufferLike | ArrayBufferView) {
    this.sent.push(data);
  }
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  say(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  audio(samples: number[]) {
    const bytes = new Uint8Array(samples.length * 2);
    const view = new DataView(bytes.buffer);
    samples.forEach((s, i) => view.setInt16(i * 2, s, true));
    this.onmessage?.({ data: bytes.buffer });
  }
  die(code: number) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

function setup(options: { captureFails?: boolean } = {}) {
  const socket = new FakeSocket();
  const log: string[] = [];
  const states: SessionState[] = [];
  const errors: string[] = [];
  const events: unknown[] = [];
  const closed: Array<{ reason: string; code: number }> = [];
  const played: number[] = [];
  let handlers: CaptureHandlers | null = null;
  let timers: Array<() => void> = [];
  const capture: CaptureHandle = { stop: async () => void log.push("dừng thu") };
  const session = new LiveSession(
    {
      createSocket: () => socket,
      startCapture: async (h) => {
        handlers = h;
        log.push("bắt đầu thu");
        if (options.captureFails) throw new CaptureError("Trình duyệt chưa cho dùng micro.");
        return capture;
      },
      player: { play: (samples) => played.push(samples.length), stop: () => log.push("tắt loa") },
      setTimer: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimer: () => {
        timers = [];
      },
    },
    {
      onState: (s) => states.push(s),
      onError: (m) => errors.push(m),
      onEvent: (e) => events.push(e),
      onClosed: (c) => closed.push(c),
    },
  );
  return { socket, session, log, states, errors, events, closed, played, frames: () => handlers, fireTimer: () => timers.forEach((fn) => fn()) };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("phiên dịch trực tiếp", () => {
  it("chưa sẵn sàng thì chưa thu; có ready mới thu, gửi khung, phát tiếng dịch, chuyển sự kiện chữ", async () => {
    const t = setup();
    t.session.start("ws://cau-noi/live?ticket=x");
    assert.equal(t.socket.binaryType, "arraybuffer");
    assert.deepEqual(t.log, []);
    t.socket.say({ type: "ready", audio: true });
    await tick();
    assert.deepEqual(t.states, ["connecting", "live"]);
    assert.deepEqual(t.log, ["bắt đầu thu"]);
    t.frames()!.onFrame(new Uint8Array(3200));
    assert.equal(t.socket.sent.length, 1);
    t.socket.audio([100, -100, 200]);
    assert.deepEqual(t.played, [3]);
    t.socket.say({ type: "event", event: { kind: "source", id: "a", text: "xin chào", stash: "", final: true } });
    assert.equal(t.events.length, 1);
  });

  it("bấm dừng: dừng thu, báo cầu nối dừng nhẹ, đợi cầu nối đóng rồi dọn sạch", async () => {
    const t = setup();
    t.session.start("ws://x");
    t.socket.say({ type: "ready", audio: true });
    await tick();
    t.session.stop();
    await tick();
    assert.equal(t.session.state, "closing");
    assert.equal(t.socket.sent.at(-1), JSON.stringify({ type: "stop" }));
    t.frames()!.onFrame(new Uint8Array(3200));
    assert.equal(t.socket.sent.length, 1, "đang đóng thì không gửi thêm khung");
    t.socket.audio([1, 2]);
    t.socket.close(1000);
    assert.equal(t.session.state, "closed");
    assert.deepEqual(t.log.slice(-2), ["dừng thu", "tắt loa"]);
    assert.equal(t.closed.length, 1);
    assert.deepEqual(t.errors, [], "khách tự dừng thì không báo lỗi");
  });

  it("cầu nối im lặng quá hạn thì ép đóng", async () => {
    const t = setup();
    t.session.start("ws://x");
    t.socket.say({ type: "ready", audio: true });
    await tick();
    t.session.stop();
    t.fireTimer();
    assert.equal(t.session.state, "closed");
    assert.equal(t.socket.readyState, 3);
  });

  it("hết tiền: cầu nối báo closing rồi đóng, lý do được chuyển lên", async () => {
    const t = setup();
    t.session.start("ws://x");
    t.socket.say({ type: "ready", audio: true });
    await tick();
    t.socket.say({ type: "closing", reason: "het-tien" });
    await tick();
    assert.equal(t.session.state, "closing");
    t.socket.close(1000);
    assert.deepEqual(t.closed, [{ reason: "het-tien", code: 1000 }]);
    assert.deepEqual(t.errors, []);
  });

  it("vé sai (4401) đóng trước khi sẵn sàng: không thu, báo câu tiếng Việt", async () => {
    const t = setup();
    t.session.start("ws://x");
    t.socket.say({ type: "error", message: "Vé không hợp lệ hoặc đã hết hạn." });
    t.socket.die(4401);
    assert.deepEqual(t.log, ["tắt loa"]);
    assert.deepEqual(t.errors, ["Vé không hợp lệ hoặc đã hết hạn."]);
    assert.equal(t.session.state, "closed");
  });

  it("đứt mạng bất ngờ (1006) thì báo mất kết nối và nhả micro", async () => {
    const t = setup();
    t.session.start("ws://x");
    t.socket.say({ type: "ready", audio: true });
    await tick();
    t.socket.die(1006);
    await tick();
    assert.deepEqual(t.errors, ["Mất kết nối tới cầu nối dịch."]);
    assert.ok(t.log.includes("dừng thu") && t.log.includes("tắt loa"));
  });

  it("không thu được âm thanh thì báo lỗi và tự dừng phiên", async () => {
    const t = setup({ captureFails: true });
    t.session.start("ws://x");
    t.socket.say({ type: "ready", audio: true });
    await tick();
    assert.deepEqual(t.errors, ["Trình duyệt chưa cho dùng micro."]);
    assert.equal(t.socket.sent.at(-1), JSON.stringify({ type: "stop" }));
  });

  it("mạng nghẽn thì bỏ khung mới thay vì dồn bộ nhớ", async () => {
    const t = setup();
    t.session.start("ws://x");
    t.socket.say({ type: "ready", audio: true });
    await tick();
    t.socket.bufferedAmount = 2_000_000;
    t.frames()!.onFrame(new Uint8Array(3200));
    assert.equal(t.socket.sent.length, 0);
  });

  it("tin hỏng bị bỏ qua, bấm Bắt đầu hai lần không mở hai kết nối", async () => {
    const t = setup();
    t.session.start("ws://x");
    t.session.start("ws://x");
    t.socket.onmessage?.({ data: "không phải json" });
    t.socket.onmessage?.({ data: 12345 });
    assert.deepEqual(t.errors, []);
    assert.deepEqual(t.states, ["connecting"]);
  });

  it("khách dừng khi micro còn đang xin quyền: micro vừa mở xong thì nhả ngay", async () => {
    const socket = new FakeSocket();
    const log: string[] = [];
    let release: (handle: CaptureHandle) => void = () => {};
    const session = new LiveSession({
      createSocket: () => socket,
      startCapture: () => new Promise<CaptureHandle>((resolve) => (release = resolve)),
      player: { play() {}, stop() {} },
      setTimer: () => 1,
      clearTimer: () => {},
    });
    session.start("ws://x");
    socket.say({ type: "ready", audio: true });
    session.stop();
    release({ stop: async () => void log.push("nhả micro") });
    await tick();
    assert.deepEqual(log, ["nhả micro"]);
  });
});

describe("xếp hàng phát tiếng", () => {
  it("các đoạn nối liền nhau, đoạn đầu có đệm nhỏ", () => {
    const q = new PlaybackQueue(24000, 0.06);
    const a = q.schedule(10, 2400);
    const b = q.schedule(10.01, 4800);
    assert.ok(Math.abs(a.at - 10.06) < 1e-9 && Math.abs(a.duration - 0.1) < 1e-9);
    assert.ok(Math.abs(b.at - 10.16) < 1e-9);
    assert.ok(Math.abs(q.queued(10.01) - 0.35) < 1e-9);
  });
  it("hụt tiếng thì đoạn sau đệm lại từ giờ hiện tại, không phát vào quá khứ", () => {
    const q = new PlaybackQueue(24000, 0.06);
    q.schedule(10, 2400);
    const late = q.schedule(15, 2400);
    assert.ok(late.at >= 15.06 - 1e-9);
  });
  it("reset xóa hàng đợi", () => {
    const q = new PlaybackQueue();
    q.schedule(1, 24000);
    q.reset();
    assert.equal(q.queued(1), 0);
  });
});
