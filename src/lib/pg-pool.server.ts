import { Pool, type PoolConfig } from "pg";

/** A database disconnect must fail queries, without becoming an uncaught event. */
export function createPgPool(config: PoolConfig): Pool {
  const pool = new Pool({ connectionTimeoutMillis: 10_000, ...config });
  const reported = new WeakSet<Error>();
  const report = (error: Error & { code?: string }) => {
    if (reported.has(error)) return;
    reported.add(error);
    // Driver messages can contain connection details; log only a bounded code.
    const code = /^[A-Z0-9_]{1,30}$/.test(error.code ?? "") ? error.code : "CONNECTION_ERROR";
    console.error(`[db] connection interrupted (${code})`);
  };
  pool.on("error", report);
  // Pool's idle listener is removed during checkout. A disconnect while an
  // application callback awaits other work must also have an error listener.
  // The driver still rejects queries/COMMIT; transactions are never replayed.
  pool.on("connect", (client) => client.on("error", report));
  return pool;
}
