/**
 * RE6-008: kiểm HÀNH VI của /api/room-groq và /api/model-call (không dò mã nguồn bằng regex) cùng dự toán Token.
 * Gọi thẳng handler POST của route; mock phiên đăng nhập, cổng chống lạm dụng, bảng giá và nhà cung cấp (fetch).
 * Sổ Token, phiếu, giữ trước, quyết toán và nghĩa vụ RE6-001 chạy thật trên PostgreSQL (TYZO_TEST_PG_URL, PG18.7),
 * không có thì PGlite. Không gọi nhà cung cấp thật.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import type { Sql } from "../db.ts";
import { pgliteSql, realPgSql } from "../test-sql.ts";
import type { PriceBook } from "./run-bill.ts";
import { chatCost } from "./run-bill.ts";
import type { GroqLiveRow } from "../sub/groq-board.ts";
import { giayForBaseCost } from "./token-math.ts";
import { buyGiayWith, openGiayWith } from "./token-flow.ts";
import { promptTokenBound, readChatUsage, readRequest, DEFAULT_COMPLETION_TOKENS } from "./run-gate.ts";
import { ALIBABA_ROWS } from "../sub/alibaba-catalog.ts";
import { PROVIDERS } from "../sub/provider.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
const row = (over: Partial<GroqLiveRow> & { id: string }): GroqLiveRow => ({
  speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null,
  unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...over,
});
// Giá niêm yết dùng trong danh mục (models.ts); Turbo 0,04 USD/giờ là đơn vị Token.
const groqBook: PriceBook = {
  rate: 25_000,
  desk: { markup: 0, custom: {} },
  rows: [
    row({ id: "whisper-large-v3-turbo", usdPerHour: 0.04 }),
    row({ id: "openai/gpt-oss-20b", usdIn: 0.075, usdOut: 0.3, contextTokens: 131_072 }),
    row({ id: "openai/gpt-oss-120b", usdIn: 0.15, usdOut: 0.6, contextTokens: 131_072 }),
    row({ id: "qwen/qwen3.8-27b", usdIn: 0.8, usdOut: 4, contextTokens: 131_072 }),
  ],
};

let upstream: { calls: { url: string; body: string }[]; reply: (body: Record<string, unknown>) => Response; delayMs: number; inFlight: number; peak: number; overHeld: number };
const resetUpstream = () => {
  upstream = { calls: [], delayMs: 0, inFlight: 0, peak: 0, overHeld: 0, reply: () => Response.json({ choices: [], usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } }) };
};
resetUpstream();
const originalFetch = globalThis.fetch;

class AccountBlockedError extends Error {}
class RateLimitError extends Error { retryAfter = 1; }
mock.module("../auth/isolation.server.ts", { namedExports: { assertSameSiteRequest: () => {} } });
mock.module("../auth/verify.server.ts", { namedExports: { getSessionUser: async () => ({ id: "k" }) } });
mock.module("../guard.server.ts", {
  namedExports: { requireOpenAccount: async () => {}, takeRate: async () => {}, AccountBlockedError, RateLimitError },
});
mock.module("../db.ts", { namedExports: { getSql: async () => sql } });
mock.module("../run-board.server.ts", { namedExports: { loadPriceBook: async () => groqBook } });
const houses = Object.fromEntries(Object.keys(PROVIDERS).map((id) => [id, { key: null, models: null }])) as Record<string, { key: string | null; models: string[] | null }>;
houses.groq = { key: "room-groq-key", models: groqBook.rows.map((r) => r.id) };
houses.alibaba = { key: "room-alibaba-key", models: ["qwen-plus", "qwen-max", "qwen-turbo"] };
mock.module("../price-books.server.ts", {
  namedExports: { loadRoomHouses: async () => houses, loadProviderRows: async () => ({ alibaba: ALIBABA_ROWS }) },
});

type Handler = (ctx: { request: Request }) => Promise<Response>;
let roomGroq: Handler;
let modelCall: Handler;

before(async () => {
  const real = await realPgSql();
  if (real) ({ sql, end } = real);
  else sql = await pgliteSql();
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = init?.body ? new TextDecoder().decode(init.body as ArrayBuffer) : "";
    upstream.calls.push({ url: String(url), body });
    upstream.inFlight += 1;
    upstream.peak = Math.max(upstream.peak, upstream.inFlight);
    try {
      // Bất biến RE-002: lúc nhà đang chạy, tổng phần giữ của phiếu không vượt phần còn giữ.
      const [t] = await sql<{ held: number; modal_reserved: string }>`select held, modal_reserved from run_tickets where id = ${TID}`;
      if (t && Number(t.modal_reserved) > Number(t.held)) upstream.overHeld += 1;
      if (upstream.delayMs) await new Promise((r) => setTimeout(r, upstream.delayMs));
      return upstream.reply(body ? JSON.parse(body) : {});
    } finally {
      upstream.inFlight -= 1;
    }
  }) as typeof fetch;
  const post = (route: { options: unknown }) => (route.options as { server: { handlers: { POST: Handler } } }).server.handlers.POST;
  roomGroq = post((await import("../../routes/api/room-groq.ts")).Route);
  modelCall = post((await import("../../routes/api/model-call.ts")).Route);
});
after(async () => {
  globalThis.fetch = originalFetch;
  await end?.();
});

const TID = "f".repeat(24);
async function openTicket(hold: number) {
  for (const t of ["run_chat_obligations", "run_gate_calls", "work_admissions", "work_waiters", "token_slices", "run_tickets",
    "token_grants", "room_ledger", "room_accounts", "provider_spend"]) await sql.query(`delete from ${t}`);
  await sql`delete from room_settings where key in ('run_key', 'run_models', 'run_desk', 'chat_obligation_budget', 'work_admission')`;
  await sql`insert into room_settings (key, value) values ('run_key', 'room-groq-key'), ('run_models', ${JSON.stringify(groqBook.rows.map((r) => r.id))})`;
  await sql`insert into room_accounts (user_id, balance) values ('k', 100000)`;
  await buyGiayWith(sql, "k", { grantId: "g1", tokens: 100_000, days: 30, price: 1, note: "thử" });
  const o = await openGiayWith(sql, { id: TID, userId: "k", fileName: "a", seconds: 600, rate: 1, hold, chatModel: "openai/gpt-oss-20b" });
  assert.ok("id" in o, JSON.stringify(o));
}
const ticket = async () =>
  (await sql<{ held: number; charged: number; modal_reserved: string }>`select held, charged, modal_reserved from run_tickets where id = ${TID}`)[0];
const calls = async () =>
  sql<{ status: string; actual_units: string; charged_units: string; short_units: string }>`select status, actual_units, charged_units, short_units from run_gate_calls`;
const obligations = async () => sql<{ status: string }>`select status from run_chat_obligations`;

function groqReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://fixture.test/api/room-groq", {
    method: "POST",
    headers: { "content-type": "application/json", "x-groq-path": "/chat/completions", "x-run-ticket": TID, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
function aliReq(body: unknown) {
  return new Request("http://fixture.test/api/model-call", {
    method: "POST",
    headers: { "content-type": "application/json", "x-provider": "alibaba", "x-path": "/chat/completions", "x-run-ticket": TID },
    body: JSON.stringify(body),
  });
}
const msgs = [{ role: "system", content: "Dịch sang tiếng Việt, trả JSON." }, { role: "user", content: "[\"你好\",\"今天天气很好\"]" }];
// Đúng các thân app gửi (groq.ts: dịch có schema, dự phòng json_object, phân tích) — không được bị chặn oan.
const APP_BODIES = (model: string, extra: Record<string, unknown>) => [
  { model, temperature: 0, ...extra, max_completion_tokens: 832, response_format: { type: "json_schema", json_schema: { name: "t", schema: { type: "object" } } }, messages: msgs },
  { model, temperature: 0, max_completion_tokens: 832, response_format: { type: "json_object" }, messages: msgs },
  { model, temperature: 0.3, ...extra, max_completion_tokens: 4096, response_format: { type: "json_object" }, messages: msgs },
];
const usage = (prompt: number, completion: number, more: Record<string, unknown> = {}) =>
  () => Response.json({ choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion, ...more } });
/** Mức giữ đúng như cổng tính cho một thân đã chuẩn hóa. */
async function holdFor(model: string, body: unknown, tokenField: "max_completion_tokens" | "max_tokens", rows: GroqLiveRow[]) {
  const enc = new TextEncoder().encode(JSON.stringify(body));
  const parsed = await readRequest("/chat/completions", "application/json", enc.buffer as ArrayBuffer, tokenField);
  const r = rows.find((x) => x.id === model)!;
  const bare = { rate: 25_000, desk: { markup: 0, custom: {} }, rows };
  return giayForBaseCost(groqBook, chatCost(bare, model, promptTokenBound(parsed!.body!.byteLength, r.contextTokens), parsed!.cap!)!)!;
}

describe("RE6-008 · danh sách trường cho phép (readRequest)", () => {
  it("mọi thân app thật đi qua được, cả Groq lẫn Alibaba", async () => {
    for (const [model, field, extra] of [
      ["openai/gpt-oss-20b", "max_completion_tokens", { reasoning_effort: "low", include_reasoning: false }],
      ["qwen/qwen3.8-27b", "max_completion_tokens", { reasoning_effort: "none" }],
      ["qwen-plus", "max_tokens", {}],
    ] as const)
      for (const b of APP_BODIES(model, extra)) {
        const r = await readRequest("/chat/completions", "application/json", new TextEncoder().encode(JSON.stringify(b)).buffer as ArrayBuffer, field);
        assert.equal(r?.problem, null, `${model}: ${JSON.stringify(b).slice(0, 80)}`);
      }
  });

  it("trường có thể đổi giá hoặc token mà cận không thấy bị từ chối", async () => {
    const base = { model: "qwen-plus", max_tokens: 100, messages: msgs };
    const cases: [string, Record<string, unknown>, "max_completion_tokens" | "max_tokens"][] = [
      ["max_input_tokens", { max_input_tokens: 1_000_000 }, "max_tokens"],
      ["service_tier", { service_tier: "performance" }, "max_completion_tokens"],
      ["modalities", { modalities: ["text", "audio"] }, "max_tokens"],
      ["audio", { audio: { voice: "x" } }, "max_completion_tokens"],
      ["prediction", { prediction: { type: "content", content: "x" } }, "max_completion_tokens"],
      ["search_settings", { search_settings: {} }, "max_completion_tokens"],
      ["documents", { documents: [{ text: "x" }] }, "max_completion_tokens"],
      ["search_options", { search_options: {} }, "max_tokens"],
      ["include_reasoning", { include_reasoning: true }, "max_tokens"],
      ["thinking_budget", { thinking_budget: 10 }, "max_tokens"],
    ];
    for (const [name, extra, field] of cases) {
      const r = await readRequest("/chat/completions", "application/json", new TextEncoder().encode(JSON.stringify({ ...base, ...extra })).buffer as ArrayBuffer, field);
      assert.ok(r?.problem && r.problem.includes(name), `${name}: ${r?.problem}`);
    }
    for (const [problem, messages] of [
      ["tin nhắn «audio»", [{ role: "user", content: "x", audio: { data: "x" } }]],
      ["Tin nhắn không hợp lệ", [{ role: "function", content: "x" }]],
      ["Tin nhắn không hợp lệ", ["x"]],
      ["Tin nhắn không hợp lệ", [{ content: "x" }]],
    ] as const) {
      const r = await readRequest("/chat/completions", "application/json", new TextEncoder().encode(JSON.stringify({ ...base, messages })).buffer as ArrayBuffer, "max_tokens");
      assert.ok(r?.problem?.includes(problem), `${JSON.stringify(messages)}: ${r?.problem}`);
    }
  });

  it("Unicode: cận tính trên thân chuẩn hóa gửi đi; \\u-escape, emoji, chữ CJK và surrogate lẻ", async () => {
    const text = "你好こんにちは안녕😀Đ";
    const escaped = `{"model":"qwen-plus","messages":[{"role":"user","content":"${text.split("").map((u) => "\\u" + u.charCodeAt(0).toString(16).padStart(4, "0")).join("")}\\ud800"}]}`;
    const raw = new TextEncoder().encode(escaped);
    const r = await readRequest("/chat/completions", "application/json", raw.buffer as ArrayBuffer, "max_tokens");
    assert.equal(r?.problem, null);
    const sent = new TextDecoder().decode(r!.body!);
    assert.ok(sent.includes(text), "gửi dạng UTF-8 thật");
    assert.ok(sent.includes("\\ud800"), "surrogate lẻ vẫn được giữ, dạng escape");
    // Mỗi token ≥ 1 byte UTF-8 của chính thân gửi đi: cận ≥ số byte chữ.
    assert.ok(promptTokenBound(r!.body!.byteLength, null) >= new TextEncoder().encode(text).byteLength * 2);
    assert.equal(r!.cap, DEFAULT_COMPLETION_TOKENS, "không ghi giới hạn → mặc định hữu hạn");
  });
});

describe("RE6-008 · usage thiếu, không hợp lệ, không nhất quán (readChatUsage)", () => {
  it("bảng ca", () => {
    const ok = (u: unknown) => readChatUsage(u).ok;
    assert.equal(ok({ prompt_tokens: 10, completion_tokens: 5 }), true);
    assert.equal(ok({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, completion_tokens_details: { reasoning_tokens: 5 }, prompt_tokens_details: { cached_tokens: 10 } }), true);
    for (const [why, u] of [
      ["thieu-usage", undefined], ["thieu-usage", null], ["thieu-usage", [1]],
      ["thieu-token", { prompt_tokens: 10 }], ["thieu-token", { prompt_tokens: -1, completion_tokens: 5 }],
      ["thieu-token", { prompt_tokens: 1.5, completion_tokens: 5 }], ["thieu-token", { prompt_tokens: "10", completion_tokens: 5 }],
      ["thieu-token", { prompt_tokens: 2 ** 60, completion_tokens: 5 }],
      ["tong-lech", { prompt_tokens: 10, completion_tokens: 5, total_tokens: 40 }],
      ["tong-lech", { prompt_tokens: 10, completion_tokens: 5, total_tokens: "15" }],
      ["suy-luan-lech", { prompt_tokens: 10, completion_tokens: 5, completion_tokens_details: { reasoning_tokens: 6 } }],
      ["suy-luan-lech", { prompt_tokens: 10, completion_tokens: 5, completion_tokens_details: 3 }],
      ["cache-lech", { prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 11 } }],
    ] as const) {
      const r = readChatUsage(u);
      assert.equal(r.ok, false, JSON.stringify(u));
      assert.equal((r as { why: string }).why, why, JSON.stringify(u));
    }
  });
});

describe("RE6-008 · hành vi route /api/room-groq (Groq)", () => {
  beforeEach(async () => {
    resetUpstream();
    await openTicket(5_000);
  });

  it("usage hợp lệ: nhà nhận đúng thân chuẩn hóa (một trường trần, không n), trừ theo usage, nhả phần giữ", async () => {
    upstream.reply = usage(120, 40);
    const body = { model: "openai/gpt-oss-20b", temperature: 0, reasoning_effort: "low", include_reasoning: false, max_tokens: 256, n: 1, response_format: { type: "json_object" }, messages: msgs };
    const res = await roomGroq({ request: groqReq(body) });
    assert.equal(res.status, 200, await res.clone().text());
    assert.equal(upstream.calls.length, 1);
    const sent = JSON.parse(upstream.calls[0].body);
    assert.equal(sent.max_completion_tokens, 256);
    assert.equal("max_tokens" in sent || "n" in sent, false);
    const want = giayForBaseCost(groqBook, chatCost(groqBook, "openai/gpt-oss-20b", 120, 40)!)!;
    const t = await ticket();
    assert.equal(t.charged, want);
    assert.equal(Number(t.modal_reserved), 0);
    const [c] = await calls();
    assert.equal(c.status, "xong");
  });

  it("trường lạ, model ngoài danh mục, stream, nhiều câu trả lời → từ chối trước khi giữ hay gọi nhà", async () => {
    for (const [body, status] of [
      [{ model: "openai/gpt-oss-20b", messages: msgs, service_tier: "flex" }, 400],
      [{ model: "openai/gpt-oss-20b", messages: msgs, stream: true }, 400],
      [{ model: "openai/gpt-oss-20b", messages: msgs, n: 2 }, 400],
      [{ model: "openai/gpt-oss-20b", messages: msgs, max_completion_tokens: 9000 }, 400],
      [{ model: "openai/gpt-oss-20b", messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "x" } }] }] }, 400],
      [{ model: "groq/compound", messages: msgs }, 403],
      [{ model: "llama-3.3-70b-versatile", messages: msgs }, 403],
    ] as const) {
      const res = await roomGroq({ request: groqReq(body) });
      assert.equal(res.status, status, `${JSON.stringify(body).slice(0, 90)} → ${await res.text()}`);
    }
    assert.equal(upstream.calls.length, 0);
    assert.equal((await calls()).length, 0);
    assert.equal(Number((await ticket()).modal_reserved), 0);
  });

  it("phiếu nhỏ: mức giữ ước tính lớn hơn phần còn lại → 402, không gọi nhà; trần nhỏ thì chạy được", async () => {
    const small = { model: "qwen/qwen3.8-27b", messages: msgs, max_completion_tokens: 64 };
    const need = await holdFor("qwen/qwen3.8-27b", small, "max_completion_tokens", groqBook.rows);
    await openTicket(need);
    upstream.reply = usage(60, 20);
    assert.equal((await roomGroq({ request: groqReq(small) })).status, 200);
    assert.equal(upstream.calls.length, 1);
    await openTicket(need);
    const big = { ...small, max_completion_tokens: 8192 };
    const res = await roomGroq({ request: groqReq(big) });
    assert.equal(res.status, 402);
    assert.equal(upstream.calls.length, 1, "không gọi thêm");
    // Không giữ cả cửa sổ ngữ cảnh: mức giữ theo byte thân, nhỏ hơn nhiều so với 131.072 token vào.
    const windowHold = giayForBaseCost(groqBook, chatCost(groqBook, "qwen/qwen3.8-27b", 131_072, 64)!)!;
    assert.ok(need * 20 < windowHold, `${need} vs ${windowHold}`);
  });

  it("usage vượt cận: chỉ trừ tới mức đã giữ, phần thiếu ghi short_units, lệnh cần đối soát", async () => {
    const body = { model: "openai/gpt-oss-20b", messages: msgs, max_completion_tokens: 64 };
    const held = await holdFor("openai/gpt-oss-20b", body, "max_completion_tokens", groqBook.rows);
    upstream.reply = usage(500_000, 64);
    assert.equal((await roomGroq({ request: groqReq(body) })).status, 200);
    const [c] = await calls();
    assert.equal(c.status, "can-doi-soat");
    assert.equal(Number(c.charged_units), held);
    assert.ok(Number(c.short_units) > 0);
    assert.equal((await ticket()).charged, held);
    assert.equal((await obligations()).length, 0, "usage hợp lệ: không phải nghĩa vụ thiếu usage");
    const spend = await sql<{ usd_micro: string }>`select usd_micro from provider_spend`;
    assert.equal(Number(spend[0].usd_micro), Math.round(500_000 * 0.075 + 64 * 0.3), "chi phí nhà ghi theo usage thật");
  });

  it("usage không nhất quán hoặc thiếu: không trừ khách, nghĩa vụ chờ đối soát (RE6-001)", async () => {
    const body = { model: "openai/gpt-oss-20b", messages: msgs, max_completion_tokens: 64 };
    for (const reply of [
      () => Response.json({ usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 5_000 } }),
      () => Response.json({ usage: { prompt_tokens: 100, completion_tokens: 10, completion_tokens_details: { reasoning_tokens: 40 } } }),
      () => Response.json({ usage: { prompt_tokens: 100 } }),
      () => new Response("không phải JSON", { status: 200 }),
    ]) {
      upstream.reply = reply;
      assert.equal((await roomGroq({ request: groqReq(body) })).status, 200);
    }
    assert.equal((await ticket()).charged, 0);
    const ob = await obligations();
    assert.equal(ob.length, 4);
    assert.ok(ob.every((o) => o.status === "pending"));
    assert.ok((await calls()).every((c) => c.status === "can-doi-soat" && Number(c.charged_units) === 0));
    assert.equal((await sql`select 1 from provider_spend`).length, 0, "ước tính không vào sổ chi phí đã xác nhận");
  });

  for (const [label, perUser, want] of [["mặc định 2 suất/khách", null, 2], ["nới suất/khách, mức giữ là giới hạn", 50, 3]] as const)
    it(`đồng thời 30 yêu cầu trên một phiếu đủ 3,5 lệnh (${label}): tối đa ${want} lệnh tới nhà cùng lúc, nhả hết phần giữ`, async (ctx) => {
      const body = { model: "openai/gpt-oss-120b", messages: msgs, max_completion_tokens: 512 };
      const each = await holdFor("openai/gpt-oss-120b", body, "max_completion_tokens", groqBook.rows);
      await openTicket(each * 3 + Math.floor(each / 2));
      if (perUser) await sql`insert into room_settings (key, value) values ('work_admission', ${JSON.stringify({ perUser })})`;
      upstream.delayMs = 60;
      upstream.reply = usage(90, 30);
      const res = await Promise.all(Array.from({ length: 30 }, () => roomGroq({ request: groqReq(body) })));
      const ok = res.filter((r) => r.status === 200).length;
      // Phiếu phục vụ được nhiều lệnh nối tiếp (mỗi lệnh chỉ trừ usage thật); giới hạn là số lệnh CÙNG LÚC.
      assert.ok(upstream.peak <= want && upstream.peak >= 1, `đỉnh đồng thời ${upstream.peak}`);
      assert.equal(upstream.overHeld, 0, "phần giữ không bao giờ vượt held khi nhà đang chạy");
      assert.equal(upstream.calls.length, ok);
      assert.ok(res.every((r) => r.status === 200 || r.status === 429 || r.status === 402), res.map((r) => r.status).join(","));
      const t = await ticket();
      assert.equal(Number(t.modal_reserved), 0);
      const per = giayForBaseCost(groqBook, chatCost(groqBook, "openai/gpt-oss-120b", 90, 30)!)!;
      assert.equal(t.charged, per * ok);
      ctx.diagnostic(`mức giữ ${each} Token/lệnh, held ${each * 3 + Math.floor(each / 2)}, đỉnh ${upstream.peak} lệnh cùng lúc, ${ok} lệnh tới nhà, mã trả: ${[...new Set(res.map((r) => r.status))].join("/")}`);
    });
});

describe("RE6-008 · hành vi route /api/model-call (Alibaba)", () => {
  beforeEach(async () => {
    resetUpstream();
    await openTicket(50_000);
  });

  it("qwen-plus: gửi max_tokens và tắt suy luận; thân app thật đi qua", async () => {
    upstream.reply = usage(100, 20);
    const res = await modelCall({ request: aliReq({ model: "qwen-plus", temperature: 0, max_completion_tokens: 300, response_format: { type: "json_object" }, messages: msgs }) });
    assert.equal(res.status, 200, await res.clone().text());
    const sent = JSON.parse(upstream.calls[0].body);
    assert.deepEqual([sent.max_tokens, sent.enable_thinking, "max_completion_tokens" in sent], [300, false, false]);
    assert.match(upstream.calls[0].url, /dashscope/);
  });

  it("max_input_tokens, bật suy luận, tìm web → từ chối trước khi giữ hay gọi nhà", async () => {
    for (const extra of [{ max_input_tokens: 1_000_000 }, { enable_thinking: true }, { thinking_budget: 100 }, { enable_search: true }, { reasoning_effort: "high" }]) {
      const res = await modelCall({ request: aliReq({ model: "qwen-plus", messages: msgs, ...extra }) });
      assert.equal(res.status, 400, JSON.stringify(extra));
    }
    assert.equal(upstream.calls.length, 0);
    assert.equal((await calls()).length, 0);
  });

  it("vượt ngưỡng giá phẳng 256K của qwen-plus hoặc có token suy luận → đối soát, vẫn trừ trong mức giữ", async () => {
    const body = { model: "qwen-plus", messages: msgs, max_tokens: 50 };
    for (const reply of [usage(300_000, 10), usage(100, 20, { completion_tokens_details: { reasoning_tokens: 5 } })]) {
      upstream.reply = reply;
      assert.equal((await modelCall({ request: aliReq(body) })).status, 200);
    }
    const all = await calls();
    assert.equal(all.length, 2);
    assert.ok(all.every((c) => c.status === "can-doi-soat"), JSON.stringify(all));
    assert.ok(all.every((c) => Number(c.charged_units) > 0));
  });

  it("RE8-004: qwen-turbo trên 256K đầu vào → đối soát (bậc giá chưa xác minh); qwen-max không có ngưỡng", async () => {
    upstream.reply = usage(300_000, 10);
    assert.equal((await modelCall({ request: aliReq({ model: "qwen-turbo", messages: msgs, max_tokens: 50 }) })).status, 200);
    const [c] = await calls();
    assert.equal(c.status, "can-doi-soat");
    const { FLAT_PRICE_INPUT_LIMIT } = await import("./run-gate.ts");
    assert.equal(FLAT_PRICE_INPUT_LIMIT["alibaba:qwen-max"], undefined);
  });

  it("dưới ngưỡng, usage hợp lệ → xong", async () => {
    upstream.reply = usage(200_000, 10);
    const body = { model: "qwen-plus", messages: [{ role: "user", content: "x".repeat(150_000) }], max_tokens: 50 };
    await openTicket(await holdFor("qwen-plus", body, "max_tokens", ALIBABA_ROWS));
    assert.equal((await modelCall({ request: aliReq(body) })).status, 200);
    const [c] = await calls();
    assert.equal(c.status, "xong");
  });
});

describe("RE6-008 · dự toán theo từng model và nhà", () => {
  beforeEach(async () => {
    resetUpstream();
    await openTicket(50_000);
  });

  it("model danh mục chưa có giá (enterprise) → 422, không giữ, không gọi nhà", async () => {
    houses.groq.models = [...groqBook.rows.map((r) => r.id), "llama-3.3-70b-versatile"];
    await sql`update room_settings set value = ${JSON.stringify(houses.groq.models)} where key = 'run_models'`;
    try {
      const res = await roomGroq({ request: groqReq({ model: "llama-3.3-70b-versatile", messages: msgs }) });
      assert.equal(res.status, 422, await res.text());
      assert.equal(upstream.calls.length, 0);
      assert.equal((await calls()).length, 0);
    } finally {
      houses.groq.models = groqBook.rows.map((r) => r.id);
    }
  });

  it("bảng: mức giữ của một lô dịch 40 câu so với usage thật lớn nhất đã đo (RE4-001) và trần đầu ra", async (ctx) => {
    // Lô 40 câu tiếng Trung như app gửi; app đặt trần 512 + 40×160 = 6.912 → chặn ở 4.096.
    const lines = Array.from({ length: 40 }, (_, i) => `第${i}句：今天我们一起去北京看王小明，他说天气很好。`);
    const body = (model: string) => ({ model, temperature: 0, max_completion_tokens: 4096, response_format: { type: "json_object" }, messages: [msgs[0], { role: "user", content: JSON.stringify(lines) }] });
    const rowsFor = (p: string) => (p === "groq" ? groqBook.rows : ALIBABA_ROWS);
    const table: string[] = [];
    for (const [provider, model, measured] of [
      ["groq", "openai/gpt-oss-20b", 0.161], ["groq", "openai/gpt-oss-120b", 0.161], ["groq", "qwen/qwen3.8-27b", 0.088],
      ["alibaba", "qwen-plus", 0.16], ["alibaba", "qwen-max", 0.18], ["alibaba", "qwen-turbo", null],
    ] as const) {
      const field = provider === "groq" ? "max_completion_tokens" : "max_tokens";
      const b = body(model);
      const enc = new TextEncoder().encode(JSON.stringify(b));
      const parsed = (await readRequest("/chat/completions", "application/json", enc.buffer as ArrayBuffer, field))!;
      const r = rowsFor(provider).find((x) => x.id === model)!;
      const bound = promptTokenBound(parsed.body!.byteLength, r.contextTokens);
      const bare = { rate: 25_000, desk: { markup: 0, custom: {} }, rows: rowsFor(provider) };
      const hold = giayForBaseCost(groqBook, chatCost(bare, model, bound, parsed.cap!)!)!;
      // Dự toán là CẬN TRÊN cho mọi usage ≤ (cận vào, trần ra): đơn điệu theo token.
      for (const [p, c] of [[bound, parsed.cap!], [Math.floor(bound / 2), parsed.cap!], [bound, 0], [0, 0]])
        assert.ok(giayForBaseCost(groqBook, chatCost(bare, model, p, c)!)! <= hold, `${model} ${p}/${c}`);
      const typicalIn = measured == null ? null : Math.ceil(bound * measured);
      const typical = typicalIn == null ? null : giayForBaseCost(groqBook, chatCost(bare, model, typicalIn, 1200)!)!;
      table.push(`${provider} ${model}: thân ${parsed.body!.byteLength} B, cận vào ${bound}, trần ra ${parsed.cap}, giữ ${hold} Token` +
        (typical == null ? ", CHƯA ĐO THẬT (BLOCKED)" : `, ví dụ usage thật (vào ${typicalIn} theo tỷ lệ đo ${measured}, ra 1200) ≈ ${typical} Token`));
    }
    ctx.diagnostic(table.join(" | "));
  });
});
