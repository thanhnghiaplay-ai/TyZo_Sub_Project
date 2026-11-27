import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { Pool } from "pg";
import { createPgPool, withPgTransaction } from "./pg-pool.server.ts";

const connectionString = process.env.TYZO_TEST_PG_URL;

test(
  "database disconnects reject work and the pool reconnects without replay",
  {
    skip: !connectionString,
    timeout: 15_000,
  },
  async () => {
    const control = new Pool({ connectionString });
    const pool = createPgPool({ connectionString, max: 1 });
    try {
      const idle = await pool.connect();
      const idlePid = (await idle.query("select pg_backend_pid() pid")).rows[0].pid;
      idle.release();
      const idleError = once(pool, "error");
      await control.query("select pg_terminate_backend($1)", [idlePid]);
      await idleError;
      assert.equal((await pool.query("select 1 value")).rows[0].value, 1);

      const active = await pool.connect();
      try {
        await active.query("BEGIN");
        await active.query("create temporary table rollback_probe(id int)");
        const pid = (await active.query("select pg_backend_pid() pid")).rows[0].pid;
        const activeError = once(active, "error");
        await control.query("select pg_terminate_backend($1)", [pid]);
        await activeError;
        await assert.rejects(active.query("COMMIT"));
      } finally {
        active.release(true);
      }
      assert.equal((await pool.query("select 2 value")).rows[0].value, 2);
    } finally {
      await pool.end();
      await control.end();
    }
  },
);

test(
  "pool checkout has a finite deadline while every connection is occupied",
  {
    skip: !connectionString,
    timeout: 15_000,
  },
  async () => {
    const pool = createPgPool({ connectionString, max: 1, connectionTimeoutMillis: 100 });
    try {
      const held = await pool.connect();
      try {
        await assert.rejects(pool.query("select 1"), /timeout|timed out/i);
      } finally {
        held.release();
      }
      assert.equal((await pool.query("select 3 value")).rows[0].value, 3);
    } finally {
      await pool.end();
    }
  },
);

test("RE4-002: abort drops a blocked PostgreSQL connection and releases its transaction lock", {
  skip: !connectionString,
  timeout: 5_000,
}, async () => {
  const pool = createPgPool({ connectionString, max: 1 });
  try {
    const controller = new AbortController();
    let backend!: () => void;
    const locked = new Promise<void>((resolve) => (backend = resolve));
    const running = withPgTransaction(pool, async (conn) => {
      await conn.query("set local statement_timeout = '600ms'");
      await conn.query("select pg_advisory_xact_lock(84201919)");
      backend();
      await conn.query("select pg_sleep(20)");
    }, controller.signal);
    await locked;
    controller.abort();
    await assert.rejects(running);
    await withPgTransaction(pool, async (conn) => {
      await conn.query("set local statement_timeout = '2s'");
      await conn.query("select pg_advisory_xact_lock(84201919)");
    });
  } finally {
    await pool.end();
  }
});

test("RE4-002: canceled checkout runs no SQL even when a connection becomes free", {
  skip: !connectionString,
  timeout: 5_000,
}, async () => {
  const pool = createPgPool({ connectionString, max: 1, connectionTimeoutMillis: 500 });
  try {
    const held = await pool.connect();
    const controller = new AbortController();
    const queued = withPgTransaction(pool, async () => assert.fail("ran canceled SQL"), controller.signal);
    controller.abort();
    held.release();
    await assert.rejects(queued, { name: "AbortError" });
    assert.equal((await pool.query("select 1 as ok")).rows[0].ok, 1);
  } finally {
    await pool.end();
  }
});
