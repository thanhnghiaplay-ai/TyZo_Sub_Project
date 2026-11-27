/**
 * RE-002 (R3-001, MAIN-041) và RE-005: cửa Groq/Alibaba giữ trước cho từng lệnh; nhà luôn nhận yêu cầu có trần token.
 * Đặt TYZO_TEST_PG_URL để chạy trên Postgres thật nhiều kết nối.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Sql } from "../db.ts";
import { pgliteSql, realPgSql } from "../test-sql.ts";
import type { PriceBook } from "./run-bill.ts";
import { chargeWith, DEFAULT_COMPLETION_TOKENS, PROMPT_FRAME_TOKENS, promptTokenBound, readRequest } from "./run-gate.ts";
import { chatCost } from "./run-bill.ts";
import { giayForBaseCost } from "./token-math.ts";
import { buyGiayWith, closeTokenWith, openGiayWith } from "./token-flow.ts";
import type { GroqLiveRow } from "../sub/groq-board.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
});
after(async () => {
  await end?.();
});

const row = (over: Partial<GroqLiveRow>): GroqLiveRow => ({
  id: "x", speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null,
  unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...over,
});
// 1 Token = giá gốc 1 giây Turbo = 0,04 USD/giờ × 25.000 / 3.600 ≈ 0,278 đ. Chat 0,1 USD/triệu token mỗi chiều.
const book: PriceBook = {
  rate: 25_000,
  desk: { markup: 0, custom: {} },
  rows: [row({ id: "whisper-large-v3-turbo", usdPerHour: 0.04 }), row({ id: "chat", usdIn: 0.1, usdOut: 0.1, contextTokens: 100 })],
};
const TID = "c".repeat(24);
/** Số Token một lệnh 100 vào + 3.233 ra (tính bằng đúng hàm của app). */
const PER_CALL = giayForBaseCost(book, chatCost(book, "chat", 100, 3233)!)!;
const enc = (body: unknown) => {
  const u = new TextEncoder().encode(JSON.stringify(body));
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
};

async function openTicket(hold: number) {
  await sql`delete from run_gate_calls`;
  await sql`delete from token_slices`;
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
  await sql`delete from room_ledger`;
  await sql`delete from room_accounts`;
  await sql`delete from provider_spend`;
  await sql`insert into room_accounts (user_id, balance) values ('k', 100000)`;
  await buyGiayWith(sql, "k", { grantId: "g1", tokens: 1000, days: 30, price: 1, note: "thử" });
  const o = await openGiayWith(sql, { id: TID, userId: "k", fileName: "a", seconds: 600, rate: 1, hold, chatModel: "chat" });
  assert.ok("id" in o);
}
const ticket = async () =>
  (await sql<{ held: number; charged: number; status: string; modal_reserved: string }>`select held, charged, status, modal_reserved from run_tickets where id = ${TID}`)[0];

describe("RE-002: giữ trước từng lệnh Groq/Alibaba", () => {
  beforeEach(() => openTicket(100));

  it("8 lệnh cùng lúc, mỗi lệnh ~30 Token, giữ 100 → phần giữ không bao giờ vượt held, nhà chỉ được gọi khi còn phần giữ", async (t0) => {
    // 100 token vào (300 byte / 3) + 3.233 token ra ≈ 8,33 đ ≈ 30 Token.
    const body = new ArrayBuffer(300);
    let inFlight = 0;
    let peak = 0;
    let sends = 0;
    let overHeld = 0;
    const send = async () => {
      sends += 1;
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      const t = await ticket();
      if (Number(t.modal_reserved) > t.held + 1e-9) overHeld += 1;
      await new Promise((r) => setTimeout(r, 80));
      inFlight -= 1;
      return new Response(JSON.stringify({ usage: { prompt_tokens: 100, completion_tokens: 3233 } }), { status: 200 });
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        chargeWith({ sql, book, unitBook: book, path: "/chat/completions", model: "chat", chars: 0, userId: "k", ticketId: TID, body, cap: 0, outCap: 3233, busyWaitMs: 3000, send }),
      ),
    );
    const t = await ticket();
    const spend = await sql<{ n: number }>`select coalesce(sum(calls), 0)::int as n from provider_spend`;
    const charged = t.charged;
    // Mỗi lệnh gọi nhà tốn ~30 Token. Lệnh được gọi khi còn phần giữ; lệnh cuối có thể chỉ giữ được một phần.
    t0.diagnostic(`SAU: nhà được gọi ${sends} lần (≈${sends * PER_CALL} Token), cùng lúc tối đa ${peak}, khách bị trừ ${charged} Token (phần giữ 100).`);
    assert.equal(overHeld, 0, "tổng phần giữ vượt held");
    assert.ok(sends * PER_CALL - charged <= PER_CALL, `nhà được gọi ${sends} lần (≈${sends * PER_CALL} Token) nhưng chỉ thu ${charged}`);
    assert.ok(peak <= 4, `cùng lúc ${peak} lệnh tới nhà`);
    assert.equal(Number(t.modal_reserved), 0, "phần giữ phải nhả hết");
    assert.equal(results.filter((r) => r.kind === "pass").length, sends);
    assert.equal(Number(spend[0].n), sends);
  });

  it("RE4-001: yêu cầu thiếu phần giữ theo trần input bị chặn trước khi gọi nhà", async () => {
    // ~6 KB tiếng Việt/CJK/emoji + schema: cận 2×byte + khung vượt phần giữ 100 Token.
    const body = enc({
      model: "chat",
      messages: [{ role: "user", content: "Tiếng Việt 中文 🎬 ".repeat(300) }],
      tools: [{ type: "function", function: { name: "caption", parameters: { type: "object" } } }],
    });
    const priced = {
      ...book,
      rows: book.rows.map((r) => r.id === "chat" ? { ...r, contextTokens: 40_000 } : r),
    };
    let sends = 0;
    const out = await chargeWith({
      sql, book: priced, path: "/chat/completions", model: "chat", chars: 0,
      userId: "k", ticketId: TID, body, cap: 0, outCap: 200,
      send: async () => {
        sends++;
        return Response.json({ usage: { prompt_tokens: 100, completion_tokens: 100 } });
      },
    });
    assert.ok(promptTokenBound(body.byteLength, 40_000) > 10_000);
    assert.equal(sends, 0);
    assert.equal(out.kind === "reject" && out.status, 402);
    assert.equal((await ticket()).charged, 0);
    assert.equal((await sql`select 1 from run_gate_calls`).length, 0);
  });

  it("RE4-001: cận theo byte không phụ thuộc cửa sổ chưa xác minh; cửa sổ đã biết chỉ làm cận chặt hơn", () => {
    assert.equal(promptTokenBound(1000, null), 2 * 1000 + PROMPT_FRAME_TOKENS);
    assert.equal(promptTokenBound(1000, 1_000_000), 2 * 1000 + PROMPT_FRAME_TOKENS);
    assert.equal(promptTokenBound(1000, 300), 300);
    assert.equal(promptTokenBound(1000, 0), 2 * 1000 + PROMPT_FRAME_TOKENS);
  });

  it("RE4-001: phiếu nhỏ chạy được với model cửa sổ 1 triệu token; quyết toán theo usage thật", async () => {
    const priced = {
      ...book,
      rows: book.rows.map((r) => r.id === "chat" ? { ...r, contextTokens: 1_000_000 } : r),
    };
    const body = enc({ model: "chat", messages: [{ role: "user", content: "Xin chào 你好 🎬" }], max_tokens: 200 });
    // Theo cả cửa sổ: 1.000.000 vào + 200 ra ≈ 9.000 Token > phần giữ 100 → bị chặn oan.
    assert.ok(giayForBaseCost(book, chatCost(book, "chat", 1_000_000, 200)!)! > 100);
    let sends = 0;
    const out = await chargeWith({
      sql, book: priced, unitBook: book, path: "/chat/completions", model: "chat", chars: 0,
      userId: "k", ticketId: TID, body, cap: 0, outCap: 200,
      send: async () => {
        sends++;
        return Response.json({ usage: { prompt_tokens: 40, completion_tokens: 30 } });
      },
    });
    assert.equal(out.kind, "pass");
    assert.equal(sends, 1);
    const t = await ticket();
    assert.equal(t.charged, giayForBaseCost(book, chatCost(book, "chat", 40, 30)!));
    assert.equal(Number(t.modal_reserved), 0);
  });

  it("RE4-001: model chưa có cửa sổ (qwen-turbo) giữ theo cận byte thay vì bị chặn", async () => {
    const priced = {
      ...book,
      rows: book.rows.map((r) => r.id === "chat" ? { ...r, contextTokens: null } : r),
    };
    let sends = 0;
    const out = await chargeWith({
      sql, book: priced, unitBook: book, path: "/chat/completions", model: "chat", chars: 0,
      userId: "k", ticketId: TID, body: enc({ model: "chat" }), cap: 0, outCap: 20,
      send: async () => {
        sends++;
        return Response.json({ usage: { prompt_tokens: 5, completion_tokens: 5 } });
      },
    });
    assert.equal(out.kind, "pass");
    assert.equal(sends, 1);
    const turbo = await readRequest("/chat/completions", "application/json", enc({ model: "qwen-turbo", max_tokens: 50 }), "max_tokens");
    assert.equal(JSON.parse(new TextDecoder().decode(turbo!.body!)).enable_thinking, false);
  });

  it("RE4-001: ảnh, âm thanh, tệp trong tin nhắn bị chặn vì cận byte không phủ được", async () => {
    const path = "/chat/completions";
    for (const content of [
      [{ type: "image_url", image_url: { url: "https://x.test/a.png" } }],
      [{ type: "input_audio", input_audio: { data: "AAAA", format: "wav" } }],
      [{ type: "text", text: "a" }, { type: "file", file: { file_id: "f" } }],
      [{ type: "text", text: 1 }],
    ]) {
      const r = await readRequest(path, "application/json", enc({ model: "chat", messages: [{ role: "user", content }] }));
      assert.ok(r?.problem, JSON.stringify(content));
    }
    assert.ok((await readRequest(path, "application/json", enc({ model: "chat", messages: "x" })))?.problem);
    for (const content of ["chữ", [{ type: "text", text: "chữ" }], null]) {
      const r = await readRequest(path, "application/json", enc({ model: "chat", messages: [{ role: "user", content }] }));
      assert.equal(r?.problem, null, JSON.stringify(content));
    }
  });

  it("RE4-001: usage vượt cận byte được đánh dấu đối soát", async () => {
    const body = enc({ model: "chat", messages: [{ role: "user", content: "a" }] });
    const over = promptTokenBound(body.byteLength, null) + 1;
    const priced = { ...book, rows: book.rows.map((r) => r.id === "chat" ? { ...r, contextTokens: null } : r) };
    const out = await chargeWith({
      sql, book: priced, unitBook: book, path: "/chat/completions", model: "chat", chars: 0,
      userId: "k", ticketId: TID, body, cap: 0, outCap: 20,
      send: async () => Response.json({ usage: { prompt_tokens: over, completion_tokens: 1 } }),
    });
    assert.equal(out.kind, "pass");
    const calls = await sql<{ status: string }>`select status from run_gate_calls`;
    assert.deepEqual(calls.map((c) => c.status), ["can-doi-soat"]);
  });

  describe("RE5-002: dịch thiếu usage không trừ khách theo ước tính", () => {
    const run = (reply: () => Response) => chargeWith({
      sql, book, unitBook: book, path: "/chat/completions", model: "chat", chars: 0, userId: "k", ticketId: TID,
      body: new ArrayBuffer(300), cap: 0, outCap: 1000, send: async () => reply(),
    });
    const calls = () => sql<{ id: string; status: string; actual_units: string; charged_units: string; short_units: string; reserved: string }>`
      select id, status, actual_units, charged_units, short_units, reserved from run_gate_calls`;
    for (const [name, reply] of [
      ["không có usage", () => Response.json({ choices: [] })],
      ["thiếu completion_tokens", () => Response.json({ usage: { prompt_tokens: 10 } })],
      ["usage âm", () => Response.json({ usage: { prompt_tokens: -1, completion_tokens: 5 } })],
      ["usage có null", () => Response.json({ usage: { prompt_tokens: null, completion_tokens: 100 } })],
      ["usage có boolean", () => Response.json({ usage: { prompt_tokens: true, completion_tokens: 100 } })],
      ["usage có chuỗi số", () => Response.json({ usage: { prompt_tokens: 100, completion_tokens: "100" } })],
      ["thân không phải JSON", () => new Response("không phải json")],
    ] as const) {
      it(`${name}: trừ 0, ghi nghĩa vụ chờ đối soát, nhả phần giữ, ghi chi phí nhà`, async () => {
        const out = await run(reply);
        assert.equal(out.kind, "pass");
        const t = await ticket();
        assert.equal(t.charged, 0);
        assert.equal(Number(t.modal_reserved), 0);
        const [c] = await calls();
        assert.equal(c.status, "can-doi-soat");
        assert.equal(Number(c.charged_units), 0);
        assert.ok(Number(c.actual_units) > 0);
        assert.equal(Number(c.short_units), Number(c.actual_units));
        assert.equal(Number(c.reserved), 0);
        const spend = await sql<{ n: number }>`select coalesce(sum(calls), 0)::int as n from provider_spend`;
        assert.equal(spend[0].n, 1);
      });
    }

    it("usage bằng 0 hợp lệ, không tạo nghĩa vụ ước tính", async () => {
      const out = await run(() => Response.json({ usage: { prompt_tokens: 0, completion_tokens: 0 } }));
      assert.equal(out.kind, "pass");
      const [c] = await calls();
      assert.deepEqual([c.status, Number(c.short_units), Number(c.charged_units)], ["xong", 0, 0]);
    });

    it("quyết toán lại cùng lệnh (replay) không trừ thêm và không ghi chi phí lần hai", async () => {
      await run(() => Response.json({}));
      const [c] = await calls();
      const { settleGateCall } = await import("./gate-reserve.ts");
      const again = await settleGateCall(sql, { callId: c.id, ticketId: TID, userId: "k", units: 50, base: 1, provider: "groq", model: "chat", rate: 25_000, reconcile: false });
      assert.deepEqual(again, { taken: 0, replay: true });
      assert.equal((await ticket()).charged, 0);
      assert.equal((await sql<{ n: number }>`select coalesce(sum(calls), 0)::int as n from provider_spend`)[0].n, 1);
    });

    it("6 lệnh đồng thời thiếu usage: không trừ, phần giữ về 0, mỗi lệnh một nghĩa vụ", async () => {
      const outs = await Promise.all(Array.from({ length: 6 }, () =>
        chargeWith({ sql, book, unitBook: book, path: "/chat/completions", model: "chat", chars: 0, userId: "k", ticketId: TID,
          body: new ArrayBuffer(30), cap: 0, outCap: 100, busyWaitMs: 3000, send: async () => Response.json({}) })));
      const passed = outs.filter((o) => o.kind === "pass").length;
      const t = await ticket();
      assert.equal(t.charged, 0);
      assert.equal(Number(t.modal_reserved), 0);
      const rows = await calls();
      assert.equal(rows.filter((r) => r.status === "can-doi-soat" && Number(r.short_units) > 0).length, passed);
      assert.ok(passed >= 1);
    });

    it("usage hợp lệ nhưng vượt trần ra vẫn trừ theo số thật (trong phần giữ) và đánh dấu đối soát", async () => {
      const out = await run(() => Response.json({ usage: { prompt_tokens: 10, completion_tokens: 1001 } }));
      assert.equal(out.kind, "pass");
      assert.ok((await ticket()).charged > 0);
      assert.equal((await calls())[0].status, "can-doi-soat");
    });
  });

  it("nhà trả 500: nhả phần giữ, không trừ, giữ dấu đối soát vì chưa xác minh kết quả", async () => {
    const out = await chargeWith({ sql, book, unitBook: book, path: "/chat/completions", model: "chat", chars: 0, userId: "k", ticketId: TID, body: new ArrayBuffer(300), cap: 0, outCap: 1000, send: async () => new Response("{}", { status: 500 }) });
    assert.equal(out.kind, "pass");
    const t = await ticket();
    assert.deepEqual([t.charged, Number(t.modal_reserved)], [0, 0]);
    const c = await sql<{ status: string }>`select status from run_gate_calls`;
    assert.deepEqual(c.map((x) => x.status), ["mat-phan-hoi"]);
  });

  it("mất trả lời (hết giờ): nhả phần giữ, ghi «mat-phan-hoi» để đối soát", async () => {
    await assert.rejects(
      chargeWith({ sql, book, unitBook: book, path: "/chat/completions", model: "chat", chars: 0, userId: "k", ticketId: TID, body: new ArrayBuffer(300), cap: 0, outCap: 1000, send: async () => { throw Object.assign(new Error("hết giờ"), { name: "TimeoutError" }); } }),
    );
    const t = await ticket();
    assert.equal(Number(t.modal_reserved), 0);
    const c = await sql<{ status: string }>`select status from run_gate_calls`;
    assert.deepEqual(c.map((x) => x.status), ["mat-phan-hoi"]);
  });

  it("tiến trình chết giữa chừng (mất nhịp): lệnh sau dọn phần giữ của lệnh chết rồi chạy được", async () => {
    await sql`update run_tickets set modal_reserved = 100 where id = ${TID}`;
    await sql`insert into run_gate_calls (id, ticket_id, reserved, heartbeat_at) values ('chet', ${TID}, 100, now() - interval '10 minutes')`;
    const out = await chargeWith({ sql, book, unitBook: book, path: "/chat/completions", model: "chat", chars: 0, userId: "k", ticketId: TID, body: new ArrayBuffer(300), cap: 0, outCap: 1000, busyWaitMs: 0, send: async () => new Response(JSON.stringify({ usage: { prompt_tokens: 100, completion_tokens: 100 } })) });
    assert.equal(out.kind, "pass");
    const dead = await sql<{ status: string }>`select status from run_gate_calls where id = 'chet'`;
    assert.equal(dead[0].status, "mat-phan-hoi");
    assert.equal(Number((await ticket()).modal_reserved), 0);
  });

  it("khách đóng phiếu khi lệnh đang gọi nhà → chờ lệnh xong mới trả phần dư; lệnh vẫn được trừ", async () => {
    let open!: () => void;
    const wait = new Promise<void>((r) => (open = r));
    const running = chargeWith({ sql, book, unitBook: book, path: "/chat/completions", model: "chat", chars: 0, userId: "k", ticketId: TID, body: new ArrayBuffer(300), cap: 0, outCap: 3233, send: async () => { await wait; return new Response(JSON.stringify({ usage: { prompt_tokens: 100, completion_tokens: 3233 } })); } });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(await closeTokenWith(sql, TID, "k", false), null);
    open();
    await running;
    const t = await ticket();
    assert.equal(t.charged, PER_CALL);
    assert.notEqual(t.status, "dang-giu");
    assert.equal(t.held, 0);
  });
});

describe("RE-005: nhà luôn nhận yêu cầu có trần token", () => {
  const dec = (b?: ArrayBuffer) => JSON.parse(new TextDecoder().decode(b!)) as Record<string, unknown>;
  it("không ghi hoặc null → trần mặc định, đúng trường của nhà", async () => {
    for (const extra of [{}, { max_tokens: null }, { max_completion_tokens: null }]) {
      const groq = await readRequest("/chat/completions", "application/json", enc({ model: "m", ...extra }), "max_completion_tokens");
      assert.equal(groq?.cap, DEFAULT_COMPLETION_TOKENS);
      assert.deepEqual([dec(groq?.body).max_completion_tokens, "max_tokens" in dec(groq?.body)], [DEFAULT_COMPLETION_TOKENS, false]);
      const ali = await readRequest("/chat/completions", "application/json", enc({ model: "m", ...extra }), "max_tokens");
      assert.deepEqual([dec(ali?.body).max_tokens, "max_completion_tokens" in dec(ali?.body)], [DEFAULT_COMPLETION_TOKENS, false]);
    }
  });
  it("âm, chuỗi, thập phân, 0, 8193, hai trường khác nhau → từ chối; hai trường bằng nhau → nhận", async () => {
    for (const bad of [{ max_tokens: -1 }, { max_tokens: "100" }, { max_tokens: 1.5 }, { max_tokens: 0 }, { max_completion_tokens: 8193 }, { max_tokens: 100, max_completion_tokens: 200 }]) {
      assert.ok((await readRequest("/chat/completions", "application/json", enc({ model: "m", ...bad })))?.problem, JSON.stringify(bad));
    }
    const same = await readRequest("/chat/completions", "application/json", enc({ model: "m", max_tokens: 300, max_completion_tokens: 300 }), "max_tokens");
    assert.deepEqual([same?.problem, same?.cap, dec(same?.body).max_tokens], [null, 300, 300]);
  });
  it("RE4-001: Alibaba giữ trần phần dịch và không bật reasoning hoặc công cụ chạy tại nhà", async () => {
    const path = "/chat/completions";
    const valid = await readRequest(path, "application/json", enc({
      model: "qwen-plus", max_tokens: 200, reasoning_effort: "none",
      tools: [{ type: "function", function: { name: "caption" } }],
    }), "max_tokens");
    assert.equal(valid?.problem, null);
    assert.equal(dec(valid?.body).enable_thinking, false);
    assert.equal(dec(valid?.body).max_tokens, 200);
    assert.ok(!("reasoning_effort" in dec(valid?.body)));
    for (const extra of [
      { enable_thinking: true }, { thinking_budget: 1024 },
      { reasoning_effort: "high" }, { enable_search: true }, { tools: [{ type: "web_search" }] },
    ]) {
      const invalid = await readRequest(path, "application/json", enc({ model: "qwen-plus", ...extra }), "max_tokens");
      assert.ok(invalid?.problem);
    }
  });

  it("nhà giả nhận đúng thân đã chuẩn hóa qua cửa tính tiền", async () => {
    await openTicket(100);
    const parsed = await readRequest("/chat/completions", "application/json", enc({ model: "chat", messages: [] }), "max_tokens");
    let seen: Record<string, unknown> | null = null;
    await chargeWith({
      sql, book, unitBook: book, path: "/chat/completions", model: "chat", chars: 0, userId: "k", ticketId: TID, body: parsed!.body!, cap: 0, outCap: parsed!.cap,
      send: async () => {
        seen = dec(parsed!.body);
        return new Response(JSON.stringify({ usage: { prompt_tokens: 10, completion_tokens: 10 } }));
      },
    });
    assert.equal(seen!.max_tokens, DEFAULT_COMPLETION_TOKENS);
  });
});
