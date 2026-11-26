import assert from "node:assert/strict";
import { test } from "node:test";
import { failFrom, readJson, readCapped } from "./app-api.server.ts";

test("AZ-005: body cap cancels a chunked request before consuming all input", async () => {
  let reads = 0; let canceled = false;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) { reads++; controller.enqueue(new Uint8Array(32)); }, cancel() { canceled = true; } }, { highWaterMark: 0 });
  const request = new Request("http://fixture.test", { method: "POST", body: stream, duplex: "half" } as RequestInit);
  assert.equal(await readJson(request, 16), null);
  assert.equal(canceled, true);
  assert.ok(reads <= 2);
});
test("DEEP-010: shared webhook reader enforces 256KiB without Content-Length", async () => {
  const request = new Request("http://fixture.test", { method: "POST", body: "x".repeat(256 * 1024 + 1) });
  assert.equal(await readCapped(request, 256 * 1024), null);
});
test("AZ-009: a coded internal 500 never exposes its detail; public 429 preserves retry hint", async () => {
  const original = console.error; const logs: unknown[][] = []; console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    const response = failFrom(Object.assign(new Error("synthetic private database detail"), { status: 500 }));
    assert.equal(response.status, 500);
    assert.equal((await response.json()).error, "Có lỗi, hãy thử lại.");
    assert.equal(JSON.stringify(logs).includes("synthetic private database detail"), false);
    const limited = failFrom(Object.assign(new Error("Thử lại sau."), { status: 429, retryAfter: 60 }));
    assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "60");
  } finally { console.error = original; }
});
