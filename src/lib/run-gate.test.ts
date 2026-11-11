import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import type { PriceBook } from "./run-bill.ts";
import { asrCost, chatCost, estimateHold } from "./run-bill.ts";
import { asrSecondsCeiling, chargeWith, chatCeiling, readRequest, wavSeconds } from "./run-gate.ts";
import { openTicketWith } from "./run-ticket.ts";
import type { GroqLiveRow } from "./sub/groq-board.ts";

let sql: Sql;
const row = (over: Partial<GroqLiveRow>): GroqLiveRow => ({
  id: "x", speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null,
  unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...over,
});
const book: PriceBook = {
  rate: 25_000,
  desk: { markup: 100, custom: {} },
  rows: [
    row({ id: "asr", usdPerHour: 0.04 }),
    row({ id: "chat", usdIn: 0.075, usdOut: 0.3 }),
    row({ id: "tts", usdPerMillionChars: 22 }),
  ],
};

before(async () => {
  const db = new PGlite();
  const dir = new URL("../../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(file, dir), "utf8"));
  sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return (await db.query(text, values)).rows;
  }) as unknown as Sql;
});

const TID = "a".repeat(24);
const bal = async () => Number((await sql<{ balance: number }>`select balance from room_accounts where user_id = 'g'`)[0].balance);
const t = async (id: string) => (await sql<{ held: number; charged: number; status: string }>`select held, charged, status from run_tickets where id = ${id}`)[0];
const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const call = (over: Partial<Parameters<typeof chargeWith>[0]>) =>
  chargeWith({ sql, book, path: "/chat/completions", model: "chat", chars: 0, userId: "g", ticketId: TID, body: new ArrayBuffer(300), cap: 0, send: json({}), ...over });

function pcmWav(seconds: number, rate = 16000, bits = 16, channels = 1) {
  const dataBytes = rate * channels * (bits / 8) * seconds;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i);
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * (bits / 8), true);
  view.setUint16(32, channels * (bits / 8), true);
  view.setUint16(34, bits, true);
  write(36, "data");
  view.setUint32(40, dataBytes, true);
  return bytes;
}

describe("trần của từng đoạn", () => {
  it("WAV PCM lấy đúng giây; file khác dùng bitrate sàn", () => {
    const wav = pcmWav(85);
    assert.equal(wavSeconds(wav), 85);
    const floor = (wav.length * 8) / 6_000;
    assert.ok(floor > 3600);
    assert.ok(asrCost(book, "asr", 85)! <= 2000);
    assert.ok(asrCost(book, "asr", floor)! > 2000);
    const opus = new Uint8Array((20_000 * 60) / 8);
    assert.equal(asrSecondsCeiling(opus), 200);
    const chunk = asrCost(book, "asr", 200)!;
    const hold = estimateHold(book, "asr", "chat", 600)!;
    assert.ok(chunk <= hold);
    assert.ok(asrCost(book, "asr", 60)! * 10 <= hold);
  });

  it("dịch: đầu vào là cả body, câu trả lời không vượt mức đã chặn", () => {
    const body = new TextEncoder().encode(JSON.stringify({ max_completion_tokens: 200, x: "a".repeat(30) })).buffer as ArrayBuffer;
    const cap = chatCeiling(body);
    assert.equal(cap.completion, 200);
    assert.equal(cap.prompt, Math.ceil(body.byteLength / 3));
    const open = chatCeiling(new ArrayBuffer(9));
    assert.equal(open.prompt, 3);
    assert.equal(open.completion, 8192);
  });
});

describe("cổng tính tiền", () => {
  beforeEach(async () => {
    await sql`delete from run_tickets where user_id = 'g'`;
    await sql`delete from room_ledger where user_id = 'g'`;
    await sql`delete from room_accounts where user_id = 'g'`;
    await sql`insert into room_accounts (user_id, balance) values ('g', 10000)`;
    await openTicketWith(sql, { id: TID, userId: "g", fileName: "f", seconds: 600, rate: 1, hold: 2000, cap: 0, dayStartIso: "2020-01-01T00:00:00Z" });
  });

  it("dịch thành công: trừ theo token thật, không quá trần của body", async () => {
    const body = new TextEncoder().encode(JSON.stringify({ model: "chat", max_completion_tokens: 200, pad: "x".repeat(9000) })).buffer as ArrayBuffer;
    const ceiling = chatCeiling(body);
    const prompt = Math.min(3000, ceiling.prompt);
    const completion = Math.min(100, ceiling.completion);
    const expectCost = chatCost(book, "chat", prompt, completion)!;
    assert.ok(expectCost > 0 && expectCost < 2000);
    const out = await call({ body, send: json({ usage: { prompt_tokens: prompt, completion_tokens: completion } }) });
    assert.equal(out.kind, "pass");
    assert.equal((await t(TID)).charged, expectCost);
    assert.equal((await t(TID)).held, 2000 - expectCost);
  });

  it("Groq trả lỗi thì không tính tiền và trả lại phần vừa giữ", async () => {
    const out = await call({ send: json({ error: { message: "boom" } }, 429) });
    assert.equal(out.kind === "pass" && out.response.status, 429);
    assert.equal((await t(TID)).charged, 0);
    assert.equal((await t(TID)).held, 2000);
    assert.equal((await t(TID)).status, "dang-giu");
  });

  it("nhà cung cấp không trả lời thì trả lại phần vừa giữ", async () => {
    await assert.rejects(() => call({ send: async () => { throw new Error("net"); } }));
    assert.equal((await t(TID)).charged, 0);
    assert.equal((await t(TID)).held, 2000);
  });

  it("nhận dạng: trừ theo duration thật, không quá trần của file", async () => {
    const bytes = new Uint8Array(60 * 750);
    const cap = asrCost(book, "asr", asrSecondsCeiling(bytes))!;
    await call({ path: "/audio/transcriptions", model: "asr", body: bytes.buffer, send: json({ duration: 3600, segments: [] }) });
    assert.equal((await t(TID)).charged, cap);
    assert.ok(cap < 2000);
    assert.equal((await t(TID)).held, 2000 - cap);
  });

  it("WAV dài vẫn gọi được vì lấy đúng giây, file cùng cỡ thì không gọi", async () => {
    const wav = pcmWav(85);
    let called = 0;
    const out = await call({
      path: "/audio/transcriptions",
      model: "asr",
      body: wav.buffer,
      send: async () => {
        called += 1;
        return json({ duration: 85 })();
      },
    });
    assert.equal(out.kind, "pass");
    assert.equal(called, 1);
    assert.equal((await t(TID)).charged, asrCost(book, "asr", 85));
    const raw = "e".repeat(24);
    await openTicketWith(sql, { id: raw, userId: "g", fileName: "f", seconds: 600, rate: 1, hold: 2000, cap: 0, dayStartIso: "2020-01-01T00:00:00Z" });
    const stripped = new Uint8Array(wav.byteLength);
    stripped.set(wav);
    stripped[0] = 0;
    let rawCalled = 0;
    const again = await call({
      ticketId: raw,
      path: "/audio/transcriptions",
      model: "asr",
      body: stripped.buffer,
      send: async () => {
        rawCalled += 1;
        return new Response("{}");
      },
    });
    assert.equal(again.kind, "reject");
    assert.equal(rawCalled, 0);
    assert.equal((await t(raw)).charged, 0);
    assert.equal((await t(raw)).held, 2000);
  });

  it("file nhận dạng lớn hơn phần giữ thì không gọi", async () => {
    let called = 0;
    const out = await call({
      path: "/audio/transcriptions",
      model: "asr",
      body: new ArrayBuffer(3_000_000),
      send: async () => {
        called += 1;
        return new Response("{}");
      },
    });
    assert.equal(out.kind, "reject");
    assert.equal(out.kind === "reject" && out.status, 402);
    assert.equal(called, 0);
    assert.equal((await t(TID)).charged, 0);
    assert.equal((await t(TID)).held, 2000);
  });

  it("multipart tính theo file, không tính phần đệm", async () => {
    const file = new Uint8Array(1000);
    const form = new FormData();
    form.append("model", "asr");
    form.append("file", new Blob([file]), "a.webm");
    form.append("junk", "x".repeat(3_000_000));
    const packed = new Response(form);
    const body = await packed.arrayBuffer();
    const contentType = packed.headers.get("content-type");
    let called = 0;
    const out = await call({
      path: "/audio/transcriptions",
      model: "asr",
      body,
      contentType,
      send: async () => {
        called += 1;
        return json({ duration: 10 })();
      },
    });
    assert.equal(out.kind, "pass");
    assert.equal(called, 1);
    assert.equal((await t(TID)).charged, asrCost(book, "asr", 10));
  });

  it("thiếu phiếu, phiếu của người khác, phiếu hết giữ đều bị từ chối trước khi gọi", async () => {
    let called = 0;
    const send = async () => {
      called += 1;
      return new Response("{}");
    };
    for (const ticketId of ["", "b".repeat(24)]) {
      const out = await call({ ticketId, send });
      assert.equal(out.kind, "reject");
      assert.equal(out.kind === "reject" && out.status, 402);
    }
    const body = new ArrayBuffer(300);
    const tokens = chatCeiling(body);
    const ceiling = chatCost(book, "chat", tokens.prompt, tokens.completion)!;
    const id = "d".repeat(24);
    await openTicketWith(sql, { id, userId: "g", fileName: "f", seconds: 30, rate: 1, hold: ceiling, cap: 0, dayStartIso: "2020-01-01T00:00:00Z" });
    await call({ ticketId: id, body, send: json({ usage: { prompt_tokens: tokens.prompt, completion_tokens: tokens.completion } }) });
    assert.equal((await t(id)).status, "dung-tien");
    assert.equal((await t(id)).held, 0);
    assert.equal((await call({ ticketId: id, body, send })).kind, "reject");
    assert.equal(called, 0);
  });

  it("hai yêu cầu cùng lúc không tiêu quá một trần", async () => {
    const body = new ArrayBuffer(300);
    const tokens = chatCeiling(body);
    const ceiling = chatCost(book, "chat", tokens.prompt, tokens.completion)!;
    const id = "f".repeat(24);
    await openTicketWith(sql, { id, userId: "g", fileName: "f", seconds: 30, rate: 1, hold: ceiling, cap: 0, dayStartIso: "2020-01-01T00:00:00Z" });
    let called = 0;
    const send = async () => {
      called += 1;
      return json({ usage: { prompt_tokens: tokens.prompt, completion_tokens: tokens.completion } })();
    };
    const [a, b] = await Promise.all([call({ ticketId: id, body, send }), call({ ticketId: id, body, send })]);
    assert.equal(called, 1);
    assert.equal([a.kind, b.kind].filter((kind) => kind === "pass").length, 1);
    assert.equal((await t(id)).charged, ceiling);
    assert.equal((await t(id)).held, 0);
  });

  it("phiếu dịch lại từ chối nhận dạng trước khi gọi, vẫn cho dịch", async () => {
    const redo = "c".repeat(24);
    await openTicketWith(sql, { id: redo, userId: "g", fileName: "f", seconds: 30, rate: 1, hold: 2000, cap: 0, dayStartIso: "2020-01-01T00:00:00Z", scope: "translate" });
    let called = 0;
    const send = async () => {
      called += 1;
      return new Response("{}");
    };
    const blocked = await call({ ticketId: redo, path: "/audio/transcriptions", model: "asr", send });
    assert.equal(blocked.kind, "reject");
    assert.equal(blocked.kind === "reject" && blocked.status, 402);
    assert.equal(called, 0);
    assert.equal((await t(redo)).charged, 0);
    const chat = await call({ ticketId: redo, send: json({ usage: { prompt_tokens: 1000, completion_tokens: 100 } }) });
    assert.equal(chat.kind, "pass");
    assert.ok((await t(redo)).charged > 0);
  });

  it("model chưa có giá bị từ chối, không gọi Groq", async () => {
    let called = false;
    const out = await call({ model: "la", send: async () => { called = true; return new Response("{}"); } });
    assert.equal(out.kind === "reject" && out.status, 422);
    assert.equal(called, false);
  });

  it("đọc thuyết minh: trừ trước, hoàn khi Groq lỗi", async () => {
    const before = await bal();
    const ok = await call({ path: "/audio/speech", model: "tts", chars: 1000, send: async () => new Response("wav") });
    assert.equal(ok.kind, "pass");
    assert.equal(before - (await bal()), 1100); // 22×25.000×2 = 1.100.000 đ/triệu ký tự × 1.000
    const mid = await bal();
    await call({ path: "/audio/speech", model: "tts", chars: 1000, send: json({}, 500) });
    assert.equal(await bal(), mid);
  });
});

describe("đọc yêu cầu", () => {
  const enc = (o: unknown) => new TextEncoder().encode(JSON.stringify(o)).buffer as ArrayBuffer;
  it("chat: lấy model, chặn stream và token trả lời quá lớn", async () => {
    assert.deepEqual(await readRequest("/chat/completions", "application/json", enc({ model: "m" })), { model: "m", chars: 0, problem: null });
    assert.ok((await readRequest("/chat/completions", "application/json", enc({ model: "m", stream: true })))?.problem);
    assert.ok((await readRequest("/chat/completions", "application/json", enc({ model: "m", max_completion_tokens: 999999 })))?.problem);
  });
  it("speech: đếm ký tự; nhận dạng: lấy model từ form", async () => {
    assert.equal((await readRequest("/audio/speech", "application/json", enc({ model: "m", input: "xin chào" })))?.chars, 8);
    const form = new FormData();
    form.append("model", "asr");
    form.append("file", new Blob(["x"]), "a.wav");
    const res = new Response(form);
    const ct = res.headers.get("content-type");
    assert.equal((await readRequest("/audio/transcriptions", ct, await res.arrayBuffer()))?.model, "asr");
  });
  it("body hỏng thì null", async () => {
    assert.equal(await readRequest("/chat/completions", "application/json", new TextEncoder().encode("{").buffer as ArrayBuffer), null);
  });
});
