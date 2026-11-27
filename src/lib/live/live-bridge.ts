import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer, type RawData } from "ws";
import {
  cumulativeUsageDelta,
  liveCost,
  liveSupplierCost,
  liveHold,
  type LiveBook,
  type LiveUsage,
} from "./live-cost.ts";
import { LiveMeter } from "./live-meter.ts";
import { verifyLiveTicket } from "./live-ticket.ts";
import { targetHasVoice, liveLang } from "./langs.ts";
import {
  audioAppend,
  buildSessionUpdate,
  genOf,
  parseServerEvent,
  SESSION_FINISH,
} from "./qwen-protocol.ts";
import { mulawToPcm16 } from "./mulaw.ts";
import { aliErrorText } from "./ali-error.ts";
import { createHash } from "node:crypto";

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
  open(args: {
    userId: string;
    ticketId: string;
    hold: number;
    seconds: number;
    model: string;
  }): Promise<{ ok: true } | { ok: false; reason: "het-tien" | "qua-han-muc" | "loi" }>;
  /** Trừ vào phiếu, trả số thực trừ (không vượt quá tiền đang giữ). */
  charge(args: { userId: string; ticketId: string; cost: number; base: number }): Promise<number>;
  /** Nhả phần giữ thừa. */
  close(args: { userId: string; ticketId: string; failed: boolean }): Promise<void>;
  /**
   * DEEP-003: ghi chi phí phải trả nhà cung cấp theo usage THẬT của từng lượt (giá gốc, đồng), độc lập với số Token
   * thu được của khách. Chi phí đã được lưu bền trước khi trả về; lỗi lưu quan sát phải dừng phiên để đối soát.
   */
  spend?(args: {
    userId: string;
    model: string;
    base: number;
    id?: string;
  }): Promise<void | { duplicate: boolean }>;
};

type LiveBridgeDeps = {
  secret: string;
  /** Địa chỉ WebSocket và key của Alibaba. Key không bao giờ rời cầu nối. */
  upstream(model: string): Promise<{ url: string; key: string } | null>;
  billing: LiveBilling;
  /** Cross-instance admission. Absence is retained for fixtures and embedded integrations. */
  admit?: (input: {
    userId: string;
    model: string;
  }) => Promise<((end?: "done" | "unknown") => Promise<void>) | null>;
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
/** Hàng chờ gửi Alibaba tối đa (byte JSON base64). Quá thì bỏ khung mới (kiểm toán DEEP-008). */
const UPSTREAM_BACKLOG_BYTES = 1024 * 1024;
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

export function attachLiveBridge(
  server: Server,
  deps: LiveBridgeDeps,
  path = "/live",
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? "/", "http://bridge");
    if (url.pathname !== path) return;
    if (wss.clients.size >= 300) {
      socket.end("HTTP/1.1 429 Too Many Requests\r\nRetry-After: 2\r\nConnection: close\r\n\r\n");
      return;
    }
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

  // DEEP-006: khách có thể rời trong lúc cầu nối còn đọc giá / giữ tiền (trước khi gắn client.on("close") bên dưới).
  let gone = client.readyState !== WebSocket.OPEN;
  client.once("close", () => {
    gone = true;
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

  if (gone) return;
  const releaseAdmission = await deps.admit?.({ userId: ticket.uid, model: ticket.model });
  if (deps.admit && !releaseAdmission)
    return fail(4429, "Hệ thống đang bận. Vui lòng thử lại sau ít giây.");
  if (gone) {
    await releaseAdmission?.();
    return;
  }
  let admissionManaged = false;
  client.once("close", () => {
    if (!admissionManaged)
      void releaseAdmission?.().catch((error) => log(`nhả chỗ phiên lỗi: ${String(error)}`));
  });

  const meter = new LiveMeter(holdUnits, blockSeconds);
  const tickets: string[] = [];
  let seq = 0;
  let opening: Promise<void> | null = null;

  const openBlock = async (): Promise<boolean> => {
    seq += 1;
    const ticketId = `${ticket.sid}-${seq}`;
    const result = await deps.billing.open({
      userId: ticket.uid,
      ticketId,
      hold: holdUnits,
      seconds: blockSeconds,
      model: ticket.model,
    });
    if (!result.ok) {
      meter.denied = true;
      return false;
    }
    tickets.push(ticketId);
    meter.grant(holdUnits);
    return true;
  };
  const topUp = () => {
    // DEEP-005: phiên đã đóng thì không xin giữ thêm (phiếu mới sẽ không ai nhả).
    if (closed || opening || !meter.wantsMore()) return;
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
    await releaseAdmission?.();
    return fail(
      4402,
      deps.toGiay
        ? "Token dịch chưa đủ. Hãy mua thêm gói."
        : "Số dư chưa đủ hoặc đã quá hạn mức hôm nay. Hãy nạp thêm.",
    );
  }

  admissionManaged = true;
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
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let backlogNoted = false;
  /** DEEP-001: các lần trừ tiền đang chạy; đóng phiếu phải chờ hết. */
  const charging = new Set<Promise<unknown>>();
  let usageSequence = 0;
  let reconciliationNeeded = false;
  let remoteFinished = false;
  const maxReconnects = deps.maxReconnects ?? 3;
  const sessionUpdate = JSON.stringify(
    buildSessionUpdate({
      model: ticket.model,
      target: ticket.target,
      source: ticket.source || undefined,
      audio,
      ...(ticket.words ? { hotwords: ticket.words } : {}),
      ...(deps.silenceMs ? { silenceMs: deps.silenceMs } : {}),
      ...(deps.vadThreshold ? { vadThreshold: deps.vadThreshold } : {}),
    }),
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
    log(
      `phiên đóng: ${ticket!.model} nối-lại=${reconnects} ngủ-dậy=${wakeUps} lỗi=${failed ? "có" : "không"}`,
    );
    if (drainTimer) clearTimeout(drainTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try {
      const ws = upstream;
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        const didClose = await new Promise<boolean>((resolve) => {
          const done = () => {
            clearTimeout(timer);
            ws.off("close", done);
            resolve(true);
          };
          const timer = setTimeout(() => {
            ws.off("close", done);
            resolve(false);
          }, 2000);
          ws.once("close", done);
          ws.close();
        });
        if (!didClose) {
          reconciliationNeeded ||= !remoteFinished;
          ws.terminate();
        }
      }
    } catch {
      reconciliationNeeded ||= !remoteFinished;
    }
    // DEEP-001, DEEP-005: chờ lần giữ thêm và các lần trừ tiền đang chạy xong rồi mới nhả phiếu,
    // để không trừ vào phiếu đã đóng và không bỏ sót phiếu vừa mở.
    if (opening) await opening.catch(() => undefined);
    while (charging.size) await Promise.allSettled([...charging]);
    for (const id of tickets) {
      try {
        await deps.billing.close({ userId: ticket!.uid, ticketId: id, failed });
      } catch (error) {
        log(`nhả phiếu ${id} lỗi: ${String(error)}`);
      }
    }
    try {
      await releaseAdmission?.(reconciliationNeeded ? "unknown" : "done");
    } catch (error) {
      log(`nhả chỗ phiên lỗi, cần kiểm tra lease: ${String(error)}`);
    }
    if (client.readyState === WebSocket.OPEN) client.close(1000, "done");
  }

  const handleUpstream = async (raw: RawData, counter: { latest: LiveUsage }) => {
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
        if (event.uncertain) {
          reconciliationNeeded = true;
          log("usage nhà cung cấp thiếu hoặc không hợp lệ; cần đối soát");
          send(client, {
            type: "error",
            message:
              "Chưa xác minh được mức sử dụng của phiên. Phần đã nhận vẫn còn; cần đối soát trước khi chạy tiếp.",
          });
          stop("can-doi-soat");
          continue;
        }
        const delta = cumulativeUsageDelta(counter.latest, event.usage);
        counter.latest = delta.next;
        const usage = delta.usage;
        const priced = liveCost(book, ticket.model, usage);
        let taken = 0;
        if (priced && priced.base > 0) {
          const amount = deps.toGiay ? deps.toGiay(priced.base) : priced.cost;
          // Trừ vào phiếu mới nhất trước; phần tràn sang phiếu cũ hơn nếu phiếu mới đã cạn.
          let left = amount ?? 0;
          const run = (async () => {
            const usageId = `live:${ticket.sid}:${createHash("sha256")
              .update(event.id || String(++usageSequence))
              .digest("hex")}`;
            const observation = await deps.billing.spend?.({
              userId: ticket.uid,
              model: ticket.model,
              base: liveSupplierCost(book, ticket.model, usage) ?? priced.base,
              id: usageId,
            });
            if (observation?.duplicate) return true;
            for (let i = tickets.length - 1; i >= 0 && left > 0; i -= 1) {
              const part = await deps.billing.charge({
                userId: ticket.uid,
                ticketId: tickets[i],
                cost: left,
                base: i === tickets.length - 1 ? priced.base : 0,
              });
              taken += part;
              left -= part;
            }
            return false;
          })();
          charging.add(run);
          try {
            if (await run) continue;
          } catch (error) {
            reconciliationNeeded = true;
            log(`ghi sổ usage lỗi, cần đối soát: ${String(error)}`);
            send(client, {
              type: "error",
              message: "Dịch trực tiếp tạm dừng để đối soát chi phí. Phần đã nhận vẫn còn.",
            });
            stop("can-doi-soat");
            continue;
          } finally {
            charging.delete(run);
          }
        }
        meter.settle(taken, usage.audioIn);
        topUp();
        report();
        continue;
      }
      if (event.kind === "finished") {
        remoteFinished = true;
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
    reconnectTimer = null;
    // DEEP-004: phiên đã đóng hoặc đang dừng thì không mở kết nối Alibaba mới.
    if (closed || finishing) return;
    const ws = deps.connect
      ? deps.connect(route.url, route.key)
      : new WebSocket(route.url, { headers: { Authorization: `Bearer ${route.key}` } });
    // Each new upstream WebSocket has its own cumulative usage counter.
    const counter = { latest: { audioIn: 0, textIn: 0, imageIn: 0, textOut: 0, audioOut: 0 } };
    upstream = ws;
    ws.on("open", () => ws.send(sessionUpdate));
    ws.on(
      "message",
      (raw) =>
        void handleUpstream(raw, counter).catch((error) =>
          log(`xử lý tin Alibaba lỗi: ${String(error)}`),
        ),
    );
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
        reconnectTimer = setTimeout(connectUpstream, 300 * reconnects);
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
    // DEEP-002: phần giữ đã hết mà lần xin giữ thêm chưa về: bỏ khung này (không gửi tiếng chưa có tiền giữ).
    if (meter.exposure() <= 0) {
      topUp();
      return;
    }
    // DEEP-008: mạng tới Alibaba nghẽn (hàng chờ gửi quá ~1 MB, khoảng 20 giây tiếng) thì bỏ khung, không dồn bộ nhớ.
    if (upstream.bufferedAmount > UPSTREAM_BACKLOG_BYTES) {
      if (!backlogNoted) log("hàng chờ gửi Alibaba quá lớn, bỏ bớt khung tiếng");
      backlogNoted = true;
      return;
    }
    backlogNoted = false;
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
  // DEEP-006: khách rời trước khi các hàm trên được gắn thì đóng phiên ngay, nhả phiếu vừa giữ.
  if (gone || client.readyState !== WebSocket.OPEN) stop("khach-roi");
}
