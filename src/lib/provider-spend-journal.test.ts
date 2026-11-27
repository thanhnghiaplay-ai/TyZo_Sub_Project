import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { realPgSql } from "./test-sql.ts";
import type { Sql } from "./db.ts";
import { recordSpendDurablyWith, drainSpendJournal } from "./provider-spend-journal.ts";
import { spendSummaryWith } from "./provider-spend.ts";
import { createLiveBilling } from "./live/live-billing.ts";
let sql: Sql;
let end: (() => Promise<void>) | undefined;
const pgTest = process.env.TYZO_TEST_PG_URL ? test : test.skip;
before(async () => {
  const db = await realPgSql();
  if (db) ({ sql, end } = db);
});
after(async () => {
  await end?.();
});
beforeEach(async () => {
  if (sql) {
    await sql`delete from provider_spend_events`;
    await sql`delete from provider_spend`;
  }
});
const input = {
  id: "fixture-event",
  provider: "alibaba",
  model: "fixture",
  baseVnd: 0.4,
  rate: 25000,
};
pgTest(
  "fractional supplier cost and twenty competing replays yield one posted observation",
  async () => {
    const records = await Promise.all(
      Array.from({ length: 20 }, () => recordSpendDurablyWith(sql, input)),
    );
    assert.equal(records.filter((r) => !r.duplicate).length, 1);
    const rows = await sql<{
      calls: number;
      base_vnd: string;
      usd_micro: string;
    }>`select calls,base_vnd,usd_micro from provider_spend`;
    assert.deepEqual(
      rows.map((r) => [r.calls, Number(r.base_vnd), Number(r.usd_micro)]),
      [[1, 0.4, 16]],
    );
    const sum = await spendSummaryWith(sql, "1 day");
    assert.equal(sum.total.calls, 1);
    assert.equal(sum.pending, 0);
    assert.equal(sum.total.usd, 0.000016);
    await assert.rejects(recordSpendDurablyWith(sql, { ...input, baseVnd: 100 }), /số liệu khác/);
    assert.equal((await spendSummaryWith(sql, "1 day")).total.calls, 1);
  },
);
pgTest(
  "live aggregate SQL fault keeps a durable visible pending cost; concurrent replay posts once",
  async () => {
    await sql.query(
      "create function cost_fault() returns trigger language plpgsql as $$begin raise exception 'synthetic aggregate fault';end;$$;create trigger cost_fault before insert or update on provider_spend for each row execute function cost_fault()",
    );
    try {
      const billing = createLiveBilling(sql, { book: async () => ({ rate: 25000, rows: [] }) });
      const out = await billing.spend!({
        id: "live-fixture",
        userId: "fixture",
        model: "qwen3-livetranslate-flash",
        base: 100,
      });
      assert.ok(out && "pending" in out && out.pending);
      const pending = await sql`select posted_at,tries,last_error_code from provider_spend_events`;
      assert.equal(pending.length, 1);
      assert.equal(pending[0].posted_at, null);
      assert.equal(pending[0].tries, 1);
      assert.equal(pending[0].last_error_code, "P0001");
      const sum = await spendSummaryWith(sql, "1 day");
      assert.deepEqual(sum.total, { calls: 1, vnd: 100, usd: 0.004 });
      assert.equal(sum.pending, 1);
    } finally {
      await sql.query("drop trigger cost_fault on provider_spend;drop function cost_fault()");
    }
    const flushed = await Promise.all(Array.from({ length: 10 }, () => drainSpendJournal(sql)));
    assert.equal(
      flushed.reduce((s, r) => s + r.posted, 0),
      1,
    );
    const sum = await spendSummaryWith(sql, "1 day");
    assert.deepEqual(sum.total, { calls: 1, vnd: 100, usd: 0.004 });
    assert.equal(sum.pending, 0);
    assert.deepEqual(await drainSpendJournal(sql), { posted: 0, pending: 0 });
  },
);
pgTest(
  "posting bookkeeping failure rolls back the aggregate while retaining the observation",
  async () => {
    await sql.query(
      "create function receipt_fault() returns trigger language plpgsql as $$begin if new.posted_at is not null then raise exception 'synthetic receipt fault';end if;return new;end;$$;create trigger receipt_fault before update on provider_spend_events for each row execute function receipt_fault()",
    );
    try {
      assert.equal((await recordSpendDurablyWith(sql, input)).pending, true);
      assert.equal((await sql`select * from provider_spend`).length, 0);
      assert.equal((await spendSummaryWith(sql, "1 day")).total.calls, 1);
    } finally {
      await sql.query(
        "drop trigger receipt_fault on provider_spend_events;drop function receipt_fault()",
      );
    }
    assert.equal((await drainSpendJournal(sql)).posted, 1);
    assert.equal((await spendSummaryWith(sql, "1 day")).total.calls, 1);
  },
);
pgTest(
  "failure to persist an observation is propagated and never silently replaced by an aggregate",
  async () => {
    await sql.query(
      "create function observation_fault() returns trigger language plpgsql as $$begin raise exception 'synthetic observation fault';end;$$;create trigger observation_fault before insert on provider_spend_events for each row execute function observation_fault()",
    );
    try {
      await assert.rejects(recordSpendDurablyWith(sql, input), /synthetic observation fault/);
      assert.equal((await sql`select * from provider_spend_events`).length, 0);
      assert.equal((await sql`select * from provider_spend`).length, 0);
    } finally {
      await sql.query(
        "drop trigger observation_fault on provider_spend_events;drop function observation_fault()",
      );
    }
  },
);
pgTest("bounded replay rejects invalid limits without touching observations", async () => {
  for (const limit of [0, 101, NaN, 1.5]) await assert.rejects(drainSpendJournal(sql, limit));
  for (const baseVnd of [NaN, -1, Infinity])
    await assert.rejects(recordSpendDurablyWith(sql, { ...input, baseVnd }));
  assert.equal((await sql`select * from provider_spend_events`).length, 0);
});
