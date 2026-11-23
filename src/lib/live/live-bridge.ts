import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer, type RawData } from "ws";
import { liveCost, liveHold, type LiveBook } from "./live-cost.ts";
import { LiveMeter } from "./live-meter.ts";
import { verifyLiveTicket } from "./live-ticket.ts";
import { targetHasVoice, liveLang } from "./langs.ts";
import { audioAppend, buildSessionUpdate, genOf, parseServerEvent, SESSION_FINISH } from "./qwen-protocol.ts";
import { mulawToPcm16 } from "./mulaw.ts";
import { aliErrorText } from "./ali-error.ts";

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

type LiveBridgeDeps = {
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
  /** Qwen 3.5: độ nhạy nhận tiếng (0,1–0,9). Bỏ trống thì 0,2 như cũ. Đặt bằng LIVE_VAD_THRESHOLD. */
  vadThreshold?: number;
  log?: (message: string) => void;
};

const PCM_BYTES_PER_SEC = 16000 * 2;
/** Câu Alibaba gửi khi tự cắt vì lâu không có kết quả (video im): «Response stream timeout (timeout_seconds=60, …)». */
const IDLE_CUT = /stream timeout|timeout_seconds/i;
/** Dưới mức này (khoảng -50 dBFS) coi khung là im. */
const SILENT_PEAK = 100;

/** Đỉnh biên độ của khung PCM 16 bit little-endian. */
function pcmPeak(bytes: Uint8Array): number {
  let peak = 0;
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    let v = bytes[i] | (bytes[i + 1] << 8);
    if (v & 0x8000) v -= 0x10000;
    if (Math.abs(v) > peak) peak = Math.abs(v);
  }
  return peak;
}

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

async function runSession(client: WebSocket, token: string, deps: LiveBridgeDeps): Promise<void> {
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

  if (!(await openBlock())) {
    return fail(4402, deps.toGiay ? "Token dịch chưa đủ. Hãy mua thêm gói." : "Số dư chưa đủ hoặc đã quá hạn mức hôm nay. Hãy nạp thêm.");
  }

  let upstream: WebSocket | null = null;
  let ready = false;
  let finishing = false;
  let closed = false;
  let reconnects = 0;
  /** Alibaba vừa báo cắt vì im lặng. */
  let idleCut = false;
  /** Đã bị cắt vì im lặng: chưa nối lại, chờ khung có tiếng. */
  let dormant = false;
  let wakeUps = 0;
  /** Khách gửi tiếng nén μ-law (ứng dụng 0.7+); mặc định PCM 16 bit. */
  let mulaw = false;
  let drainTimer: ReturnType<typeof setTimeout> | null = null;
  const maxReconnects = deps.maxReconnects ?? 3;
  const sessionUpdate = JSON.stringify(
    buildSessionUpdate({ model: ticket.model, target: ticket.target, source: ticket.source || undefined, audio, ...(ticket.words ? { hotwords: ticket.words } : {}), ...(deps.silenceMs ? { silenceMs: deps.silenceMs } : {}), ...(deps.vadThreshold ? { vadThreshold: deps.vadThreshold } : {}) }),
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
    log(`phiên đóng: ${ticket!.model} nối-lại=${reconnects} ngủ-dậy=${wakeUps} lỗi=${failed ? "có" : "không"}`);
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
        // codecs: kiểu tiếng cầu nối nhận được. Ứng dụng 0.7+ thấy "mulaw" thì gửi tiếng nén (nửa dữ liệu);
        // web và ứng dụng cũ bỏ qua trường này, vẫn gửi PCM.
        send(client, { type: "ready", audio, codecs: ["pcm", "mulaw"] });
        continue;
      }
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
      if (event.kind === "error") {
        log(`Alibaba báo lỗi: ${event.message}`);
        // Alibaba tự cắt khi quá 60 giây không ra kết quả (video im). Không phải lỗi của khách: không hiện câu
        // tiếng Anh, không tính vào số lần nối lại hỏng; có tiếng lại mới nối (xem client.on message).
        if (IDLE_CUT.test(event.message)) {
          idleCut = true;
          continue;
        }
        // Khách đọc câu tiếng Việt (thiếu gì, làm gì tiếp); nguyên văn đã ghi nhật ký ở trên.
        send(client, { type: "event", event: { ...event, message: aliErrorText(event.message) } });
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
    ws.on("close", (code, reason) => {
      if (closed || ws !== upstream) return;
      log(`Alibaba đóng kết nối: mã ${code} ${reason.toString().slice(0, 120)}`);
      if (finishing) return void finalize(false);
      if (idleCut) {
        idleCut = false;
        dormant = true;
        ready = false;
        upstream = null;
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

  client.on("message", (data, isBinary) => {
    if (closed) return;
    if (!isBinary) {
      try {
        const message = JSON.parse(data.toString()) as { type?: string; value?: string };
        if (message.type === "stop") stop("nguoi-dung-dung");
        // Khách chọn kiểu tiếng cho các khung sau (thứ tự tin trên một kết nối được giữ nguyên).
        if (message.type === "codec") mulaw = message.value === "mulaw";
      } catch {
        /* bỏ qua */
      }
      return;
    }
    if (finishing) return;
    const pcm = mulaw ? mulawToPcm16(data as Buffer) : (data as Buffer);
    if (dormant) {
      // Khung im lúc ngủ bỏ đi (không gửi, không trừ Token). Có tiếng lại thì nối Alibaba.
      if (pcmPeak(pcm) < SILENT_PEAK) return;
      dormant = false;
      wakeUps += 1;
      connectUpstream();
      return;
    }
    if (!ready || !upstream || upstream.readyState !== WebSocket.OPEN) return;
    const bytes = pcm;
    if (meter.mustStop()) return;
    upstream.send(audioAppend(bytes));
    meter.audio(bytes.length / PCM_BYTES_PER_SEC);
    topUp();
  });
  client.on("close", (code, reason) => {
    // Mã 1006 = mạng đứt ngang (điện thoại mất mạng, không trả lời ping); 1000 = khách đóng bình thường.
    if (!closed) log(`khách rời: mã ${code} ${reason.toString().slice(0, 80)}`);
    if (!closed) stop("khach-roi");
  });
  client.on("error", (error) => {
    if (!closed) log(`kết nối khách lỗi: ${String(error)}`);
    if (!closed) stop("khach-loi");
  });
}
