import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequestBodyLimiter,
  createRequestStreamLimiter,
  readRequestBytes,
  requestBodyFailure,
  requestBodyLimit,
  RequestBodyError,
  withRequestBody,
} from "./request-body.server.ts";

const policy = { maxActive: 2, maxRetainedBytes: 60, timeoutMs: 1000 };
const gate = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};
function request(bytes: number, declared = true) {
  return new Request("http://fixture.test", {
    method: "POST",
    body: new Uint8Array(bytes),
    headers: declared ? { "content-length": String(bytes) } : {},
  });
}
const status = (code: number) => (error: unknown) =>
  error instanceof RequestBodyError && error.status === code;

test(
  "chunked oversized body is stopped early even when cancel never settles",
  { timeout: 1000 },
  async () => {
    let pulled = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulled++;
          controller.enqueue(new Uint8Array(4));
        },
        cancel() {
          cancelled = true;
          return new Promise<void>(() => {});
        },
      },
      { highWaterMark: 0 },
    );
    const input = new Request("http://fixture.test", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);
    await assert.rejects(readRequestBytes(input, 8), status(413));
    assert.equal(pulled, 3);
    assert.equal(cancelled, true);
  },
);

test("declared length cannot bypass the byte cap; invalid lengths fail before reading", async () => {
  await assert.rejects(
    readRequestBytes(
      new Request("http://fixture.test", {
        method: "POST",
        body: new Uint8Array(9),
        headers: { "content-length": "1" },
      }),
      8,
    ),
    status(413),
  );
  for (const length of ["-1", "bad", "1.5", "9999999999999999999999"]) {
    await assert.rejects(
      readRequestBytes(
        new Request("http://fixture.test", {
          method: "POST",
          body: "x",
          headers: { "content-length": length },
        }),
        8,
      ),
      status(400),
    );
  }
  await assert.rejects(readRequestBytes(request(9), 8), status(413));
  assert.deepEqual(new Uint8Array(await readRequestBytes(request(8), 8)), new Uint8Array(8));
});

test("capacity is held through the handler and a rejected request is never read or executed", async () => {
  const limit = createRequestBodyLimiter(policy);
  const hold = gate();
  const entered = gate();
  let active = 0;
  const work = () =>
    limit(request(1), 8, async () => {
      if (++active === 2) entered.release();
      await hold.promise;
    });
  const first = work();
  const second = work();
  await entered.promise;
  let read = false;
  let ran = false;
  let cancelled = false;
  const input = new Request("http://fixture.test", {
    method: "POST",
    duplex: "half",
    body: new ReadableStream(
      {
        pull() {
          read = true;
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 },
    ),
  } as RequestInit);
  try {
    await assert.rejects(
      limit(input, 8, async () => {
        ran = true;
      }),
      status(429),
    );
    assert.equal(read, false);
    assert.equal(ran, false);
    assert.equal(cancelled, true);
  } finally {
    hold.release();
    await Promise.all([first, second]);
  }
  assert.equal(await limit(request(1), 8, async () => "next"), "next");
});

test("aggregate retained-byte credit handles declared and unknown lengths and every failure releases it", async () => {
  const limit = createRequestBodyLimiter({ ...policy, maxActive: 10, maxRetainedBytes: 12 });
  const hold = gate();
  const entered = gate();
  const first = limit(request(3), 8, async () => {
    entered.release();
    await hold.promise;
  });
  await entered.promise;
  try {
    await assert.rejects(
      limit(request(2), 8, async () => assert.fail("must not execute")),
      status(429),
    );
    await assert.rejects(
      limit(request(2, false), 8, async () => assert.fail("must not execute")),
      status(429),
    );
  } finally {
    hold.release();
    await first;
  }
  await assert.rejects(
    limit(request(4), 8, async () => {
      throw new Error("fixture handler failure");
    }),
    /fixture handler failure/,
  );
  assert.equal(await limit(request(4), 8, async (body) => body.byteLength), 4);
});

test("300 callers have bounded active bodies and no hidden upstream work", async () => {
  const limit = createRequestBodyLimiter({ ...policy, maxActive: 8 });
  const hold = gate();
  const entered = gate();
  let callbacks = 0;
  const jobs = Array.from({ length: 300 }, () =>
    limit(request(1), 8, async () => {
      if (++callbacks === 8) entered.release();
      await hold.promise;
      return true;
    }).catch((error) => {
      assert.ok(status(429)(error));
      return false;
    }),
  );
  await entered.promise;
  hold.release();
  const results = await Promise.all(jobs);
  assert.equal(callbacks, 8);
  assert.equal(results.filter(Boolean).length, 8);
});

test(
  "stalled and aborted reads free capacity; original bytes are preserved",
  { timeout: 2000 },
  async () => {
    const limit = createRequestBodyLimiter({ ...policy, maxActive: 1, timeoutMs: 20 });
    const input = new Request("http://fixture.test", {
      method: "POST",
      duplex: "half",
      body: new ReadableStream({ pull() {} }),
    } as RequestInit);
    await assert.rejects(
      limit(input, 8, async () => assert.fail("timeout must not reach handler")),
      status(408),
    );
    const controller = new AbortController();
    const abort = new Request("http://fixture.test", {
      method: "POST",
      signal: controller.signal,
      body: "x",
    });
    controller.abort();
    await assert.rejects(
      limit(abort, 8, async () => assert.fail()),
      status(408),
    );
    const bytes = new Uint8Array([0, 255, 1, 127]);
    const actual = await limit(
      new Request("http://fixture.test", { method: "POST", body: bytes }),
      8,
      async (body) => new Uint8Array(body),
    );
    assert.deepEqual(actual, bytes);
  },
);

test("ingress limits preserve existing gateway and Modal sizes and return retry metadata", async () => {
  assert.equal(
    requestBodyLimit(
      new Request("http://fixture.test/api/room-groq", {
        headers: { "x-groq-path": "/audio/transcriptions" },
      }),
    ),
    25 * 1024 * 1024,
  );
  assert.equal(requestBodyLimit(new Request("http://fixture.test/api/model-call")), 512 * 1024);
  assert.ok(requestBodyLimit(new Request("http://fixture.test/_serverFn/fixture")) > 24_000_000);
  const response = requestBodyFailure(new RequestBodyError(429, "fixture"))!;
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "2");
  const app = requestBodyFailure(
    new RequestBodyError(413, "fixture"),
    new Request("http://fixture.test/api/app-history"),
  )!;
  assert.equal((await app.json()).error, "fixture");
  assert.equal(requestBodyFailure(new Error("internal")), undefined);
});

test("saturated provider body slots leave capacity for payment and device-ticket requests", async () => {
  const hold = gate();
  const entered = gate();
  let started = 0;
  const pending = Array.from({ length: 32 }, () =>
    withRequestBody(
      new Request("http://fixture.test/api/room-groq", {
        method: "POST",
        body: "x",
        headers: { "content-length": "1" },
      }),
      8,
      async () => {
        if (++started === 32) entered.release();
        await hold.promise;
      },
    ),
  );
  await entered.promise;
  try {
    for (const path of ["/api/pay/sepay", "/api/app-ticket"]) {
      assert.equal(
        await withRequestBody(
          new Request("http://fixture.test" + path, { method: "POST", body: "x" }),
          8,
          async () => "ready",
        ),
        "ready",
      );
    }
    await assert.rejects(
      withRequestBody(
        new Request("http://fixture.test/api/model-call", { method: "POST", body: "x" }),
        8,
        async () => assert.fail(),
      ),
      status(429),
    );
  } finally {
    hold.release();
    await Promise.all(pending);
  }
});

test("lazy ingress preserves authenticate-before-body handlers and original headers", async () => {
  const limit = createRequestStreamLimiter(policy);
  let read = false;
  let cancelled = false;
  const source = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        read = true;
        controller.enqueue(new Uint8Array(1));
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const original = new Request("http://fixture.test/api/pay/sepay", {
    method: "POST",
    body: source,
    duplex: "half",
    headers: { "secure-token": "fixture-only" },
  } as RequestInit);
  const response = await limit(original, 8, async (bounded) => {
    assert.equal(bounded.url, original.url);
    assert.equal(bounded.headers.get("secure-token"), "fixture-only");
    assert.equal(read, false);
    return new Response(null, { status: 401 });
  });
  assert.equal(response.status, 401);
  assert.equal(read, false);
  assert.equal(cancelled, true);
});

test("a framework cannot swallow an over-limit stream error and acknowledge success", async () => {
  const limit = createRequestStreamLimiter(policy);
  await assert.rejects(
    limit(request(9, false), 8, async (bounded) => {
      try {
        await bounded.json();
      } catch {
        /* emulate a framework error response */
      }
      return new Response(null, { status: 200 });
    }),
    status(413),
  );
  const text = '{"text":"中é"}';
  const read = createRequestStreamLimiter({ ...policy, maxRetainedBytes: 1000 });
  assert.deepEqual(
    await read(
      new Request("http://fixture.test", { method: "POST", body: text }),
      100,
      async (bounded) => bounded.json(),
    ),
    { text: "中é" },
  );
});

test("Request-compatible runtime proxies do not need Undici private branding", async () => {
  const original = new Request("http://fixture.test", {
    method: "POST",
    body: "bytes",
    headers: { cookie: "fixture-only" },
  });
  const compatible = Object.create(Request.prototype) as Request;
  for (const name of ["url", "method", "headers", "body", "signal"] as const)
    Object.defineProperty(compatible, name, { value: original[name] });
  assert.ok(compatible instanceof Request);
  assert.throws(() => new Request(compatible, { body: "x" }));
  const limit = createRequestStreamLimiter(policy);
  assert.equal(
    await limit(compatible, 8, async (bounded) => {
      assert.equal(bounded.headers.get("cookie"), "fixture-only");
      return bounded.text();
    }),
    "bytes",
  );
});

test("the bounded Request keeps the original disconnect signal after reading finishes", async () => {
  const controller = new AbortController();
  const limit = createRequestStreamLimiter(policy);
  assert.equal(
    await limit(
      new Request("http://fixture.test", { method: "POST", body: "x", signal: controller.signal }),
      8,
      async (bounded) => {
        assert.equal(await bounded.text(), "x");
        controller.abort();
        assert.equal(bounded.signal.aborted, true);
        return "handler decides how to reconcile";
      },
    ),
    "handler decides how to reconcile",
  );
});
