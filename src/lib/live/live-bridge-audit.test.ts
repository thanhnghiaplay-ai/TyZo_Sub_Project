/**
 * Kiểm toán v5.49: vòng đời phiên và tiền của cầu nối Dịch trực tiếp (DEEP-001, 002, 004, 005, 006).
 * Alibaba giả và sổ tiền giả có độ trễ, để tái hiện các tình huống tranh chấp.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, it } from "node:test";
import WebSocket, { WebSocketServer } from "ws";
import { attachLiveBridge, type LiveBilling } from "./live-bridge.ts";
import { signLiveTicket } from "./live-ticket.ts";
import { LIVE_MODEL_38, LIVE_FALLBACK_ROWS } from "./live-price.ts";
import type { LiveBook } from "./live-cost.ts";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const book: LiveBook = { rate: 26000, rows: LIVE_FALLBACK_ROWS };

type Ev = { t: number; kind: string; id: string; n?: number };

function slowBilling(opts: { openDelay?: (n: number) => number; chargeDelay?: number; bookDelay?: number; stock?: number }) {
  const events: Ev[] = [];
  let money = opts.stock ?? 1e9;
  const held = new Map<string, number>();
  let opens = 0;
  const billing: LiveBilling = {
    book: async () => {
      await wait(opts.bookDelay ?? 0);
      return book;
    },
    open: async ({ ticketId, hold }) => {
      opens += 1;
      await wait(opts.openDelay?.(opens) ?? 0);
      if (money < hold) return { ok: false, reason: "het-tien" };
      money -= hold;
      held.set(ticketId, hold);
      events.push({ t: Date.now(), kind: "open", id: ticketId, n: hold });
      return { ok: true };
    },
    charge: async ({ ticketId, cost }) => {
      await wait(opts.chargeDelay ?? 0);
      const isClosed = events.some((e) => e.kind === "close" && e.id === ticketId);
      const h = isClosed ? 0 : held.get(ticketId) ?? 0;
      const taken = Math.min(h, cost);
      held.set(ticketId, h - taken);
      events.push({ t: Date.now(), kind: isClosed ? "charge-sau-dong" : "charge", id: ticketId, n: taken });
      return taken;
    },
    close: async ({ ticketId }) => {
      money += held.get(ticketId) ?? 0;
      held.set(ticketId, 0);
      events.push({ t: Date.now(), kind: "close", id: ticketId });
    },
  };
  return { billing, events };
}

/** Alibaba giả. `onAudio` quyết định trả gì khi nhận âm thanh. Đếm số kết nối. */
function fakeAli(behaviour: { onAudio?: (ws: WebSocket, n: number) => void; closeAfterUpdate?: boolean } = {}) {
  const wss = new WebSocketServer({ port: 0 });
  const seen = { connections: 0, audioBytes: 0, chunks: 0 };
  wss.on("connection", (ws) => {
    seen.connections += 1;
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString()) as { type: string; audio?: string };
      if (msg.type === "session.update") {
        if (behaviour.closeAfterUpdate) return void ws.close(1011, "upstream-loi");
        ws.send(JSON.stringify({ type: "session.updated" }));
      } else if (msg.type === "input_audio_buffer.append") {
        seen.chunks += 1;
        seen.audioBytes += Buffer.from(msg.audio ?? "", "base64").length;
        behaviour.onAudio?.(ws, seen.chunks);
      } else if (msg.type === "session.finish") {
        ws.send(JSON.stringify({ type: "session.finished" }));
      }
    });
  });
  const port = (wss.address() as { port: number }).port;
  return { wss, seen, url: `ws://127.0.0.1:${port}/realtime` };
}

const usage = (audioTokens: number) =>
  JSON.stringify({ type: "response.done", response: { status: "completed", usage: { input_tokens_details: { audio_tokens: audioTokens }, output_tokens_details: { text_tokens: 5, audio_tokens: 0 } } } });

async function session(ali: ReturnType<typeof fakeAli>, billing: LiveBilling, extra: Record<string, unknown> = {}) {
  const server = createServer();
  attachLiveBridge(server, { secret: "k", upstream: async () => ({ url: ali.url, key: "K" }), billing, blockSeconds: 120, drainMs: 800, ...extra });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  const token = signLiveTicket("k", { uid: "u1", sid: `s${Math.random()}`, model: LIVE_MODEL_38, target: "en", source: "", audio: false, exp: Date.now() + 60_000 });
  const client = new WebSocket(`ws://127.0.0.1:${port}/live?ticket=${encodeURIComponent(token)}`);
  const msgs: Array<{ type: string }> = [];
  client.on("message", (d, bin) => {
    if (!bin) msgs.push(JSON.parse(d.toString()));
  });
  const closed = new Promise<number>((r) => client.on("close", (code) => r(code)));
  const ready = async () => {
    while (!msgs.some((m) => m.type === "ready")) await wait(10);
  };
  const done = () => {
    server.close();
    ali.wss.close();
    client.terminate();
  };
  return { client, msgs, closed, ready, done };
}

describe("cầu nối Dịch trực tiếp: vòng đời phiên và tiền", () => {
  it("DEEP-001: Alibaba báo «finished» ngay sau usage → phiếu chỉ đóng sau khi trừ xong", async () => {
    const ali = fakeAli({
      onAudio: (ws, n) => {
        if (n === 1) {
          ws.send(usage(500));
          ws.send(JSON.stringify({ type: "session.finished" }));
        }
      },
    });
    const bill = slowBilling({ chargeDelay: 150 });
    const s = await session(ali, bill.billing);
    await s.ready();
    s.client.send(Buffer.alloc(3200));
    await s.closed;
    await wait(300);
    s.done();
    assert.ok(!bill.events.some((e) => e.kind === "charge-sau-dong"), JSON.stringify(bill.events));
    assert.ok(bill.events.some((e) => e.kind === "charge" && (e.n ?? 0) > 0));
  });

  it("DEEP-002: xin giữ thêm đang chậm → không gửi tiếng vượt phần đã giữ", async () => {
    const ali = fakeAli();
    // Khoảng 1 giữ ngay, khoảng 2 trả lời sau 1,5 giây.
    const bill = slowBilling({ openDelay: (n) => (n >= 2 ? 1500 : 0) });
    const s = await session(ali, bill.billing, { blockSeconds: 2 });
    await s.ready();
    // Gửi 6 giây tiếng trong ~0,3 giây: phần giữ chỉ đủ 2 giây cho tới khi khoảng 2 về.
    for (let i = 0; i < 60; i += 1) s.client.send(Buffer.alloc(3200));
    await wait(600);
    const sentSeconds = ali.seen.audioBytes / 32000;
    s.client.send(JSON.stringify({ type: "stop" }));
    await s.closed;
    s.done();
    assert.ok(sentSeconds <= 2.05, `đã gửi ${sentSeconds.toFixed(2)} giây khi chỉ giữ đủ 2 giây`);
  });

  it("DEEP-005: lần giữ thêm trả về sau khi phiên đóng → phiếu đó vẫn được nhả", async () => {
    const ali = fakeAli();
    const bill = slowBilling({ openDelay: (n) => (n >= 2 ? 400 : 0) });
    const s = await session(ali, bill.billing, { blockSeconds: 2, drainMs: 50 });
    await s.ready();
    for (let i = 0; i < 15; i += 1) s.client.send(Buffer.alloc(3200)); // 1,5 giây → quá ngưỡng 40%, xin giữ thêm
    await wait(30);
    s.client.send(JSON.stringify({ type: "stop" }));
    await s.closed;
    await wait(800);
    s.done();
    const opened = bill.events.filter((e) => e.kind === "open").map((e) => e.id).sort();
    const closed = bill.events.filter((e) => e.kind === "close").map((e) => e.id).sort();
    assert.ok(opened.length >= 2, `chỉ mở ${opened.length} phiếu`);
    assert.deepEqual(closed, opened);
  });

  it("DEEP-004: Alibaba cắt, khách rời trong lúc chờ nối lại → không mở lại kết nối Alibaba", async () => {
    const ali = fakeAli({ closeAfterUpdate: true });
    const bill = slowBilling({});
    const s = await session(ali, bill.billing, { maxReconnects: 3 });
    while (!s.msgs.some((m) => m.type === "reconnecting")) await wait(10);
    s.client.close();
    await s.closed;
    const before = ali.seen.connections;
    await wait(1500);
    s.done();
    assert.equal(ali.seen.connections, before, "đã nối lại Alibaba sau khi phiên đóng");
  });

  it("DEEP-006: khách rời trong lúc cầu nối đang đọc giá → không giữ tiền, hoặc giữ rồi nhả ngay", async () => {
    const ali = fakeAli();
    const bill = slowBilling({ bookDelay: 300 });
    const s = await session(ali, bill.billing);
    await new Promise((r) => s.client.on("open", r));
    s.client.close();
    await s.closed;
    await wait(800);
    s.done();
    const opened = bill.events.filter((e) => e.kind === "open").map((e) => e.id);
    const closed = bill.events.filter((e) => e.kind === "close").map((e) => e.id);
    assert.deepEqual(closed.sort(), opened.sort(), JSON.stringify(bill.events));
    assert.equal(ali.seen.connections, 0, "không cần nối Alibaba cho khách đã rời");
  });

  it("DEEP-003: chi phí nhà cung cấp ghi theo usage thật của từng lượt, kể cả khi thu thiếu", async () => {
    const ali = fakeAli({
      onAudio: (ws, n) => {
        if (n === 1) ws.send(usage(5000));
      },
    });
    const bill = slowBilling({});
    const spent: number[] = [];
    // Sổ giả trừ tối đa 1 đơn vị mỗi lần: khách bị thu thiếu so với giá thật.
    const billing = { ...bill.billing, charge: async () => 1, spend: async ({ base }: { base: number }) => void spent.push(base) };
    const s = await session(ali, billing);
    await s.ready();
    s.client.send(Buffer.alloc(3200));
    await wait(300);
    s.client.send(JSON.stringify({ type: "stop" }));
    await s.closed;
    s.done();
    const { liveCost } = await import("./live-cost.ts");
    const want = liveCost(book, LIVE_MODEL_38, { audioIn: 5000, textIn: 0, imageIn: 0, textOut: 5, audioOut: 0 })!.base;
    assert.deepEqual(spent, [want]);
  });
});


it("DEEP-008: upstream backlog drops audio and recovers after draining", {timeout:5000}, async () => {
  const ali=fakeAli(); const bill=slowBilling({}); const s=await session(ali,bill.billing);
  const previous=Object.getOwnPropertyDescriptor(WebSocket.prototype,"bufferedAmount")!;
  let congested=true;
  try {
    await s.ready();
    Object.defineProperty(WebSocket.prototype,"bufferedAmount",{configurable:true,get:function(this:WebSocket){
      if(congested && this.url?.includes("/realtime")) return 2*1024*1024;
      return previous.get?.call(this) ?? 0;
    }});
    s.client.send(Buffer.alloc(3200,1));await wait(100);
    assert.equal(ali.seen.audioBytes,0);
    congested=false;s.client.send(Buffer.alloc(3200,1));
    for(let i=0;i<100&&!ali.seen.audioBytes;i++)await wait(10);
    assert.ok(ali.seen.audioBytes>0);
    s.client.send(JSON.stringify({type:"stop"}));await s.closed;
  } finally {
    Object.defineProperty(WebSocket.prototype,"bufferedAmount",previous);s.done();
  }
});
