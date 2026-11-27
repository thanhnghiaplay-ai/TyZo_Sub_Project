import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import type { Sql } from "../db.ts";
import { realPgSql } from "../test-sql.ts";
import { reserveGateCall, reapGateCalls, releaseGateCall } from "./gate-reserve.ts";
import { chargeWith } from "./run-gate.ts";
import { buyGiayWith, openGiayWith, closeTokenWith } from "./token-flow.ts";
import type { PriceBook } from "./run-bill.ts";

let sql: Sql;
let end: () => Promise<void>;
const TID = "e".repeat(24);
const book: PriceBook = {
  rate: 25000,
  desk: { markup: 0, custom: {} },
  rows: [
    { id: "whisper-large-v3-turbo", usdPerHour: 0.04 },
    { id: "chat", usdIn: 0.1, usdOut: 0.1, contextTokens: 100 },
  ].map((r) => ({
    speed: null,
    usdIn: null,
    usdOut: null,
    usdPerHour: null,
    usdPerMillionChars: null,
    unlisted: false,
    limits: [],
    contextTokens: null,
    maxCompletionTokens: null,
    maxFile: null,
    ...r,
  })),
};
const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const pgTest = process.env.TYZO_TEST_PG_URL ? test : test.skip;
before(async () => {
  if (!process.env.TYZO_TEST_PG_URL) return;
  const db = await realPgSql();
  assert.ok(db, "RE2 acceptance requires local PostgreSQL with independent connections");
  ({ sql, end } = db);
});
after(async () => {
  await end?.();
});
beforeEach(async () => {
  if (!process.env.TYZO_TEST_PG_URL) return;
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
  await sql`delete from room_ledger`;
  await sql`delete from room_accounts`;
  await sql`delete from provider_spend`;
  await sql`insert into room_accounts (user_id, balance) values ('re2', 100000)`;
  await buyGiayWith(sql, "re2", {
    grantId: "g",
    tokens: 1000,
    days: 30,
    price: 1,
    note: "fixture",
  });
  const opened = await openGiayWith(sql, {
    id: TID,
    userId: "re2",
    fileName: "fixture",
    seconds: 600,
    rate: 1,
    hold: 100,
    chatModel: "chat",
  });
  assert.ok("id" in opened);
});
const ticket = async () =>
  (
    await sql<{
      held: number;
      charged: number;
      modal_reserved: string;
      close_wanted: boolean;
    }>`select held, charged, modal_reserved, close_wanted from run_tickets where id = ${TID}`
  )[0];
const call = (extra: Partial<Parameters<typeof chargeWith>[0]> = {}) =>
  chargeWith({
    sql,
    book,
    path: "/chat/completions",
    model: "chat",
    chars: 0,
    userId: "re2",
    ticketId: TID,
    body: new ArrayBuffer(300),
    cap: 0,
    outCap: 1000,
    busyWaitMs: 0,
    send: async () => new Response('{"usage":{"prompt_tokens":100,"completion_tokens":1000}}'),
    ...extra,
  });

pgTest("RE2-001: 10 held versus 100 estimate rejects before upstream", async () => {
  await closeTokenWith(sql, TID, "re2", false);
  await openGiayWith(sql, {
    id: TID + "1",
    userId: "re2",
    fileName: "fixture",
    seconds: 600,
    rate: 1,
    hold: 10,
  });
  const r = await reserveGateCall(sql, { ticketId: TID + "1", userId: "re2", estimate: 100 });
  assert.equal(r.kind, "none");
});
pgTest("RE2-001: invalid estimates fail closed without creating calls", async () => {
  for (const estimate of [NaN, Infinity, -1, 0]) {
    const r = await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate });
    assert.equal(r.kind, "none");
  }
  assert.equal((await sql`select id from run_gate_calls`).length, 0);
});
pgTest("RE2-001: 100 concurrent reservations cannot oversubscribe 100 held", async () => {
  const rs = await Promise.all(
    Array.from({ length: 100 }, () =>
      reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 30 }),
    ),
  );
  const ok = rs.filter((r) => r.kind === "ok");
  assert.equal(ok.length, 3);
  assert.ok(ok.every((r) => r.reserved === 30));
  assert.equal(Number((await ticket()).modal_reserved), 90);
});
pgTest("RE2-006: close intent rejects a new reservation while an old call drains", async () => {
  const first = await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 40 });
  assert.equal(first.kind, "ok");
  assert.equal(await closeTokenWith(sql, TID, "re2", false), null);
  assert.equal((await ticket()).close_wanted, true);
  assert.equal(
    (await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 10 })).kind,
    "none",
  );
});
pgTest("RE2-002: cost above own reservation cannot spend another call's 40", async () => {
  const other = await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 40 });
  assert.equal(other.kind, "ok");
  await call({
    outCap: 6500,
    send: async () => new Response('{"usage":{"prompt_tokens":100,"completion_tokens":9900}}'),
  });
  const t = await ticket();
  assert.ok(t.charged <= 60, `charged ${t.charged} stole another call's hold`);
  assert.ok(t.held >= 40);
  assert.equal(Number(t.modal_reserved), 40);
});
pgTest("RE2-002: reaped late response cannot debit after lease lost", async () => {
  await call({
    send: async () => {
      await sql`update run_gate_calls set heartbeat_at = now() - interval '10 minutes'`;
      await reapGateCalls(sql, TID);
      return new Response('{"usage":{"prompt_tokens":100,"completion_tokens":1000}}');
    },
  });
  assert.equal((await ticket()).charged, 0);
});
pgTest("RE2-003: heartbeat continues while response body is being read", async () => {
  let initial = 0;
  const out = await call({
    ...{ beatMs: 10 },
    send: async () => {
      initial = Number(
        (
          await sql<{
            ts: string;
          }>`select extract(epoch from heartbeat_at)::text as ts from run_gate_calls`
        )[0].ts,
      );
      return new Response(
        new ReadableStream({
          async start(c) {
            await pause(100);
            const latest = Number(
              (
                await sql<{
                  ts: string;
                }>`select extract(epoch from heartbeat_at)::text as ts from run_gate_calls`
              )[0].ts,
            );
            assert.ok(latest > initial, "heartbeat stopped at headers");
            c.enqueue(
              new TextEncoder().encode('{"usage":{"prompt_tokens":100,"completion_tokens":1000}}'),
            );
            c.close();
          },
        }),
      );
    },
  });
  assert.equal(out.kind, "pass");
});
pgTest("RE2-003: failed response body releases into reconciliation", async () => {
  await assert.rejects(
    call({
      send: async () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.error(new Error("body disconnected"));
            },
          }),
        ),
    }),
  );
  assert.equal(Number((await ticket()).modal_reserved), 0);
  assert.equal(
    (await sql<{ status: string }>`select status from run_gate_calls`)[0].status,
    "mat-phan-hoi",
  );
});
pgTest("RE2-002: release replay is a no-op", async () => {
  const a = await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 60 });
  assert.equal(a.kind, "ok");
  if (a.kind !== "ok") return;
  assert.equal(await releaseGateCall(sql, a.callId, "loi"), true);
  assert.equal(await releaseGateCall(sql, a.callId, "loi"), false);
  assert.equal(Number((await ticket()).modal_reserved), 0);
});

pgTest("RE2-002 cross-provider: Modal overrun leaves Groq's 40 reserved", async () => {
  const { runModalPartWith } = await import("./tyzo-modal-charge.ts");
  await sql`update run_tickets set asr_model = 'tyzo-modal-nhanh', modal_price = '{}' where id = ${TID}`;
  const a = await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 40 });
  assert.equal(a.kind, "ok");
  const out = await runModalPartWith(
    sql,
    {
      ticket: TID,
      userId: "re2",
      model: "tyzo-modal-nhanh",
      partHash: "audio",
      seconds: 60,
      estimateTokens: () => 60,
    },
    async () => ({ segments: [], tokens: 90 }),
  );
  assert.equal(out.tokens, 60);
  assert.equal(out.short, 30);
  assert.equal((await ticket()).held, 40);
  assert.equal(Number((await ticket()).modal_reserved), 40);
});

pgTest(
  "RE2-002: settlement replay and rollback retain one debit and one provider observation",
  async () => {
    const { settleGateCall } = await import("./gate-reserve.ts");
    const a = await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 60 });
    assert.equal(a.kind, "ok");
    if (a.kind !== "ok") return;
    const args = {
      callId: a.callId,
      ticketId: TID,
      userId: "re2",
      units: 90,
      base: 25,
      provider: "groq",
      model: "chat",
      rate: 25000,
      reconcile: false,
    };
    await sql.query(
      "create function reject_spend() returns trigger language plpgsql as $$begin raise exception 'injected spend failure'; end$$",
    );
    await sql.query(
      "create trigger reject_spend before insert on provider_spend for each row execute function reject_spend()",
    );
    await assert.rejects(settleGateCall(sql, args), /injected spend failure/);
    assert.equal((await ticket()).charged, 0);
    assert.equal(Number((await ticket()).modal_reserved), 60);
    await sql.query("drop trigger reject_spend on provider_spend");
    const r = await Promise.all(Array.from({ length: 12 }, () => settleGateCall(sql, args)));
    assert.equal(r.filter((x) => !x.replay).length, 1);
    assert.equal((await ticket()).charged, 60);
    const observation = (
      await sql<{
        short_units: string;
        actual_units: string;
        charged_units: string;
        status: string;
      }>`select short_units, actual_units, charged_units, status from run_gate_calls where id = ${a.callId}`
    )[0];
    assert.deepEqual(
      [
        Number(observation.actual_units),
        Number(observation.charged_units),
        Number(observation.short_units),
        observation.status,
      ],
      [90, 60, 30, "can-doi-soat"],
    );
    assert.equal(
      Number((await sql<{ calls: number }>`select calls from provider_spend`)[0].calls),
      1,
    );
  },
);

pgTest("RE2-003: body deadline cancels a stuck stream and releases its budget", async () => {
  let cancelled = false;
  await assert.rejects(
    call({
      ...{ bodyTimeoutMs: 25 },
      send: async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
        ),
    }),
    { name: "TimeoutError" },
  );
  assert.equal(cancelled, true);
  assert.equal(Number((await ticket()).modal_reserved), 0);
});

pgTest("RE2-003: expired heartbeat cannot revive an old call", async () => {
  const { beatGateCall } = await import("./gate-reserve.ts");
  const a = await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 30 });
  assert.equal(a.kind, "ok");
  if (a.kind !== "ok") return;
  await sql`update run_gate_calls set heartbeat_at = now() - interval '10 minutes' where id = ${a.callId}`;
  assert.equal((await beatGateCall(sql, a.callId)).length, 0);
  await reapGateCalls(sql, TID);
  assert.equal(Number((await ticket()).modal_reserved), 0);
});

pgTest(
  "SCALE: 200 contenders across connections obey global/model caps and release replay",
  async () => {
    const { acquireWork, releaseWork } = await import("./work-admission.ts");
    await sql`delete from work_admissions`;
    await sql`delete from room_settings where key = 'work_admission'`;
    const started = Date.now();
    const ids = await Promise.all(
      Array.from({ length: 200 }, (_, i) =>
        acquireWork(sql, { userId: `u${i}`, provider: "groq", model: "chat", lane: "batch" }),
      ),
    );
    const accepted = ids.filter((id): id is string => id !== null);
    assert.equal(accepted.length, 24);
    await Promise.all(accepted.map((id) => releaseWork(sql, id)));
    await Promise.all(accepted.map((id) => releaseWork(sql, id)));
    assert.equal((await sql`select 1 from work_admissions where status = 'running'`).length, 0);
    console.log(
      `Admission: 200 contenders, accepted ${accepted.length}, rejected ${200 - accepted.length}, ${Date.now() - started}ms total`,
    );
  },
);

pgTest(
  "SCALE: per-user limits, independent live lane, expired leases and kill switch",
  async () => {
    const { acquireWork, releaseWork } = await import("./work-admission.ts");
    await sql`delete from work_admissions`;
    await sql`delete from room_settings where key = 'work_admission'`;
    const key = { userId: "u", provider: "groq", model: "chat", lane: "batch" as const };
    const ids = await Promise.all(Array.from({ length: 10 }, () => acquireWork(sql, key)));
    assert.equal(ids.filter(Boolean).length, 2);
    assert.ok(await acquireWork(sql, { ...key, lane: "live" }));
    await sql`update work_admissions set heartbeat_at = now() - interval '10 minutes'`;
    await assert.rejects(
      acquireWork(sql, key),
      /cần đối soát/,
      "unknown work must require evidence, not a capacity retry",
    );
    for (const id of ids) if (id) await releaseWork(sql, id);
    const fresh = await acquireWork(sql, key);
    assert.ok(fresh);
    assert.equal((await sql`select 1 from work_admissions where status = 'unknown'`).length, 1);
    await sql`insert into room_settings (key, value) values ('work_admission', '{"enabled":false}')`;
    assert.equal(await acquireWork(sql, { ...key, userId: "different" }), null);
    await releaseWork(sql, fresh!);
    await sql`delete from room_settings where key = 'work_admission'`;
  },
);

pgTest(
  "SCALE: admitted endpoint returns 429 without invoking upstream, and finishes failed slots",
  async () => {
    const { chargeAdmittedWith } = await import("./run-gate.ts");
    const { withWorkAdmission } = await import("./work-admission.ts");
    await sql`delete from work_admissions`;
    await assert.rejects(
      withWorkAdmission(
        sql,
        { userId: "re2", provider: "groq", model: "chat", lane: "batch" },
        async () => {
          throw new Error("upstream disconnected");
        },
      ),
      /upstream disconnected/,
    );
    assert.equal((await sql`select 1 from work_admissions where status = 'running'`).length, 0);
    await sql`insert into room_settings (key, value) values ('work_admission', '{"enabled":false}')`;
    let sent = false;
    const out = await chargeAdmittedWith({
      sql,
      book,
      path: "/chat/completions",
      model: "chat",
      chars: 0,
      userId: "re2",
      ticketId: TID,
      body: new ArrayBuffer(300),
      cap: 0,
      send: async () => {
        sent = true;
        return new Response("{}");
      },
    });
    assert.equal(out.kind === "reject" && out.status, 429);
    assert.equal(sent, false);
    await sql`delete from room_settings where key = 'work_admission'`;
  },
);

pgTest("RE2-002: Modal late result retains actual cost evidence after reaping", async () => {
  const { runModalPartWith } = await import("./tyzo-modal-charge.ts");
  await sql`update run_tickets set asr_model = 'tyzo-modal-nhanh', modal_price = '{}' where id = ${TID}`;
  let sent!: () => void;
  let finish!: () => void;
  const started = new Promise<void>((r) => {
    sent = r;
  });
  const wait = new Promise<void>((r) => {
    finish = r;
  });
  const args = {
    ticket: TID,
    userId: "re2",
    model: "tyzo-modal-nhanh",
    partHash: "late-audio",
    seconds: 60,
    estimateTokens: () => 30,
  };
  const old = runModalPartWith(sql, args, async () => {
    sent();
    await wait;
    return { segments: [], tokens: 50 };
  });
  await started;
  await sql`update run_modal_parts set heartbeat_at = now() - interval '10 minutes'`;
  await runModalPartWith(sql, args, async () => ({ segments: [], tokens: 10 }));
  finish();
  const late = await old;
  assert.equal(late.tokens, 0);
  assert.equal(late.short, 50);
  assert.equal((await ticket()).charged, 10);
  const evidence = await sql<{
    actual_tokens: number;
    charged_tokens: number;
    short_tokens: number;
  }>`
    select actual_tokens, charged_tokens, short_tokens from run_modal_settlements where status = 'can-doi-soat'`;
  assert.deepEqual(
    evidence.map((x) => [
      Number(x.actual_tokens),
      Number(x.charged_tokens),
      Number(x.short_tokens),
    ]),
    [[50, 0, 50]],
  );
});

pgTest(
  "RE2-002 root: unreserved charging paths cannot consume another call's reservation",
  async () => {
    const { chargeTokenWith } = await import("./token-flow.ts");
    const other = await reserveGateCall(sql, { ticketId: TID, userId: "re2", estimate: 40 });
    assert.equal(other.kind, "ok");
    assert.equal(await chargeTokenWith(sql, TID, "re2", 100), 60);
    assert.equal((await ticket()).held, 40);
    assert.equal(Number((await ticket()).modal_reserved), 40);
  },
);

pgTest(
  "SCALE: expired live work retains admission until its late completion releases it",
  async () => {
    const { withWorkAdmission, AdmissionBusy } = await import("./work-admission.ts");
    await sql`delete from work_admissions`;
    await sql`insert into room_settings(key,value)values('work_admission','{"perUser":1}') on conflict(key)do update set value=excluded.value`;
    let finish!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((r) => {
      entered = r;
    });
    const wait = new Promise<void>((r) => {
      finish = r;
    });
    const key = {
      userId: "capacity-user",
      provider: "groq",
      model: "chat",
      lane: "batch" as const,
    };
    const running = withWorkAdmission(sql, key, async () => {
      entered();
      await wait;
    });
    await started;
    try {
      await sql`update work_admissions set heartbeat_at=now()-interval '10 minutes'`;
      await assert.rejects(
        withWorkAdmission(sql, key, async () => assert.fail("must not call provider")),
        AdmissionBusy,
      );
    } finally {
      finish();
      await running;
    }
    await withWorkAdmission(sql, key, async () => undefined);
    assert.equal(
      (await sql`select 1 from work_admissions where status in ('running','unknown')`).length,
      0,
    );
    await sql`delete from room_settings where key='work_admission'`;
  },
);
