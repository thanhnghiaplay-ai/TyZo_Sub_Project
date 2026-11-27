/** Local synthetic load only. No GPU, no production endpoints, no network provider requests. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import type { Sql } from "../src/lib/db.ts";
import { realPgSql } from "../src/lib/test-sql.ts";
import { chargeAdmittedWith } from "../src/lib/billing/run-gate.ts";
import { AdmissionBusy, withWorkAdmission } from "../src/lib/billing/work-admission.ts";
import { createLiveBilling } from "../src/lib/live/live-billing.ts";
import type { PriceBook } from "../src/lib/billing/run-bill.ts";

const url = new URL(process.env.TYZO_TEST_PG_URL ?? "postgresql://invalid");
assert.equal(url.hostname, "127.0.0.1", "Only disposable loopback fixtures may be benchmarked");
assert.equal(url.port, "55439");
const db = await realPgSql();
assert.ok(db);
let statements = 0;
function counted(raw: Sql): Sql {
  const measured = (async (strings: TemplateStringsArray, ...values: unknown[]) => { statements++; return raw(strings, ...values); }) as Sql;
  measured.query = (async (text: string, values?: unknown[]) => { statements++; return raw.query(text, values); }) as Sql["query"];
  measured.begin = (fn) => raw.begin!((tx) => fn(counted(tx)));
  return measured;
}
const sql = counted(db.sql);
const book: PriceBook = { rate: 25000, desk: { markup: 0, custom: {} }, rows: [
  { id: "whisper-large-v3-turbo", usdPerHour: 0.04 },
  { id: "chat", usdIn: 0.1, usdOut: 0.1 },
].map((r) => ({ speed: null, usdIn: null, usdOut: null, usdPerHour: null, usdPerMillionChars: null, unlisted: false, limits: [], contextTokens: null, maxCompletionTokens: null, maxFile: null, ...r })) };
const liveBilling=createLiveBilling(sql,{book:async()=>({rate:book.rate,rows:[]})});
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reports = [];
const quantile = (sorted: number[], q: number) => Number(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1)].toFixed(2));
try {
  await sql`insert into token_grants(id,user_id,tokens,left_tokens,price_vnd,expires_at)
    select 'g'||i,'u'||i,10000,0,1,now()+interval '30 days' from generate_series(0,299) i`;
  await sql`insert into run_tickets(id,user_id,file_name,held,unit,status)
    select left(md5('ticket'||i),24),'u'||i,'synthetic',10000,'token','dang-giu' from generate_series(0,299) i`;
  await sql`insert into token_slices(ticket_id,grant_id,left_tokens,expires_at)
    select left(md5('ticket'||i),24),'g'||i,10000,now()+interval '30 days' from generate_series(0,299) i`;
  const ids = (await sql<{ id: string; user_id: string }>`select id,user_id from run_tickets order by user_id`);
  for (const mode of ["batch", "live", "mixed"] as const) {
    for (const concurrency of [1, 5, 25, 50, 100, 200, 300]) {
      const samples: number[] = [];
      const statuses: Record<string, number> = {};
      const successTimes: number[] = [];
      const rejectedTimes: number[] = [];
      const queryStart = statements;
      const start = performance.now();
      await Promise.all(Array.from({ length: concurrency }, async (_, i) => {
        const began = performance.now();
        let status = 200;
        const lane = mode === "mixed" ? i % 2 ? "live" : "batch" : mode;
        if (lane === "batch") {
          const result = await chargeAdmittedWith({ sql, book, path: "/chat/completions", model: "chat", chars: 0,
            ticketId: ids[i].id, userId: ids[i].user_id, body: new ArrayBuffer(300), cap: 0, outCap: 1000,
            send: async () => { await pause(40); return new Response('{"usage":{"prompt_tokens":100,"completion_tokens":1000}}'); } });
          if (result.kind === "reject") status = result.status;
        } else {
          try { await withWorkAdmission(sql, { userId: ids[i].user_id, provider: "alibaba", model: "fixture-live", lane: "live" }, async () => {
            await pause(40);
            await liveBilling.spend!({id:`fixture-live:${mode}:${concurrency}:${i}`,userId:ids[i].user_id,model:"fixture-live",base:1.25});
            await liveBilling.charge({userId:ids[i].user_id,ticketId:ids[i].id,cost:10,base:1.25});
          }); }
          catch (error) { if (error instanceof AdmissionBusy) status = 429; else throw error; }
        }
        statuses[status] = (statuses[status] ?? 0) + 1;
        const latency = performance.now() - began;
        samples.push(latency);
        (status === 200 ? successTimes : rejectedTimes).push(latency);
      }));
      const elapsed = performance.now() - start;
      const requestStatements = statements-queryStart;
      successTimes.sort((a,b)=>a-b); rejectedTimes.sort((a,b)=>a-b);
      samples.sort((a,b) => a-b);
      const ledger = await sql<{ bad: number }>`select count(*)::int as bad from run_tickets t where held < 0 or modal_reserved < 0 or modal_reserved > held
        or charged <> (select coalesce(sum(charged),0) from token_slices s where s.ticket_id=t.id)
        or held <> (select coalesce(sum(left_tokens),0) from token_slices s where s.ticket_id=t.id)`;
      assert.equal(ledger[0].bad, 0);
      assert.equal((await sql`select 1 from work_admissions where status='running'`).length, 0);
      const record = { mode: mode === "live" ? "live-billing-simulation-no-audio" : mode, concurrency, fixtureUpstreamMs: 40,
        p50Ms: quantile(samples,.50), p95Ms: quantile(samples,.95), p99Ms: quantile(samples,.99), statuses, acceptedP95Ms: successTimes.length ? quantile(successTimes,.95) : null, rejectedP95Ms: rejectedTimes.length ? quantile(rejectedTimes,.95) : null, acceptedPerSecond: Number(((statuses[200]??0)/elapsed*1000).toFixed(2)),
        elapsedMs: Number(elapsed.toFixed(2)), sqlStatements: requestStatements, ledgerViolations: ledger[0].bad };
      reports.push(record); console.log(JSON.stringify(record));
    }
  }
  assert.equal((await sql`select 1 from run_tickets where modal_reserved<>0`).length, 0);
  const observed = Number((await sql<{ n: number }>`select ((select count(*) from run_gate_calls where observed_at is not null)+(select count(*) from provider_spend_events))::int n`)[0].n);
  const spends = Number((await sql<{ n: number }>`select coalesce(sum(calls),0)::int n from provider_spend`)[0].n);
  assert.equal(observed, spends);
  assert.equal((await sql`select 1 from provider_spend_events where posted_at is null`).length,0);
  writeFileSync('/workspace/tyzo-results/evidence/load-results.json', JSON.stringify({ postgres: '17.12 local', poolMax: 12, noGpu: true, upstream: 'synthetic', scenarios: reports, observed, spends },null,2));
} finally { await db.end(); }
