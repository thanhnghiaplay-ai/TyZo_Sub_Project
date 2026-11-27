import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { pgliteSql } from "../test-sql.ts";
import type { Sql } from "../db.ts";
import type { PriceBook } from "./run-bill.ts";
import { chargeWith, readRequest } from "./run-gate.ts";
import { openTicketWith } from "./run-ticket.ts";
import type { GroqLiveRow } from "../sub/groq-board.ts";
import { buildOpusWebm, toWav } from "../sub/codec.ts";

/** WebM/Opus hợp lệ: `n` gói SILK 120 ms. */
const opusWebm = (n: number) =>
  buildOpusWebm(
    Array.from({ length: n }, (_, i) => ({ data: Uint8Array.of((3 << 3) | 1, 0), timestampUs: i * 120_000, durationUs: 120_000 })),
    null,
    48000,
    1,
  );

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
    row({ id: "chat", usdIn: 0.075, usdOut: 0.3, contextTokens: 100_000 }),
    row({ id: "whisper-large-v3-turbo", usdPerHour: 79.2 }),
    row({ id: "tts", usdPerMillionChars: 22 }),
  ],
};

before(async () => {
  sql = await pgliteSql();
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
    // vào 1.875×2=3.750 đ/triệu, ra 7.500×2=15.000 đ/triệu; 100.000 vào + 8.000 ra = 375 + 120
    const out = await call({ body: new ArrayBuffer(300_000), outCap: 8_000, send: json({ usage: { prompt_tokens: 100_000, completion_tokens: 8_000 } }) });
    assert.equal(out.kind, "pass");
    assert.equal((await t(TID)).charged, 495);
    assert.equal((await t(TID)).held, 1505);
  });

  it("Groq trả lỗi thì không tính tiền", async () => {
    const out = await call({ send: json({ error: { message: "boom" } }, 429) });
    assert.equal(out.kind === "pass" && out.response.status, 429);
    assert.equal((await t(TID)).charged, 0);
  });

  it("nhận dạng: trừ theo duration thật, tối thiểu 10 giây", async () => {
    const form = new FormData();
    // RE3-002: tệp phải dò được độ dài; 3.600 giây Opus (gói 120 ms) thay cho 7,2 MB số 0 không phải audio.
    form.set("file", opusWebm(30_000), "fixture.webm");
    const req = new Request("http://fixture.test", { method: "POST", body: form });
    await call({ path: "/audio/transcriptions", model: "asr", body: await req.arrayBuffer(), contentType: req.headers.get("content-type"), send: json({ duration: 3600, segments: [] }) });
    assert.equal((await t(TID)).charged, 2000); // 1.000 đ/giờ × (1+100%) = 2.000
  });

  it("R3-009: thiếu duration và segments thì dùng ước tính âm thanh, ghi cờ đối soát", async () => {
    const form = new FormData();
    // RE3-002: WAV PCM16 đầy đủ header (60 giây), thay cho header thiếu fmt không xác minh được.
    form.set("file", toWav(new Float32Array(16000 * 60)), "fixture.wav");
    form.set("model", "asr");
    const request = new Request("http://fixture.test", { method: "POST", body: form });
    await call({ path: "/audio/transcriptions", model: "asr", body: await request.arrayBuffer(), contentType: request.headers.get("content-type"), send: json({ text: "synthetic" }) });
    assert.equal((await t(TID)).charged, 34);
    const rows = await sql<{ status: string }>`select status from run_gate_calls where ticket_id = ${TID}`;
    assert.equal(rows[0].status, "can-doi-soat");
  });

  it("RE3-002: audio không xác minh được độ dài → 422, không giữ, không gọi nhà", async () => {
    let called = 0;
    const form = new FormData();
    form.set("file", new Blob([new Uint8Array(500_000).fill(9)]), "fixture.mp3");
    form.set("model", "asr");
    const req = new Request("http://fixture.test", { method: "POST", body: form });
    const out = await call({ path: "/audio/transcriptions", model: "asr", body: await req.arrayBuffer(), contentType: req.headers.get("content-type"), send: async () => { called++; return new Response("{}"); } });
    assert.equal(out.kind === "reject" && out.status, 422);
    assert.equal(called, 0);
    assert.equal((await t(TID)).held, 2000);
    assert.equal((await sql`select 1 from run_gate_calls where ticket_id = ${TID}`).length, 0);
  });

  it("thiếu phiếu, phiếu của người khác, phiếu hết giữ đều bị từ chối trước khi gọi Groq", async () => {
    let called = 0;
    const send = async () => { called++; return new Response("{}"); };
    for (const ticketId of ["", "b".repeat(24)]) {
      const out = await call({ ticketId, send });
      assert.equal(out.kind, "reject");
      assert.equal(out.kind === "reject" && out.status, 402);
    }
    await sql`update run_tickets set held = 0, status = 'dung-tien' where id = ${TID}`;
    assert.equal((await t(TID)).status, "dung-tien");
    assert.equal((await call({ send })).kind, "reject");
    assert.equal(called, 0);
  });

  it("model chưa có giá bị từ chối, không gọi Groq", async () => {
    let called = false;
    const out = await call({ model: "la", send: async () => { called = true; return new Response("{}"); } });
    assert.equal(out.kind === "reject" && out.status, 422);
    assert.equal(called, false);
  });

  it("đọc thuyết minh: trừ Token dịch theo giá gốc, hoàn khi Groq lỗi", async () => {
    await sql`delete from token_slices where grant_id = 'gtts'`;
    await sql`delete from token_grants where id = 'gtts'`;
    await sql`insert into token_grants (id, user_id, tokens, left_tokens, price_vnd, expires_at) values ('gtts', 'g', 5, 5, 1, now() + interval '1 day')`;
    const left = async () => Number((await sql<{ n: number }>`select left_tokens as n from token_grants where id = 'gtts'`)[0].n);
    const before = await bal();
    const ok = await call({ path: "/audio/speech", model: "tts", chars: 1000, send: async () => new Response("wav") });
    assert.equal(ok.kind, "pass");
    assert.equal(await bal(), before);
    assert.equal(await left(), 4);
    await call({ path: "/audio/speech", model: "tts", chars: 1000, send: json({}, 500) });
    assert.equal(await left(), 4);
    assert.equal(await bal(), before);
  });
});

describe("đọc yêu cầu", () => {
  const enc = (o: unknown) => new TextEncoder().encode(JSON.stringify(o)).buffer as ArrayBuffer;
  it("chat: lấy model, chặn stream và token trả lời quá lớn", async () => {
    // RE-005: không ghi giới hạn thì dùng trần mặc định và gửi thân đã chuẩn hóa (trước đây gửi nguyên, không trần).
    const plain = await readRequest("/chat/completions", "application/json", enc({ model: "m" }));
    assert.deepEqual([plain?.model, plain?.problem, plain?.cap], ["m", null, 4096]);
    assert.ok((await readRequest("/chat/completions", "application/json", enc({ model: "m", stream: true })))?.problem);
    assert.ok((await readRequest("/chat/completions", "application/json", enc({ model: "m", max_completion_tokens: 999999 })))?.problem);
    for (const n of [2, "1", 0]) {
      assert.ok((await readRequest("/chat/completions", "application/json", enc({ model: "m", n })))?.problem);
    }
    assert.equal((await readRequest("/chat/completions", "application/json", enc({ model: "m", n: 1 })))?.problem, null);
    // R3-002: giá trị lạ bị chặn, giá trị đúng vẫn qua.
    for (const bad of ["abc", -1, 0, 1.5, "100", true]) {
      assert.ok((await readRequest("/chat/completions", "application/json", enc({ model: "m", max_tokens: bad })))?.problem, String(bad));
    }
    assert.equal((await readRequest("/chat/completions", "application/json", enc({ model: "m", max_completion_tokens: 4096 })))?.problem, null);
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
