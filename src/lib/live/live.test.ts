import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, it } from "node:test";
import WebSocket, { WebSocketServer } from "ws";
import { LIVE_LANGS, targetHasVoice } from "./langs.ts";
import { liveCost, liveHold, livePerMinute, readUsage, type LiveBook } from "./live-cost.ts";
import { LiveMeter } from "./live-meter.ts";
import { LIVE_FALLBACK_ROWS, LIVE_MODEL_35, LIVE_MODEL_38, parseLivePrice, pullLiveBoard, saneLivePrice } from "./live-price.ts";
import { attachLiveBridge, type LiveBilling } from "./live-bridge.ts";
import { LiveTranscript } from "./live-transcript.ts";
import { signLiveTicket, verifyLiveTicket } from "./live-ticket.ts";
import { buildSessionUpdate, parseServerEvent } from "./qwen-protocol.ts";

const book: LiveBook = { rate: 26000, markup: 0, rows: LIVE_FALLBACK_ROWS };

describe("ngôn ngữ", () => {
  it("đủ 60, trong đó 29 có tiếng", () => {
    assert.equal(LIVE_LANGS.length, 60);
    assert.equal(LIVE_LANGS.filter((l) => l.audio).length, 29);
    assert.equal(new Set(LIVE_LANGS.map((l) => l.code)).size, 60);
    assert.equal(targetHasVoice("vi"), true);
    assert.equal(targetHasVoice("uk"), false);
  });
});

describe("giá", () => {
  const md = `Scope: International\n| Billing Item | Price (USD) | Unit |\n|---|---|---|\nAudio input | 7.5 | Per million tokens |\nImage input | 0.55 | Per million tokens |\nText output | 20 | Per million tokens |\nAudio output | 30 | Per million tokens |\nChina (Beijing)\n| Billing Item | Price (USD) | Unit |\nAudio input | 5.653 | Per million tokens |\nImage input | 0.466 |\nText output | 14.133 |\nAudio output | 22.613 |`;
  const html = `<h3>International</h3><table><tr><td>Audio input</td><td>7.5</td><td>Per million tokens</td></tr><tr><td>Image input</td><td>0.55</td></tr><tr><td>Text output</td><td>20</td></tr><tr><td>Audio output</td><td>30</td></tr></table><h3>China (Beijing)</h3><table><tr><td>Audio input</td><td>5.653</td></tr></table>`;

  it("đọc giá quốc tế từ markdown và HTML, bỏ bảng Beijing", () => {
    for (const page of [md, html]) {
      const row = parseLivePrice(LIVE_MODEL_38, page);
      assert.deepEqual(row, { id: LIVE_MODEL_38, usdAudioIn: 7.5, usdImageIn: 0.55, usdTextOut: 20, usdAudioOut: 30 });
    }
  });
  it("thiếu một giá thì không đoán", () => {
    assert.equal(parseLivePrice(LIVE_MODEL_38, md.replace("Audio output | 30", "Audio output | x")), null);
    assert.equal(parseLivePrice(LIVE_MODEL_38, "không có bảng"), null);
  });
  it("giá lệch quá xa bị loại", () => {
    const base = LIVE_FALLBACK_ROWS[0];
    assert.equal(saneLivePrice({ ...base, usdAudioIn: 750 }, base), false);
    assert.equal(saneLivePrice({ ...base, usdAudioIn: 9 }, base), true);
  });
  it("kéo giá hỏng thì giữ giá đã lưu và báo model lỗi", async () => {
    const stored = { at: 1, rows: [{ ...LIVE_FALLBACK_ROWS[0], usdAudioIn: 8 }, LIVE_FALLBACK_ROWS[1]] };
    const bad = await pullLiveBoard(async () => "trang hỏng", stored, 2);
    assert.deepEqual(bad.failed, [LIVE_MODEL_38]);
    assert.equal(bad.board.rows[0].usdAudioIn, 8);
    const good = await pullLiveBoard(async () => html.replace("7.5", "8.2"), null, 3);
    assert.deepEqual(good.failed, []);
    assert.equal(good.board.rows[0].usdAudioIn, 8.2);
    assert.equal(good.board.rows[1].id, LIVE_MODEL_35);
  });
});

describe("tiền", () => {
  it("một phút có tiếng khoảng 0,032 USD (vào + chữ ra + tiếng ra)", () => {
    const vnd = livePerMinute(book, LIVE_MODEL_38, true)!;
    assert.ok(vnd >= 800 && vnd <= 850, String(vnd)); // 0,03165 USD × 26.000
  });
  it("chỉ chữ rẻ hơn có tiếng", () => {
    assert.ok(livePerMinute(book, LIVE_MODEL_38, false)! < livePerMinute(book, LIVE_MODEL_38, true)!);
  });
  it("cộng chênh và tách giá gốc", () => {
    const usage = { audioIn: 1_000_000, textIn: 0, imageIn: 0, textOut: 0, audioOut: 0 };
    const q = liveCost({ ...book, markup: 50 }, LIVE_MODEL_38, usage)!;
    assert.equal(q.base, 7.5 * 26000);
    assert.equal(q.cost, 7.5 * 26000 * 1.5);
  });
  it("đọc usage của response.done, thiếu thì 0", () => {
    assert.deepEqual(readUsage({ input_tokens_details: { audio_tokens: 27, text_tokens: 20 }, output_tokens_details: { text_tokens: 2, audio_tokens: 7 } }), { audioIn: 27, textIn: 20, imageIn: 0, textOut: 2, audioOut: 7 });
    assert.deepEqual(readUsage(undefined), { audioIn: 0, textIn: 0, imageIn: 0, textOut: 0, audioOut: 0 });
  });
  it("model chưa có giá thì null", () => {
    assert.equal(liveHold(book, "model-la", true, 120), null);
  });
});

describe("sổ giữ tiền", () => {
  it("xin thêm khi còn dưới 40%, dừng nhẹ khi hết mà không xin được", () => {
    const meter = new LiveMeter(120, 120); // 1 đồng mỗi giây
    meter.grant(120);
    assert.equal(meter.wantsMore(), false);
    meter.audio(80);
    assert.equal(meter.wantsMore(), true);
    meter.denied = true;
    assert.equal(meter.mustStop(), false);
    assert.equal(meter.low(), true);
    meter.audio(40);
    assert.equal(meter.mustStop(), true);
  });
  it("token thật thay cho ước tính", () => {
    const meter = new LiveMeter(120, 120);
    meter.grant(120);
    meter.audio(60);
    meter.settle(40, 7 * 60);
    assert.equal(meter.pendingSeconds, 0);
    assert.equal(meter.heldLeft, 80);
  });
});

describe("giao thức Qwen", () => {
  it("3.8 dùng output_modalities, 3.5 dùng modalities", () => {
    const a = buildSessionUpdate({ model: LIVE_MODEL_38, target: "vi", audio: false })!;
    assert.deepEqual((a.session as Record<string, unknown>).output_modalities, ["text"]);
    const b = buildSessionUpdate({ model: LIVE_MODEL_35, target: "vi", source: "en", audio: true })!;
    const s = b.session as Record<string, unknown>;
    assert.deepEqual(s.modalities, ["text", "audio"]);
    assert.deepEqual(s.input_audio_transcription, { model: "qwen3-asr-flash-realtime", language: "en" });
    assert.equal(buildSessionUpdate({ model: "x", target: "vi", audio: true }), null);
  });
  it("ghép chữ gốc và bản dịch dù đến trước hay sau", () => {
    const t = new LiveTranscript();
    const feed = (raw: unknown, at: number) => parseServerEvent(raw).forEach((e) => t.apply(e, at));
    feed({ type: "response.text.text", item_id: "tr1", text: "Xin ", stash: "chào" }, 1000);
    feed({ type: "conversation.item.input_audio_transcription.delta", item_id: "src1", delta: "Hello" }, 1100);
    feed({ type: "conversation.item.created", previous_item_id: "src1", item: { id: "tr1", role: "assistant" } }, 1200);
    feed({ type: "input_audio_buffer.speech_started", item_id: "src1", speaker_id: 2 }, 1300);
    feed({ type: "response.text.done", item_id: "tr1", text: "Xin chào" }, 1500);
    const lines = t.list();
    assert.equal(lines.length, 1);
    assert.equal(lines[0].source, "Hello");
    assert.equal(lines[0].translation, "Xin chào");
    assert.equal(lines[0].translationStash, "");
    assert.equal(lines[0].speaker, "2");
    assert.equal(lines[0].final, true);
    assert.equal(t.cues()[0].translation, "Xin chào");
  });
});

describe("vé", () => {
  const base = { uid: "u1", sid: "s1", model: LIVE_MODEL_38, target: "vi", source: "", audio: true, exp: 10_000 };
  it("đúng chữ ký còn hạn thì qua", () => {
    const token = signLiveTicket("k", base);
    assert.equal(verifyLiveTicket("k", token, 5000)?.uid, "u1");
  });
  it("sai khóa, hết hạn hoặc bị sửa thì không qua", () => {
    const token = signLiveTicket("k", base);
    assert.equal(verifyLiveTicket("khac", token, 5000), null);
    assert.equal(verifyLiveTicket("k", token, 10_001), null);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...base, uid: "u2" })).toString("base64url");
    assert.equal(verifyLiveTicket("k", `${forged}.${sig}`, 5000), null);
    assert.equal(verifyLiveTicket("k", body, 5000), null);
  });
});

function fakeBilling(stock: number) {
  const log = { opened: [] as string[], charged: 0, closed: [] as string[] };
  let money = stock;
  const held = new Map<string, number>();
  const billing: LiveBilling = {
    book: async () => book,
    open: async ({ ticketId, hold }) => {
      if (money < hold) return { ok: false, reason: "het-tien" };
      money -= hold;
      held.set(ticketId, hold);
      log.opened.push(ticketId);
      return { ok: true };
    },
    charge: async ({ ticketId, cost }) => {
      const h = held.get(ticketId) ?? 0;
      const taken = Math.min(h, cost);
      held.set(ticketId, h - taken);
      log.charged += taken;
      return taken;
    },
    close: async ({ ticketId }) => {
      money += held.get(ticketId) ?? 0;
      held.set(ticketId, 0);
      log.closed.push(ticketId);
    },
  };
  return { billing, log, money: () => money };
}

/** Alibaba giả: nhận session.update, trả session.updated; thấy âm thanh thì trả một câu dịch và usage; session.finish thì trả finished. */
function fakeAlibaba() {
  const wss = new WebSocketServer({ port: 0 });
  const seen = { auth: "", update: false, chunks: 0 };
  wss.on("connection", (ws, req) => {
    seen.auth = String(req.headers.authorization ?? "");
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString()) as { type: string };
      if (msg.type === "session.update") {
        seen.update = true;
        ws.send(JSON.stringify({ type: "session.updated" }));
      } else if (msg.type === "input_audio_buffer.append") {
        seen.chunks += 1;
        if (seen.chunks === 1) {
          ws.send(JSON.stringify({ type: "conversation.item.input_audio_transcription.completed", item_id: "s1", transcript: "Hello" }));
          ws.send(JSON.stringify({ type: "response.audio_transcript.delta", item_id: "t1", delta: "Xin chào" }));
          ws.send(JSON.stringify({ type: "conversation.item.created", previous_item_id: "s1", item: { id: "t1", role: "assistant" } }));
          ws.send(JSON.stringify({ type: "response.audio.delta", delta: Buffer.from([1, 2, 3, 4]).toString("base64") }));
          ws.send(JSON.stringify({ type: "response.done", response: { status: "completed", usage: { input_tokens_details: { audio_tokens: 14 }, output_tokens_details: { text_tokens: 5, audio_tokens: 25 } } } }));
        }
      } else if (msg.type === "session.finish") {
        ws.send(JSON.stringify({ type: "session.finished" }));
      }
    });
  });
  const port = (wss.address() as { port: number }).port;
  return { wss, seen, url: `ws://127.0.0.1:${port}/realtime` };
}

describe("cầu nối (Alibaba giả)", () => {
  async function run(stock: number, ticketOver: Partial<Parameters<typeof signLiveTicket>[1]> = {}) {
    const ali = fakeAlibaba();
    const bill = fakeBilling(stock);
    const server = createServer();
    attachLiveBridge(server, { secret: "k", upstream: async () => ({ url: ali.url, key: "SECRET-KEY" }), billing: bill.billing, blockSeconds: 120, drainMs: 1500 });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as { port: number }).port;
    const token = signLiveTicket("k", { uid: "u1", sid: "sess", model: LIVE_MODEL_38, target: "vi", source: "", audio: true, exp: Date.now() + 60_000, ...ticketOver });
    const client = new WebSocket(`ws://127.0.0.1:${port}/live?ticket=${encodeURIComponent(token)}`);
    const msgs: Array<{ type: string; [k: string]: unknown }> = [];
    const bins: Buffer[] = [];
    client.on("message", (data, isBinary) => {
      if (isBinary) bins.push(data as Buffer);
      else msgs.push(JSON.parse(data.toString()));
    });
    const closed = new Promise<number>((r) => client.on("close", (code) => r(code)));
    const cleanup = async () => {
      server.close();
      ali.wss.close();
      client.terminate();
    };
    return { client, msgs, bins, closed, ali, bill, cleanup };
  }

  it("dịch trọn một phiên, giữ key kín, trừ tiền thật và nhả phần dư", async () => {
    const t = await run(1_000_000);
    await new Promise((r) => t.client.on("open", r));
    while (!t.msgs.some((m) => m.type === "ready")) await new Promise((r) => setTimeout(r, 20));
    t.client.send(Buffer.alloc(3200)); // 0,1 giây âm thanh
    while (!t.msgs.some((m) => m.type === "balance")) await new Promise((r) => setTimeout(r, 20));
    t.client.send(JSON.stringify({ type: "stop" }));
    const code = await t.closed;
    assert.equal(code, 1000);
    assert.equal(t.ali.seen.auth, "Bearer SECRET-KEY");
    assert.equal(t.bins.length, 1);
    assert.deepEqual([...t.bins[0]], [1, 2, 3, 4]);
    const events = t.msgs.filter((m) => m.type === "event").map((m) => m.event as { kind: string });
    assert.ok(events.some((e) => e.kind === "source"));
    assert.ok(events.some((e) => e.kind === "pair"));
    assert.ok(t.bill.log.charged > 0);
    assert.deepEqual(t.bill.log.closed, t.bill.log.opened);
    // Tiền đã trừ đúng bằng giá của usage, phần còn lại hoàn về.
    const expected = liveCost(book, LIVE_MODEL_38, { audioIn: 14, textIn: 0, imageIn: 0, textOut: 5, audioOut: 25 })!.cost;
    assert.equal(1_000_000 - t.bill.money(), expected);
    await t.cleanup();
  });

  it("vé sai bị đóng 4401, không mở kết nối Alibaba", async () => {
    const t = await run(1_000_000, { exp: Date.now() - 1 });
    assert.equal(await t.closed, 4401);
    assert.equal(t.ali.seen.update, false);
    await t.cleanup();
  });

  it("không đủ tiền giữ thì đóng 4402", async () => {
    const t = await run(10);
    assert.equal(await t.closed, 4402);
    assert.deepEqual(t.bill.log.opened, []);
    await t.cleanup();
  });
});
