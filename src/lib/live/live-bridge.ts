import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer, type RawData } from "ws";
import { liveCost, liveHold, type LiveBook } from "./live-cost.ts";
import { LiveMeter } from "./live-meter.ts";
import { verifyLiveTicket } from "./live-ticket.ts";
import { targetHasVoice, liveLang } from "./langs.ts";
import { audioAppend, buildSessionUpdate, genOf, parseServerEvent, SESSION_FINISH } from "./qwen-protocol.ts";

/**
 * Cầu nối dịch trực tiếp: trình duyệt ⇄ cầu nối ⇄ Alibaba.
 *
 * Không biết gì về Vercel hay TanStack: mọi thứ bên ngoài (giá, key, giữ tiền) đi qua `LiveBridgeDeps`.
 * Hôm nay chạy như một dịch vụ riêng (scripts/live-bridge.ts). Khi có VPS chạy cả web thì gọi
 * `attachLiveBridge(server, deps)` trên chính máy chủ HTTP đó, không viết lại gì.
 *
 * Giao thức với trình duyệt:
 *  - trình duyệt gửi khung nhị phân = PCM 16 bit, 16 kHz, mono; hoặc chữ JSON {"type":"stop"}
 *  - cầu nối gửi chữ JSON {"type":"ready"|"event"|"balance"|"low"|"closing"|"error"}
 *    và khung nhị phân = PCM 24 kHz của tiếng dịch
 */
export type LiveBilling = {
  /** Bảng giá hiện hành (đã cộng chênh). null khi chưa có giá. */
  book(): Promise<LiveBook | null>;
  open(args: { userId: string; ticketId: string; hold: number; seconds: number; model: string }): Promise<{ ok: true } | { ok: false; reason: "het-tien" | "qua-han-muc" | "loi" }>;
  /** Trừ vào phiếu, trả số thực trừ (không vượt quá tiền đang giữ). */
  charge(args: { userId: string; ticketId: string; cost: number; base: number }): Promise<number>;
  /** Nhả phần giữ thừa. */
  close(args: { userId: string; ticketId: string; failed: boolean }): Promise<void>;
};

export type LiveBridgeDeps = {
  secret: string;
  /** Địa chỉ WebSocket và key của Alibaba. Key không bao giờ rời cầu nối. */
  upstream(model: string): Promise<{ url: string; key: string } | null>;
  billing: LiveBilling;
  now?: () => number;
  /** Độ dài mỗi khoảng giữ tiền, giây. Mặc định 120. */
  blockSeconds?: number;
  /** Thay cách mở kết nối tới nhà cung cấp, dùng cho test. */
  connect?: (url: string, key: string) => WebSocket;
  /** Số lần tự nối lại khi nhà cung cấp cắt (vd. quá 60 giây không có kết quả). Mặc định 3. */
  maxReconnects?: number;
  /** Chờ tối đa bao lâu cho phần dịch cuối sau khi dừng, mili giây. Mặc định 8000. */
  drainMs?: number;
  log?: (message: string) => void;
};

const PCM_BYTES_PER_SEC = 16000 * 2;

function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

export function attachLiveBridge(server: Server, deps: LiveBridgeDeps, path = "/live"): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? "/", "http://bridge");
    if (url.pathname !== path) return;
    wss.handleUpgrade(request, socket, head, (client) => {
      // Lỗi của một phiên (vd. cơ sở dữ liệu đứt) chỉ đóng phiên đó, không được làm sập cả cầu nối.
      runSession(client, url.searchParams.get("ticket") ?? "", deps).catch((error) => {
        deps.log?.(`phiên lỗi: ${String(error)}`);
        send(client, { type: "error", message: "Cầu nối gặp sự cố, hãy thử lại sau ít phút." });
        client.close(1011, "loi-cau-noi");
      });
    });
  });
  return wss;
}

export async function runSession(client: WebSocket, token: string, deps: LiveBridgeDeps): Promise<void> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const fail = (code: number, reason: string) => {
    send(client, { type: "error", message: reason });
    client.close(code, reason.slice(0, 120));
  };

  const ticket = verifyLiveTicket(deps.secret, token, now());
  if (!ticket) return fail(4401, "Vé không hợp lệ hoặc đã hết hạn.");
  const gen = genOf(ticket.model);
  if (!gen || !liveLang(ticket.target)) return fail(4400, "Model hoặc ngôn ngữ không được hỗ trợ.");
  const audio = ticket.audio && targetHasVoice(ticket.target);

  const book = await deps.billing.book();
  if (!book) return fail(4402, "Chưa có bảng giá để tính tiền.");
  const blockSeconds = deps.blockSeconds ?? 120;
  const quote = liveHold(book, ticket.model, audio, blockSeconds);
  if (!quote) return fail(4402, "Model này chưa có giá niêm yết.");
  const route = await deps.upstream(ticket.model);
  if (!route) return fail(4503, "Phòng chưa cấu hình Alibaba cho dịch trực tiếp.");

  const meter = new LiveMeter(quote.cost, blockSeconds);
  const tickets: string[] = [];
  let seq = 0;
  let opening: Promise<void> | null = null;

  const openBlock = async (): Promise<boolean> => {
    seq += 1;
    const ticketId = `${ticket.sid}-${seq}`;
    const result = await deps.billing.open({ userId: ticket.uid, ticketId, hold: quote.cost, seconds: blockSeconds, model: ticket.model });
    if (!result.ok) {
      meter.denied = true;
      return false;
    }
    tickets.push(ticketId);
    meter.grant(quote.cost);
    return true;
  };
  const topUp = () => {
    if (opening || !meter.wantsMore()) return;
    opening = openBlock()
      .catch(() => {
        meter.denied = true;
        return false;
      })
      .then(() => {
        opening = null;
        report();
      });
  };

  const report = () => {
    send(client, { type: "balance", heldLeft: meter.heldLeft, denied: meter.denied });
    if (meter.low() && !meter.mustStop()) send(client, { type: "low" });
    if (meter.mustStop()) stop("het-tien");
  };

  if (!(await openBlock())) {
    return fail(4402, "Số dư chưa đủ hoặc đã quá hạn mức hôm nay. Hãy nạp thêm.");
  }

  let upstream: WebSocket | null = null;
  let ready = false;
  let finishing = false;
  let closed = false;
  let reconnects = 0;
  let drainTimer: ReturnType<typeof setTimeout> | null = null;
  const maxReconnects = deps.maxReconnects ?? 3;
  const sessionUpdate = JSON.stringify(
    buildSessionUpdate({ model: ticket.model, target: ticket.target, source: ticket.source || undefined, audio }),
  );

  function stop(reason: string) {
    if (finishing) return;
    finishing = true;
    send(client, { type: "closing", reason });
    if (upstream && upstream.readyState === WebSocket.OPEN) upstream.send(SESSION_FINISH);
    else void finalize(false);
    drainTimer = setTimeout(() => void finalize(false), deps.drainMs ?? 8000);
  }

  async function finalize(failed: boolean) {
    if (closed) return;
    closed = true;
    if (drainTimer) clearTimeout(drainTimer);
    try {
      upstream?.close();
    } catch {
      /* đã đóng */
    }
    for (const id of tickets) {
      try {
        await deps.billing.close({ userId: ticket!.uid, ticketId: id, failed });
      } catch (error) {
        log(`nhả phiếu ${id} lỗi: ${String(error)}`);
      }
    }
    if (client.readyState === WebSocket.OPEN) client.close(1000, "done");
  }

  const handleUpstream = async (raw: RawData) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      return;
    }
    for (const event of parseServerEvent(parsed)) {
      if (event.kind === "audio") {
        if (client.readyState === WebSocket.OPEN) client.send(Buffer.from(event.base64, "base64"));
        continue;
      }
      if (event.kind === "ready") {
        ready = true;
        send(client, { type: "ready", audio });
        continue;
      }
      if (event.kind === "usage") {
        const priced = liveCost(book, ticket.model, event.usage);
        let taken = 0;
        if (priced && priced.cost > 0) {
          // Trừ vào phiếu mới nhất trước; phần tràn sang phiếu cũ hơn nếu phiếu mới đã cạn.
          let left = priced.cost;
          for (let i = tickets.length - 1; i >= 0 && left > 0; i -= 1) {
            const part = await deps.billing.charge({ userId: ticket.uid, ticketId: tickets[i], cost: left, base: i === tickets.length - 1 ? priced.base : 0 });
            taken += part;
            left -= part;
          }
        }
        meter.settle(taken, event.usage.audioIn);
        topUp();
        report();
        continue;
      }
      if (event.kind === "finished") {
        void finalize(false);
        continue;
      }
      send(client, { type: "event", event });
    }
  };

  const connectUpstream = () => {
    const ws = deps.connect ? deps.connect(route.url, route.key) : new WebSocket(route.url, { headers: { Authorization: `Bearer ${route.key}` } });
    upstream = ws;
    ws.on("open", () => ws.send(sessionUpdate));
    ws.on("message", (raw) => void handleUpstream(raw).catch((error) => log(`xử lý tin Alibaba lỗi: ${String(error)}`)));
    ws.on("error", (error) => log(`upstream: ${String(error)}`));
    ws.on("close", () => {
      if (closed || ws !== upstream) return;
      if (finishing) return void finalize(false);
      if (reconnects < maxReconnects) {
        reconnects += 1;
        ready = false;
        send(client, { type: "reconnecting", attempt: reconnects });
        setTimeout(connectUpstream, 300 * reconnects);
      } else {
        send(client, { type: "error", message: "Mất kết nối tới dịch vụ dịch." });
        void finalize(true);
      }
    });
  };
  connectUpstream();

  client.on("message", (data, isBinary) => {
    if (closed) return;
    if (!isBinary) {
      try {
        const message = JSON.parse(data.toString()) as { type?: string };
        if (message.type === "stop") stop("nguoi-dung-dung");
      } catch {
        /* bỏ qua */
      }
      return;
    }
    if (finishing || !ready || !upstream || upstream.readyState !== WebSocket.OPEN) return;
    const bytes = data as Buffer;
    if (meter.mustStop()) return;
    upstream.send(audioAppend(bytes));
    meter.audio(bytes.length / PCM_BYTES_PER_SEC);
    topUp();
  });
  client.on("close", () => {
    if (!closed) stop("khach-roi");
  });
  client.on("error", () => {
    if (!closed) stop("khach-loi");
  });
}
