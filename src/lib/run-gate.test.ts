import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { before, beforeEach, describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Sql } from "./db.ts";
import type { PriceBook } from "./run-bill.ts";
import { chargeWith, readRequest } from "./run-gate.ts";
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

describe("cổng tính tiền", () => {
  beforeEach(async () => {
    await sql`delete from run_tickets where user_id = 'g'`;
    await sql`delete from room_ledger where user_id = 'g'`;
    await sql`delete from room_accounts where user_id = 'g'`;
    await sql`insert into room_accounts (user_id, balance) values ('g', 10000)`;
    await openTicketWith(sql, { id: TID, userId: "g", fileName: "f", seconds: 600, rate: 1, hold: 2000, cap: 0, dayStartIso: "2020-01-01T00:00:00Z" });
  });

  it("dịch thành công: trừ theo token thật trong usage", async () => {
    // vào 1.875×2=3.750 đ/triệu, ra 7.500×2=15.000 đ/triệu; 100.000 vào + 100.000 ra = 375 + 1.500
    const out = await call({ send: json({ usage: { prompt_tokens: 100_000, completion_tokens: 100_000 } }) });
    assert.equal(out.kind, "pass");
    assert.equal((await t(TID)).charged, 1875);
    assert.equal((await t(TID)).held, 125);
  });

  it("Groq trả lỗi thì không tính tiền", async () => {
    const out = await call({ send: json({ error: { message: "boom" } }, 429) });
    assert.equal(out.kind === "pass" && out.response.status, 429);
    assert.equal((await t(TID)).charged, 0);
  });

  it("nhận dạng: trừ theo duration thật, tối thiểu 10 giây", async () => {
    await call({ path: "/audio/transcriptions", model: "asr", send: json({ duration: 3600, segments: [] }) });
    assert.equal((await t(TID)).charged, 2000); // 1.000 đ/giờ × (1+100%) = 2.000
  });

  it("thiếu phiếu, phiếu của người khác, phiếu hết giữ đều bị từ chối trước khi gọi Groq", async () => {
    let called = 0;
    const send = async () => { called++; return new Response("{}"); };
    for (const ticketId of ["", "b".repeat(24)]) {
      const out = await call({ ticketId, send });
      assert.equal(out.kind, "reject");
      assert.equal(out.kind === "reject" && out.status, 402);
    }
    await call({ send: json({ usage: { prompt_tokens: 10_000_000, completion_tokens: 0 } }) });
    assert.equal((await t(TID)).status, "dung-tien");
    assert.equal((await call({ send })).kind, "reject");
    assert.equal(called, 0);
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
