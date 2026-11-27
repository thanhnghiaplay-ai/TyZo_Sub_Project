/** Native loopback WebSocket + real PostgreSQL billing. Synthetic upstream only; no ASR/audio latency or GPU claim. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import WebSocket, { WebSocketServer } from "ws";
import { attachLiveBridge } from "../src/lib/live/live-bridge.ts";
import { createLiveBilling } from "../src/lib/live/live-billing.ts";
import { beginWork, AdmissionBusy } from "../src/lib/billing/work-admission.ts";
import { realPgSql } from "../src/lib/test-sql.ts";
import { signLiveTicket } from "../src/lib/live/live-ticket.ts";
import { LIVE_FALLBACK_ROWS, LIVE_MODEL_38 } from "../src/lib/live/live-price.ts";
import { liveCost, liveSupplierCost } from "../src/lib/live/live-cost.ts";
import { giayForBaseCost } from "../src/lib/billing/token-math.ts";
import type { PriceBook } from "../src/lib/billing/run-bill.ts";
const url = new URL(process.env.TYZO_TEST_PG_URL ?? "postgresql://invalid");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "55439");
const db = await realPgSql();
assert.ok(db);
const { sql } = db;
const secret = "local-synthetic-live-benchmark-not-a-production-credential";
const book = { rate: 26000, rows: LIVE_FALLBACK_ROWS };
const unitBook: PriceBook = {
  rate: book.rate,
  desk: { markup: 0, custom: {} },
  rows: [
    {
      id: "whisper-large-v3-turbo",
      usdPerHour: 0.04,
      usdIn: null,
      usdOut: null,
      usdPerMillionChars: null,
      speed: null,
      unlisted: false,
      limits: [],
      contextTokens: null,
      maxCompletionTokens: null,
      maxFile: null,
    },
  ],
};
const toGiay = (base: number) => giayForBaseCost(unitBook, base);
const stock = 100000;
const delta = { audioIn: 14, textIn: 0, imageIn: 0, textOut: 2, audioOut: 0 };
const perTurnTokens = toGiay(liveCost(book, LIVE_MODEL_38, delta)!.base)!;
const perTurnSupplier = liveSupplierCost(book, LIVE_MODEL_38, delta)!;
const upstream = new WebSocketServer({ port: 0, maxPayload: 256 * 1024 });
let expectedObservations = 0;
let active = 0,
  peak = 0;
upstream.on("connection", (ws) => {
  active++;
  peak = Math.max(peak, active);
  ws.once("close", () => {
    active--;
  });
  let used = false;
  let highWater = 0;
  const send = (n: number) => {
    if (ws.readyState === WebSocket.OPEN && n > highWater) {
      expectedObservations++;
      highWater = n;
    }
    if (ws.readyState === WebSocket.OPEN)
      ws.send(
        JSON.stringify({
          type: "response.done",
          response: {
            id: `response-${n}`,
            status: "completed",
            usage: {
              input_tokens_details: { audio_tokens: 14 * n, text_tokens: 50 },
              output_tokens_details: { text_tokens: 2 * n, audio_tokens: 0 },
            },
          },
        }),
      );
  };

  ws.on("message", (raw) => {
    const event = JSON.parse(raw.toString());
    if (event.type === "session.update") ws.send(JSON.stringify({ type: "session.updated" }));
    if (event.type === "input_audio_buffer.append" && !used) {
      used = true;
      setTimeout(() => send(1), 20);
      setTimeout(() => send(2), 40);
      setTimeout(() => send(2), 42);
      setTimeout(() => send(1), 44);
    }
    if (event.type === "session.finish") {
      // FinishAndWait flushes remaining usage before session.finished, even
      // when event-loop pressure delays the synthetic response timers.
      if (used) {
        send(1);
        send(2);
        send(2);
        send(1);
      }
      ws.send(JSON.stringify({ type: "session.finished" }));
    }
  });
});
const upstreamPort = (upstream.address() as { port: number }).port;
const server = createServer();
attachLiveBridge(server, {
  secret,
  billing: createLiveBilling(sql, { book: async () => book }),
  toGiay,
  upstream: async () => ({ url: `ws://127.0.0.1:${upstreamPort}`, key: "loopback-fixture" }),
  admit: async ({ userId, model }) => {
    try {
      return await beginWork(sql, { userId, model, provider: "alibaba", lane: "live" });
    } catch (error) {
      if (error instanceof AdmissionBusy) return null;
      throw error;
    }
  },
  drainMs: 1000,
  maxReconnects: 0,
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
const port = (server.address() as { port: number }).port;
const reports = [];
let accepted = 0;
const quantile = (samples: number[], q: number) =>
  Number(samples[Math.min(samples.length - 1, Math.ceil(samples.length * q) - 1)].toFixed(2));
try {
  await sql`insert into token_grants(id,user_id,tokens,left_tokens,price_vnd,expires_at) select 'native-g'||i,'native-u'||i,${stock},${stock},1,now()+interval '30 days' from generate_series(0,299)i`;
  for (const concurrency of [1, 5, 25, 50, 100, 200, 300]) {
    const timings: number[] = [],
      good: number[] = [],
      denied: number[] = [];
    const statuses: Record<string, number> = {};
    peak = 0;
    await Promise.all(
      Array.from(
        { length: concurrency },
        (_, i) =>
          new Promise<void>((resolve, reject) => {
            const began = performance.now();
            let ready = false,
              ended = false;
            const token = signLiveTicket(secret, {
              uid: `native-u${i}`,
              sid: randomUUID(),
              model: LIVE_MODEL_38,
              target: "en",
              source: "",
              audio: false,
              exp: Date.now() + 60000,
            });
            const ws = new WebSocket(
              `ws://127.0.0.1:${port}/live?ticket=${encodeURIComponent(token)}`,
            );
            const timer = setTimeout(() => {
              ws.terminate();
              reject(new Error("fixture live cohort timeout"));
            }, 20000);
            const finish = (status: number) => {
              if (ended) return;
              ended = true;
              clearTimeout(timer);
              const ms = performance.now() - began;
              timings.push(ms);
              (status === 200 ? good : denied).push(ms);
              statuses[status] = (statuses[status] ?? 0) + 1;
              if (status === 200) accepted++;
              resolve();
            };
            ws.on("message", (raw) => {
              const event = JSON.parse(raw.toString());
              if (event.type === "ready" && !ready) {
                ready = true;
                ws.send(Buffer.alloc(3200, 1));
                setTimeout(() => {
                  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stop" }));
                }, 65);
              }
              if (event.type === "error" && ready) {
                clearTimeout(timer);
                ws.terminate();
                reject(new Error("unexpected financial/protocol error in live fixture"));
              }
            });
            ws.once("unexpected-response", (_request, response) => {
              response.resume();
              if (response.statusCode === 429) finish(429);
              else {
                clearTimeout(timer);
                reject(new Error("unexpected HTTP live upgrade status"));
              }
            });
            ws.once("error", (error) => {
              if (!ended) {
                clearTimeout(timer);
                reject(error);
              }
            });
            ws.once("close", (code) => {
              if (code === 4429) finish(429);
              else if (ready && code === 1000) finish(200);
              else if (!ended) {
                clearTimeout(timer);
                reject(new Error(`unexpected live close ${code}`));
              }
            });
          }),
      ),
    );
    timings.sort((a, b) => a - b);
    good.sort((a, b) => a - b);
    denied.sort((a, b) => a - b);
    assert.ok(peak <= 24, "provider/model admission exceeded");
    assert.equal(
      (await sql`select 1 from work_admissions where status in('running','unknown')`).length,
      0,
    );
    const record = {
      concurrency,
      statuses,
      peakUpstreamSockets: peak,
      p50Ms: quantile(timings, 0.5),
      p95Ms: quantile(timings, 0.95),
      p99Ms: quantile(timings, 0.99),
      acceptedP95Ms: good.length ? quantile(good, 0.95) : null,
      rejectedP95Ms: denied.length ? quantile(denied, 0.95) : null,
    };
    reports.push(record);
    console.log(JSON.stringify(record));
  }
  const tickets = await sql`select sum(charged)::int n from run_tickets`;
  assert.equal(Number(tickets[0].n), accepted * 2 * perTurnTokens);
  const grants =
    await sql`select count(*)::int n from token_grants g where left_tokens+(select coalesce(sum(s.charged),0) from token_slices s where s.grant_id=g.id)<>tokens`;
  assert.equal(grants[0].n, 0);
  assert.equal((await sql`select 1 from run_tickets where held<>0 or modal_reserved<>0`).length, 0);
  assert.equal((await sql`select 1 from provider_spend_events where posted_at is null`).length, 0);
  const expense =
    await sql`select sum(calls)::int n,sum(base_vnd)::numeric base from provider_spend`;
  assert.equal(Number(expense[0].n), expectedObservations);
  assert.equal(
    Number((await sql`select count(*)::int n from provider_spend_events`)[0].n),
    expectedObservations,
  );
  assert.ok(Math.abs(Number(expense[0].base) - accepted * 2 * perTurnSupplier) < 1e-6);
  const result = {
    scope:
      "native local WebSocket + real isolated PostgreSQL, synthetic cumulative usage with replays; no GPU/provider/browser audio",
    reports,
    accepted,
    charged: Number(tickets[0].n),
    supplierCalls: Number(expense[0].n),
    expectedObservations,
    ledgerViolations: 0,
    duplicateCharges: 0,
  };
  // Đường ra cấu hình được (máy Codex dùng /workspace/tyzo-results); luôn in ra stdout để lưu cùng log bằng chứng.
  console.log(JSON.stringify(result, null, 2));
  writeFileSync(
    process.env.TYZO_BENCH_OUT ?? "/workspace/tyzo-results/evidence/live-load-results.json",
    JSON.stringify(result, null, 2),
  );
} finally {
  for (const ws of upstream.clients) ws.terminate();
  await new Promise<void>((r) => upstream.close(() => r()));
  await new Promise<void>((r) => server.close(() => r()));
  await db.end();
}
