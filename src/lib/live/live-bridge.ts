import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer, type RawData } from "ws";
import { liveCost, liveHold, type LiveBook } from "./live-cost.ts";
import { LiveMeter } from "./live-meter.ts";
import { verifyLiveTicket } from "./live-ticket.ts";
import { targetHasVoice, liveLang } from "./langs.ts";
import { audioAppend, buildSessionUpdate, genOf, parseServerEvent, SESSION_FINISH } from "./qwen-protocol.ts";
import { LiveLatency, pcmPeak, SILENT_PEAK, IDLE_STOP_MS, type LatencySummary } from "./live-latency.ts";

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
  /** Đổi giá gốc (đồng) ra Token dịch. Có hàm này thì cầu nối không giữ ví đồng. */
  toGiay?: (baseVnd: number) => number | null;
  /** Độ dài mỗi khoảng giữ chỗ, giây. Mặc định 120. */
  blockSeconds?: number;
  connect?: (url: string, key: string) => WebSocket;
  /** Số lần tự nối lại khi nhà cung cấp cắt (vd. quá 60 giây không có kết quả). Mặc định 3. */
  maxReconnects?: number;
  /** Chờ tối đa bao lâu cho phần dịch cuối sau khi dừng, mili giây. Mặc định 8000. */
  drainMs?: number;
  /** Qwen 3.5: thời gian im lặng (ms) để chốt câu. Bỏ trống thì dùng LIVE_SILENCE_MS. */
  silenceMs?: number;
  log?: (message: string) => void;
  /** Đệm tối đa bao nhiêu giây tiếng khi Alibaba chưa sẵn sàng hoặc đang nối lại. Mặc định 10. */
  bufferSeconds?: number;
  /** Không nghe thấy tiếng quá chừng này (ms) thì tự dừng phiên, khỏi trừ Token lúc im. 0 = tắt. Mặc định 5 phút. */
  idleStopMs?: number;
  /** Sổ phiên đang chạy, để cầu nối biết lúc nào rảnh mà cập nhật và dừng nhẹ mọi phiên khi tắt. */
  registry?: LiveRegistry;
  /** Gọi một lần khi phiên đóng, kèm số đo độ trễ. Không có tài khoản hay chữ. */
  onStats?: (stats: LiveSessionStats) => void;
};

export type LiveSessionStats = LatencySummary & {
  model: string;
  /** "app" khi phiên mở từ ứng dụng Android, còn lại "web". */
  via: "web" | "app";
  /** Số sự kiện chữ (gốc và dịch) đã chuyển cho khách. 0 mà có tiếng là dấu hiệu Alibaba không trả chữ. */
  events: number;
  audioSeconds: number;
  reconnects: number;
  endReason: string;
};

/** Một phiên đang chạy, nhìn từ ngoài: chỉ dừng nhẹ được. */
export type LiveHandle = { stop(reason: string, message?: string): void };

/** Sổ phiên đang chạy. `onChange` gọi mỗi khi số phiên đổi. */
export class LiveRegistry {
  readonly sessions = new Set<LiveHandle>();
  onChange?: (count: number) => void;
  add(handle: LiveHandle) {
    this.sessions.add(handle);
    this.onChange?.(this.sessions.size);
  }
  remove(handle: LiveHandle) {
    if (this.sessions.delete(handle)) this.onChange?.(this.sessions.size);
  }
  get size() {
    return this.sessions.size;
  }
  /** Dừng nhẹ mọi phiên (trả phần dịch cuối, nhả phần giữ thừa). */
  stopAll(reason: string, message?: string) {
    for (const handle of [...this.sessions]) handle.stop(reason, message);
  }
}

const PCM_BYTES_PER_SEC = 16000 * 2;
/** Câu Alibaba gửi khi tự cắt vì lâu không có tiếng (Response stream timeout (timeout_seconds=60, …)). */
const IDLE_CUT = /stream timeout|timeout_seconds/i;

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

  // Nghe khách ngay từ đầu: trình duyệt mới gửi tiếng trước khi Alibaba sẵn sàng (đỡ mất mấy chữ đầu),
  // và khách có thể rời trong lúc cầu nối còn đang giữ chỗ. Tin đến sớm được giữ lại, xử lý sau khi mở phiên.
  const sessionStart = now();
  const early: Array<{ data: RawData; isBinary: boolean }> = [];
  let earlyBytes = 0;
  let onClientMessage: ((data: RawData, isBinary: boolean) => void) | null = null;
  let clientGone = false;
  let onClientGone: ((reason: string) => void) | null = null;
  const bufferLimit = Math.max(0, deps.bufferSeconds ?? 10) * PCM_BYTES_PER_SEC;
  client.on("message", (data, isBinary) => {
    if (onClientMessage) return onClientMessage(data, isBinary);
    const size = isBinary ? (data as Buffer).length : 0;
    if (isBinary && earlyBytes + size > bufferLimit) return;
    earlyBytes += size;
    early.push({ data, isBinary });
  });
  client.on("close", () => {
    clientGone = true;
    onClientGone?.("khach-roi");
  });
  client.on("error", () => {
    clientGone = true;
    onClientGone?.("khach-loi");
  });

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
  const holdUnits = deps.toGiay ? deps.toGiay(quote.base) : quote.cost;
  if (holdUnits == null || !(holdUnits > 0)) return fail(4402, "Model này chưa có giá niêm yết.");
  const route = await deps.upstream(ticket.model);
  if (!route) return fail(4503, "Phòng chưa cấu hình Alibaba cho dịch trực tiếp.");

  const meter = new LiveMeter(holdUnits, blockSeconds);
  const tickets: string[] = [];
  let seq = 0;
  let opening: Promise<void> | null = null;

  const openBlock = async (): Promise<boolean> => {
    seq += 1;
    const ticketId = `${ticket.sid}-${seq}`;
    const result = await deps.billing.open({ userId: ticket.uid, ticketId, hold: holdUnits, seconds: blockSeconds, model: ticket.model });
    if (!result.ok) {
      meter.denied = true;
      return false;
    }
    tickets.push(ticketId);
    meter.grant(holdUnits);
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

  // Khách đã rời trong lúc kiểm vé: không giữ Token, không mở Alibaba.
  if (clientGone) return;
  if (!(await openBlock())) {
    return fail(4402, deps.toGiay ? "Token dịch chưa đủ. Hãy mua thêm gói." : "Số dư chưa đủ hoặc đã quá hạn mức hôm nay. Hãy nạp thêm.");
  }

  let upstream: WebSocket | null = null;
  let ready = false;
  /** Tiếng chờ gửi khi Alibaba chưa sẵn sàng hoặc đang nối lại. Đầy thì bỏ khung cũ nhất. */
  const pending: Buffer[] = [];
  let pendingBytes = 0;
  const latency = new LiveLatency(sessionStart);
  const idleStopMs = deps.idleStopMs ?? IDLE_STOP_MS;
  let lastSoundAt = now();
  let audioSeconds = 0;
  let textEvents = 0;
  /** Alibaba vừa báo cắt vì im lặng. */
  let idleCut = false;
  /** Đang ngủ sau khi Alibaba cắt vì im lặng: chưa nối, chờ khung tiếng. */
  let dormant = false;
  let wakeUps = 0;
  let endReason = "";
  let finishing = false;
  let closed = false;
  let reconnects = 0;
  let drainTimer: ReturnType<typeof setTimeout> | null = null;
  const maxReconnects = deps.maxReconnects ?? 3;
  const sessionUpdate = JSON.stringify(
    buildSessionUpdate({ model: ticket.model, target: ticket.target, source: ticket.source || undefined, audio, ...(ticket.words ? { hotwords: ticket.words } : {}), ...(deps.silenceMs ? { silenceMs: deps.silenceMs } : {}) }),
  );

  const handle: LiveHandle = { stop: (reason, message) => {
    if (message) send(client, { type: "error", message });
    stop(reason);
  } };

  function stop(reason: string) {
    if (finishing) return;
    finishing = true;
    endReason = reason;
    send(client, { type: "closing", reason });
    if (upstream && upstream.readyState === WebSocket.OPEN) upstream.send(SESSION_FINISH);
    else void finalize(false);
    drainTimer = setTimeout(() => void finalize(false), deps.drainMs ?? 8000);
  }

  async function finalize(failed: boolean) {
    if (closed) return;
    closed = true;
    if (drainTimer) clearTimeout(drainTimer);
    pending.length = 0;
    pendingBytes = 0;
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
    deps.registry?.remove(handle);
    try {
      const stats: LiveSessionStats = { ...latency.summary(), model: ticket!.model, via: ticket!.via === "app" ? "app" : "web", events: textEvents, audioSeconds: Math.round(audioSeconds), reconnects, endReason: endReason || (failed ? "loi" : "xong") };
      // Một dòng mỗi phiên trong nhật ký cầu nối (tyzo → 3): đủ để biết phiên dừng ở bước nào, không có tài khoản hay chữ.
      log(`phiên xong: ${stats.via} ${stats.model} sẵn-sàng=${stats.readyMs ?? "chưa"}ms tiếng=${stats.audioSeconds}s sự-kiện-chữ=${stats.events} câu=${stats.chot.length} nối-lại=${stats.reconnects} ngủ-dậy=${wakeUps} lý-do=${stats.endReason}`);
      deps.onStats?.(stats);
    } catch (error) {
      log(`ghi số đo lỗi: ${String(error)}`);
    }
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
        latency.ready(now());
        send(client, { type: "ready", audio });
        flushPending();
        continue;
      }
      if (event.kind === "speech") {
        latency.mark(event, now());
        continue;
      }
      if (event.kind === "source" || event.kind === "source-delta" || event.kind === "translation" || event.kind === "translation-delta") textEvents += 1;
      if (event.kind === "error") {
        log(`Alibaba báo lỗi: ${event.message}`);
        // Alibaba tự cắt khi quá 60 giây không nhận được tiếng (video dừng, điện thoại không phát gì).
        // Không phải lỗi của khách: không hiện câu tiếng Anh, chờ có tiếng lại mới nối (xem handleClient).
        if (IDLE_CUT.test(event.message)) {
          idleCut = true;
          continue;
        }
      }
      if (event.kind === "source" || event.kind === "source-delta") latency.mark({ kind: "source" }, now());
      else if (event.kind === "translation") latency.mark({ kind: "translation", id: event.id, final: event.final }, now());
      else if (event.kind === "translation-delta") latency.mark({ kind: "translation", id: event.id, final: false }, now());
      if (event.kind === "usage") {
        const priced = liveCost(book, ticket.model, event.usage);
        let taken = 0;
        if (priced && priced.base > 0) {
          const amount = deps.toGiay ? deps.toGiay(priced.base) : priced.cost;
          if (amount != null && amount > 0) {
          // Trừ vào phiếu mới nhất trước; phần tràn sang phiếu cũ hơn nếu phiếu mới đã cạn.
          let left = amount;
          for (let i = tickets.length - 1; i >= 0 && left > 0; i -= 1) {
            const part = await deps.billing.charge({ userId: ticket.uid, ticketId: tickets[i], cost: left, base: i === tickets.length - 1 ? priced.base : 0 });
            taken += part;
            left -= part;
          }
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
      if (idleCut) {
        // Cắt vì im lặng: ngủ, không tính vào số lần nối lại hỏng. Khung tiếng kế tiếp sẽ đánh thức.
        idleCut = false;
        dormant = true;
        ready = false;
        upstream = null;
        log("Alibaba cắt vì im lặng, chờ có tiếng lại mới nối");
        return;
      }
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

  const sendAudio = (bytes: Buffer) => {
    if (!upstream || upstream.readyState !== WebSocket.OPEN) return;
    upstream.send(audioAppend(bytes));
    latency.audio(now());
    const seconds = bytes.length / PCM_BYTES_PER_SEC;
    audioSeconds += seconds;
    meter.audio(seconds);
    topUp();
  };
  function flushPending() {
    while (pending.length && ready && !finishing && !meter.mustStop()) {
      const bytes = pending.shift()!;
      pendingBytes -= bytes.length;
      sendAudio(bytes);
    }
  }

  const handleClient = (data: RawData, isBinary: boolean) => {
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
    if (finishing || meter.mustStop()) return;
    const bytes = data as Buffer;
    // Im lặng quá lâu (video dừng, tab tắt tiếng) thì tự dừng để khách không bị trừ Token lúc im.
    const at = now();
    const loud = pcmPeak(bytes) >= SILENT_PEAK;
    if (loud) lastSoundAt = at;
    else if (idleStopMs > 0 && at - lastSoundAt >= idleStopMs) {
      const minutes = Math.round(idleStopMs / 60_000);
      send(client, { type: "error", message: `Đã tự dừng vì ${minutes} phút không nghe thấy tiếng, để không trừ Token lúc im lặng. Bấm Bắt đầu để dịch tiếp.` });
      return stop("im-lang");
    }
    if (dormant) {
      // Đang ngủ vì im: khung im bỏ đi (không gửi, không tính Token). Có tiếng lại thì nối Alibaba,
      // tiếng được đệm tới khi sẵn sàng.
      if (!loud) return;
      dormant = false;
      wakeUps += 1;
      connectUpstream();
    }
    if (!ready || !upstream || upstream.readyState !== WebSocket.OPEN) {
      // Alibaba chưa sẵn sàng hoặc đang nối lại: đệm, không bỏ.
      pending.push(bytes);
      pendingBytes += bytes.length;
      while (pendingBytes > bufferLimit && pending.length) pendingBytes -= pending.shift()!.length;
      return;
    }
    if (pending.length) flushPending();
    sendAudio(bytes);
  };
  onClientMessage = handleClient;
  onClientGone = (reason) => {
    if (!closed) stop(reason);
  };
  deps.registry?.add(handle);
  for (const item of early.splice(0)) handleClient(item.data, item.isBinary);
  if (clientGone) stop("khach-roi");
}
