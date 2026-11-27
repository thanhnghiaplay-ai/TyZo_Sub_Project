import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import type { Sql } from "../db.ts";
import { realPgSql } from "../test-sql.ts";
import { chargeAdmittedWith } from "./run-gate.ts";
import { openGiayWith } from "./token-flow.ts";
import { resolveAdmissionWith, withWorkAdmission } from "./work-admission.ts";
import { UncertainUpstreamError } from "./upstream-outcome.ts";
import { requestWithRetry, API } from "../sub/groq.ts";
import {
  recognizeModalWav,
  isTransientModalError,
  ModalHttpError,
} from "../sub/tyzo-modal.server.ts";
import { parseModalPrice } from "../sub/tyzo-modal-price.ts";
import { runAdmittedModalPartWith } from "./tyzo-modal-charge.ts";
import type { PriceBook } from "./run-bill.ts";

let sql: Sql;
let end: (() => Promise<void>) | undefined;
const pgTest = process.env.TYZO_TEST_PG_URL ? test : test.skip;
const originalFetch = globalThis.fetch;
const previousUrl = process.env.TYZO_ASR_URL;
const previousToken = process.env.TYZO_ASR_TOKEN;
const tid = "b7".repeat(12);
const book: PriceBook = {
  rate: 25000,
  desk: { markup: 0, custom: {} },
  rows: [
    { id: "whisper-large-v3-turbo", usdPerHour: 0.04 },
    { id: "chat", usdIn: 0.1, usdOut: 0.1 },
    { id: "tts", usdPerMillionChars: 22 },
  ].map((r) => ({
    usdIn: null,
    usdOut: null,
    usdPerHour: null,
    usdPerMillionChars: null,
    speed: null,
    unlisted: false,
    limits: [],
    contextTokens: null,
    maxCompletionTokens: null,
    maxFile: null,
    ...r,
  })),
};
const gate = () => {
  let release!: () => void;
  const promise = new Promise<void>((r) => {
    release = r;
  });
  return { promise, release };
};
before(async () => {
  const db = await realPgSql();
  if (db) ({ sql, end } = db);
});
after(async () => {
  await end?.();
});
beforeEach(async () => {
  if (!sql) return;
  await sql`delete from work_admissions`;
  await sql`delete from run_tickets`;
  await sql`delete from token_grants`;
  await sql`delete from provider_spend`;
  await sql`insert into token_grants(id,user_id,tokens,left_tokens,price_vnd,expires_at)values('g','u',10000,10000,1,now()+interval '1 day')`;
  await openGiayWith(sql, {
    id: tid,
    userId: "u",
    fileName: "fixture",
    seconds: 600,
    rate: 1,
    hold: 1000,
  });
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (previousUrl === undefined) delete process.env.TYZO_ASR_URL;
  else process.env.TYZO_ASR_URL = previousUrl;
  if (previousToken === undefined) delete process.env.TYZO_ASR_TOKEN;
  else process.env.TYZO_ASR_TOKEN = previousToken;
});
const call = (over: Partial<Parameters<typeof chargeAdmittedWith>[0]> = {}) =>
  chargeAdmittedWith({
    sql,
    book,
    path: "/chat/completions",
    model: "chat",
    chars: 0,
    userId: "u",
    ticketId: tid,
    body: new ArrayBuffer(30),
    cap: 0,
    outCap: 100,
    send: async () => Response.json({ usage: { prompt_tokens: 1, completion_tokens: 1 } }),
    ...over,
  });
const admission = async () =>
  (await sql<{ status: string }>`select status from work_admissions order by created_at desc`)[0]
    .status;
const charged = async () =>
  Number((await sql<{ n: number }>`select coalesce(sum(charged),0)::int n from run_tickets`)[0].n);

pgTest(
  "lost upstream reply keeps capacity and blocks a blind new call until owner evidence",
  async () => {
    await assert.rejects(
      call({
        send: async () => {
          throw new TypeError("fixture reply lost");
        },
      }),
    );
    assert.equal(await admission(), "unknown");
    let sent = 0;
    const blocked = await call({
      send: async () => {
        sent++;
        return Response.json({});
      },
    });
    assert.equal(blocked.kind === "reject" && blocked.status, 409);
    assert.equal(sent, 0);
    const id = (await sql<{ id: string }>`select id from work_admissions where status='unknown'`)[0]
      .id;
    await resolveAdmissionWith(
      sql,
      "fixture-owner",
      id,
      "Verified provider work has ended in fixture logs.",
    );
    assert.equal((await call()).kind, "pass");
  },
);

pgTest("definite 429 releases capacity; ambiguous 500 holds it without charging", async () => {
  assert.equal(
    (await call({ send: async () => new Response(null, { status: 429 }) })).kind,
    "pass",
  );
  assert.equal(await admission(), "done");
  await call({ send: async () => new Response(null, { status: 500 }) });
  assert.equal(await admission(), "unknown");
  assert.equal(await charged(), 0);
});

pgTest("TTS waits for the audio body and observes/debits exactly once", async () => {
  const started = gate();
  let finish!: () => void;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      finish = () => {
        c.enqueue(new TextEncoder().encode("wav"));
        c.close();
      };
    },
  });
  let returned = false;
  const pending = call({
    path: "/audio/speech",
    model: "tts",
    chars: 1,
    send: async () => {
      started.release();
      return new Response(body);
    },
  }).then((x) => {
    returned = true;
    return x;
  });
  await started.promise;
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(returned, false);
  assert.equal(await charged(), 0);
  assert.equal(await admission(), "running");
  finish();
  const result = await pending;
  assert.equal(result.kind, "pass");
  if (result.kind === "pass") assert.equal(await result.response.text(), "wav");
  assert.ok((await charged()) > 0);
  assert.equal(await admission(), "done");
  assert.equal(
    Number((await sql<{ n: number }>`select sum(calls)::int n from provider_spend`)[0].n),
    1,
  );
});

pgTest("TTS body timeout refunds its unused hold and retains uncertain capacity", async () => {
  await assert.rejects(
    call({
      path: "/audio/speech",
      model: "tts",
      chars: 1,
      bodyTimeoutMs: 20,
      send: async () => new Response(new ReadableStream({ pull() {} })),
    }),
  );
  assert.equal(await charged(), 0);
  assert.equal(await admission(), "unknown");
  assert.equal(
    Number(
      (await sql<{ n: number }>`select left_tokens::int n from token_grants where id='g'`)[0].n,
    ),
    9000,
  );
});

pgTest(
  "TTS provider-spend failure rolls back the debit and retains a traceable receipt",
  async () => {
    await sql.query(
      "create function reject_tts_spend() returns trigger language plpgsql as $$begin raise exception 'synthetic spend failure';end;$$;create trigger reject_tts_spend before insert or update on provider_spend for each row execute function reject_tts_spend()",
    );
    try {
      await assert.rejects(
        call({
          path: "/audio/speech",
          model: "tts",
          chars: 1,
          send: async () => new Response("wav"),
        }),
        /synthetic spend failure/,
      );
      assert.equal(await charged(), 0);
      assert.equal((await sql`select 1 from provider_spend`).length, 0);
      assert.equal(await admission(), "done");
      assert.deepEqual(await sql`select provider,model,status from run_gate_calls`, [
        { provider: "groq", model: "tts", status: "mat-phan-hoi" },
      ]);
    } finally {
      await sql.query(
        "drop trigger reject_tts_spend on provider_spend;drop function reject_tts_spend()",
      );
    }
  },
);

pgTest(
  "a paid room request is not replayed after its successful debit but lost client body",
  async () => {
    let sends = 0;
    globalThis.fetch = async () => {
      sends++;
      const result = await call();
      assert.equal(result.kind, "pass");
      return new Response(
        new ReadableStream({
          start(c) {
            c.error(new TypeError("fixture server-to-client body lost"));
          },
        }),
      );
    };
    await assert.rejects(
      requestWithRetry(
        API + "/chat/completions",
        () => ({ method: "POST", headers: { Authorization: "Bearer room" }, body: "{}" }),
        "fixture",
        undefined,
        { blockedUntil: 0 },
        undefined,
        "chat",
        tid,
        (r) => r.json(),
      ),
      /tránh tính phí hai lần/,
    );
    assert.equal(sends, 1);
    assert.equal(await charged(), 4);
  },
);

pgTest("paid room 5xx is not automatically submitted as another paid request", async () => {
  let sends = 0;
  globalThis.fetch = async () => {
    sends++;
    return Response.json({ error: { message: "fixture after COMMIT" } }, { status: 500 });
  };
  await assert.rejects(
    requestWithRetry(
      API + "/chat/completions",
      () => ({ headers: { Authorization: "Bearer room" } }),
      "fixture",
      undefined,
      { blockedUntil: 0 },
      undefined,
      "chat",
      tid,
      (r) => r.json(),
    ),
  );
  assert.equal(sends, 1);
});

pgTest(
  "Modal transport/5xx uncertainty is not blindly retried and occupies its admission",
  async () => {
    process.env.TYZO_ASR_URL = "https://fixture.modal.run";
    process.env.TYZO_ASR_TOKEN = "fixture";
    await sql`update run_tickets set asr_model='tyzo-modal-nhanh',modal_price='{"gpuUsdPerHour":0.8,"overhead":3}' where id=${tid}`;
    let sends = 0;
    globalThis.fetch = async () => {
      sends++;
      throw new TypeError("fixture Modal reply lost");
    };
    const work = () =>
      runAdmittedModalPartWith(
        sql,
        {
          ticket: tid,
          userId: "u",
          model: "tyzo-modal-nhanh",
          partHash: "fixture",
          seconds: 1,
          estimateTokens: () => 10,
        },
        async (price) => {
          const result = await recognizeModalWav(
            new Uint8Array(44),
            "",
            "nhanh",
            0,
            new AbortController().signal,
            parseModalPrice(JSON.parse(price)),
          );
          return { segments: [], tokens: result.usd };
        },
      );
    await assert.rejects(
      work(),
      (error) => error instanceof UncertainUpstreamError && !isTransientModalError(error),
    );
    assert.equal(await admission(), "unknown");
    await assert.rejects(work());
    assert.equal(sends, 1);
    assert.equal(isTransientModalError(new ModalHttpError(429)), true);
    assert.equal(isTransientModalError(new ModalHttpError(500)), false);
  },
);

pgTest("validation errors before dispatch do not leave uncertain capacity", async () => {
  await assert.rejects(
    withWorkAdmission(
      sql,
      { userId: "u", provider: "fixture", model: "x", lane: "modal" },
      async () => {
        throw new Error("fixture validation");
      },
    ),
  );
  assert.equal(await admission(), "done");
});

pgTest("completed history is excluded by the active-admission index", async () => {
  await sql.query(
    "insert into work_admissions(id,user_id,provider,model,lane,status)select left(md5(i::text),24),'history','fixture','x','batch','done'from generate_series(1,100000)i",
  );
  await sql.query("analyze work_admissions");
  const plan = await sql.query<{ "QUERY PLAN": unknown }>(
    "explain(analyze,buffers,format json)select count(*) from work_admissions where lane='batch' and status in('running','unknown')",
  );
  assert.match(JSON.stringify(plan), /Index Only Scan|Index Scan|Bitmap Index Scan/);
});
