import assert from "node:assert/strict";
import { after, before, beforeEach, mock, test } from "node:test";
import type { Sql } from "../db.ts";
import { realPgSql } from "../test-sql.ts";
import type { PriceBook } from "./run-bill.ts";
import { closeTokenWith } from "./token-flow.ts";
import { reapGateCalls } from "./gate-reserve.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
let requests = 0;
let submits = 0;
let state = "SUCCEEDED";
let disconnect = false;
let submitStatus = 200;
let rejectionHasTask = false;
const model = "qwen-audio-3.0-asr-flash-filetrans";
const tid = "a".repeat(24);
const rows = [
  { id: "whisper-large-v3-turbo", usdPerHour: 0.04 },
  { id: model, usdPerHour: 0.004 },
].map((r) => ({
  usdIn: null,
  usdOut: null,
  usdPerMillionChars: null,
  speed: null,
  unlisted: false,
  limits: [],
  contextTokens: null,
  maxCompletionTokens: null,
  maxFile: null,
  ...r,
}));
const book: PriceBook = { rate: 25000, desk: { markup: 0, custom: {} }, rows };
mock.module("../db.ts", { namedExports: { getSql: async () => sql } });
mock.module("../guard.server.ts", {
  namedExports: { requireOpenAccount: async () => {}, takeRate: async () => {} },
});
mock.module("../service-status.server.ts", {
  namedExports: { requireServiceOpen: async () => {} },
});
mock.module("../run-board.server.ts", { namedExports: { loadPriceBook: async () => book } });
mock.module("../sub/alibaba-board.server.ts", {
  namedExports: { loadAlibabaRows: async () => rows },
});
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  requests++;
  if (String(url).includes("/services/")) {
    submits++;
    if (disconnect) throw new TypeError("fixture reply lost");
    if (submitStatus !== 200)
      return Response.json(
        {
          message: "synthetic rejected submission",
          ...(rejectionHasTask ? { output: { task_id: `fixture-task-${submits}` } } : {}),
        },
        { status: submitStatus },
      );
    return Response.json({ output: { task_id: `fixture-task-${submits}` } });
  }
  return Response.json(
    String(url).includes("/tasks/")
      ? {
          output: {
            task_status: state,
            results: [
              {
                transcription_url:
                  "https://fixture.oss-ap-southeast-1.aliyuncs.com/transcript.json",
              },
            ],
          },
        }
      : {
          properties: { original_duration_in_milliseconds: 60000 },
          transcripts: [{ sentences: [{ text: "fixture", begin_time: 0, end_time: 60000 }] }],
        },
  );
};
before(async () => {
  const db = await realPgSql();
  if (db) ({ sql, end } = db);
});
after(async () => {
  globalThis.fetch = originalFetch;
  await end?.();
});
beforeEach(async () => {
  requests = 0;
  submits = 0;
  state = "SUCCEEDED";
  disconnect = false;
  submitStatus = 200;
  rejectionHasTask = false;
  if (!sql) return;
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
  await sql`delete from provider_spend`;
  await sql`delete from work_admissions`;
  await sql`insert into room_settings(key,value) values('alibaba_key','non-live-transport-fixture-only') on conflict(key) do nothing`;
  await sql`insert into token_grants(id,user_id,tokens,left_tokens,price_vnd,expires_at)values('g','u',1000,0,1,now()+interval '30 days')`;
  await sql`insert into run_tickets(id,user_id,file_name,held,unit,status,seconds)values(${tid},'u','fixture',1000,'token','dang-giu',60)`;
  await sql`insert into token_slices(ticket_id,grant_id,left_tokens)values(${tid},'g',1000)`;
});
const start = async (url = "https://media.example.invalid/fixture.wav") => {
  const { runAliFiletrans } = await import("../ali-filetrans.server.ts");
  const queued = await runAliFiletrans("u", {
    op: "submit",
    key: "room",
    ticketId: tid,
    url,
    language: "en",
  });
  assert.equal(queued.state, "queued");
  return queued.state === "queued" ? queued.taskId : "";
};
const finish = async (taskId: string, user = "u", ticketId = tid) => {
  const { runAliFiletrans } = await import("../ali-filetrans.server.ts");
  return runAliFiletrans(user, { op: "status", key: "room", taskId, ticketId });
};

test("ASYNC-P0: duplicate submit/status returns one upstream job, one debit and one spend", async (t) => {
  if (!sql) return t.skip("Local PostgreSQL fixture required");
  const task = await start();
  assert.equal(await start(), task);
  assert.equal(submits, 1);
  assert.equal((await finish(task)).state, "done");
  const charged = Number((await sql`select charged from run_tickets where id=${tid}`)[0].charged);
  await Promise.all(Array.from({ length: 20 }, () => finish(task)));
  assert.equal(
    Number((await sql`select charged from run_tickets where id=${tid}`)[0].charged),
    charged,
  );
  assert.equal(charged, 8);
  assert.equal(Number((await sql`select sum(calls)::int n from provider_spend`)[0].n), 1);
});

test("ASYNC-P0: unknown or foreign task/receipt is rejected before contacting provider", async (t) => {
  if (!sql) return t.skip("Local PostgreSQL fixture required");
  const task = await start();
  const n = requests;
  await assert.rejects(finish(task, "other"), /hồ sơ sở hữu/);
  await assert.rejects(finish(task, "u", "b".repeat(24)), /hồ sơ sở hữu/);
  await assert.rejects(finish("legacy-job-without-mapping"), /hồ sơ sở hữu/);
  assert.equal(requests, n);
});

test("ASYNC-P0: durable queued job retains budget beyond a web request lease, then drains close", async (t) => {
  if (!sql) return t.skip("Local PostgreSQL fixture required");
  const task = await start();
  await sql`update run_gate_calls set heartbeat_at=now()-interval '10 minutes'`;
  await reapGateCalls(sql, tid);
  assert.equal(
    Number((await sql`select modal_reserved from run_tickets where id=${tid}`)[0].modal_reserved),
    8,
  );
  assert.equal(await closeTokenWith(sql, tid, "u", false), null);
  await finish(task);
  const ticket = (await sql`select held,charged,status from run_tickets where id=${tid}`)[0];
  assert.deepEqual([ticket.held, ticket.charged, ticket.status], [0, 8, "da-tru"]);
});

test("ASYNC-P0: lost submission response cannot automatically submit duplicate work", async (t) => {
  if (!sql) return t.skip("Local PostgreSQL fixture required");
  disconnect = true;
  await assert.rejects(start(), /Không kết nối/);
  await assert.rejects(start(), /đang gửi hoặc cần đối soát/);
  assert.equal(submits, 1);
  assert.equal((await sql`select state from run_async_asr_jobs`)[0].state, "unknown");
  assert.equal(await closeTokenWith(sql, tid, "u", false), null);
});

test("ASYNC-P0: known failed job releases once; response after force-close only records reconciliation", async (t) => {
  if (!sql) return t.skip("Local PostgreSQL fixture required");
  const failed = await start();
  state = "FAILED";
  await assert.rejects(finish(failed), /thất bại/);
  assert.equal(
    Number((await sql`select modal_reserved from run_tickets where id=${tid}`)[0].modal_reserved),
    0,
  );
  state = "SUCCEEDED";
  const late = await start();
  await closeTokenWith(sql, tid, "u", false, { force: true });
  await finish(late);
  assert.equal(Number((await sql`select charged from run_tickets where id=${tid}`)[0].charged), 0);
  const receipt = (
    await sql`select short_units,status from run_gate_calls where observed_at is not null`
  )[0];
  assert.deepEqual([Number(receipt.short_units), receipt.status], [8, "can-doi-soat"]);
});

test("ASYNC-P0: definitive submission rejection releases budget and allows a corrected retry", async (t) => {
  if (!sql) return t.skip("Local PostgreSQL fixture required");
  for (const status of [400, 401, 403, 404, 413, 415, 422, 429]) {
    submitStatus = status;
    await assert.rejects(start());
    assert.equal(
      (await sql`select state from run_async_asr_jobs order by created_at desc limit 1`)[0].state,
      "failed",
    );
    assert.equal(
      Number((await sql`select modal_reserved from run_tickets where id=${tid}`)[0].modal_reserved),
      0,
    );
  }
  submitStatus = 200;
  const task = await start();
  await finish(task);
  assert.equal(Number((await sql`select charged from run_tickets where id=${tid}`)[0].charged), 8);
});

test("ASYNC-P0: ambiguous timeout or server failure retains uncertainty and cannot auto-resubmit", async (t) => {
  if (!sql) return t.skip("Local PostgreSQL fixture required");
  for (const status of [408, 500]) {
    submitStatus = status;
    const url = `https://media.example.invalid/uncertain-${status}.wav`;
    await assert.rejects(start(url));
    await assert.rejects(start(url), /đang gửi hoặc cần đối soát/);
  }
  assert.equal(submits, 2);
  assert.equal(
    Number((await sql`select count(*)::int n from run_async_asr_jobs where state='unknown'`)[0].n),
    2,
  );
  assert.equal(
    Number((await sql`select modal_reserved from run_tickets where id=${tid}`)[0].modal_reserved),
    16,
  );
});

test("ASYNC-P0: an error response containing a task ID retains that owned task for reconciliation", async (t) => {
  if (!sql) return t.skip("Local PostgreSQL fixture required");
  submitStatus = 500;
  rejectionHasTask = true;
  await assert.rejects(start());
  const job = (await sql`select state,task_id from run_async_asr_jobs`)[0];
  assert.equal(job.state, "unknown");
  assert.equal(job.task_id, "fixture-task-1");
  assert.equal(await start(), "fixture-task-1");
  assert.equal(submits, 1);
  submitStatus = 200;
  await finish("fixture-task-1");
  assert.equal(Number((await sql`select charged from run_tickets where id=${tid}`)[0].charged), 8);
});
