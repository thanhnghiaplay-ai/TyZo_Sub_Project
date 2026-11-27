/** Reserve upload memory before framework parsing; preserve handlers' auth-before-read. */
export class RequestBodyError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const GROQ_BODY_LIMITS: Record<string, number> = {
  "/audio/transcriptions": 25 * 1024 * 1024,
  "/chat/completions": 512 * 1024,
  "/audio/speech": 20 * 1024,
};
export const MODEL_BODY_LIMIT = 512 * 1024;

export function requestBodyLimit(request: Request): number {
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  if (path === "/api/room-groq")
    return GROQ_BODY_LIMITS[request.headers.get("x-groq-path") ?? ""] ?? 8 * 1024;
  if (path === "/api/model-call") return MODEL_BODY_LIMIT;
  if (path === "/api/pay/sepay" || path === "/api/pay/casso") return 256 * 1024;
  if (path === "/api/app-link" || path === "/api/app-ticket") return 8 * 1024;
  if (path === "/api/app-history") return 3 * 1024 * 1024;
  // Includes the existing Modal validator's 24,000,000-character base64 payload.
  return 32 * 1024 * 1024;
}

function declaredSize(request: Request, limit: number): number {
  const declared = Number(request.headers.get("content-length") || 0);
  if (!Number.isSafeInteger(declared) || declared < 0)
    throw new RequestBodyError(400, "Kích thước nội dung không hợp lệ.");
  if (declared > limit) throw new RequestBodyError(413, "Nội dung gửi lên quá lớn.");
  return declared;
}

/** Also used by route handlers invoked without the server-entry adapter in tests. */
export async function readRequestBytes(request: Request, limit: number): Promise<ArrayBuffer> {
  const limited = createRequestBodyLimiter({
    maxActive: 1,
    maxRetainedBytes: Math.max(1, limit * 3),
    timeoutMs: 90_000,
  });
  return limited(request, limit, async (body) => body);
}

type BodyPolicy = { maxActive: number; maxRetainedBytes: number; timeoutMs: number };
type BodyState = { active: number; retained: number };
const busy = () =>
  new RequestBodyError(429, "Đang có nhiều lượt gửi nội dung. Hãy thử lại sau ít giây.");

export function createRequestStreamLimiter(
  policy: BodyPolicy,
  state: BodyState = { active: 0, retained: 0 },
) {
  return async function withStream<T>(
    request: Request,
    limit: number,
    run: (bounded: Request) => Promise<T>,
  ): Promise<T> {
    let held = 0;
    let admitted = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let interrupted: Promise<never> | undefined;
    let abort: (() => void) | undefined;
    let bodyError: unknown;
    let size = 0;
    const source = request.body;
    const cleanup = () => {
      clearTimeout(timer);
      if (abort) request.signal.removeEventListener("abort", abort);
    };
    const cancel = () => {
      cleanup();
      // Cancellation is cleanup, never a reason to delay the policy response.
      if (reader) {
        void reader.cancel().catch(() => undefined);
        try {
          reader.releaseLock();
        } catch {
          /* cancelled pending read still owns the lock */
        }
      } else if (source && !source.locked) void source.cancel().catch(() => undefined);
    };
    const reserve = (bytes: number) => {
      const wanted = bytes * 3;
      if (state.retained + wanted - held > policy.maxRetainedBytes) throw busy();
      state.retained += wanted - held;
      held = wanted;
    };
    try {
      const declared = declaredSize(request, limit);
      if (request.signal.aborted) throw new RequestBodyError(408, "Đã hủy gửi nội dung.");
      if (state.active >= policy.maxActive) throw busy();
      state.active++;
      admitted = true;
      reserve(declared);
      const stream = source
        ? new ReadableStream<Uint8Array>(
            {
              async pull(controller) {
                try {
                  if (request.signal.aborted)
                    throw new RequestBodyError(408, "Đã hủy gửi nội dung.");
                  if (!reader) {
                    reader = source.getReader();
                    interrupted = new Promise<never>((_, reject) => {
                      abort = () => reject(new RequestBodyError(408, "Đã hủy gửi nội dung."));
                      request.signal.addEventListener("abort", abort, { once: true });
                      timer = setTimeout(
                        () =>
                          reject(
                            new RequestBodyError(408, "Gửi nội dung chưa xong kịp. Hãy thử lại."),
                          ),
                        policy.timeoutMs,
                      );
                    });
                  }
                  const { done, value } = await Promise.race([reader.read(), interrupted!]);
                  if (done) {
                    cleanup();
                    controller.close();
                    return;
                  }
                  size += value.byteLength;
                  if (size > limit) throw new RequestBodyError(413, "Nội dung gửi lên quá lớn.");
                  reserve(Math.max(size, declared));
                  controller.enqueue(value);
                } catch (error) {
                  bodyError = error;
                  cancel();
                  controller.error(error);
                }
              },
              cancel,
            },
            { highWaterMark: 0 },
          )
        : null;
      // Lazy zero-copy stream: handlers such as webhooks authenticate BEFORE
      // their first read. Native JSON/FormData consumers also get the cap.
      // Nitro can supply a Request-compatible proxy without Undici's private
      // state. Construct from URL/metadata, not new Request(proxy, ...).
      const bounded = new Request(request.url, {
        method: request.method,
        headers: [...request.headers],
        signal: request.signal,
        body: stream,
        duplex: "half",
      } as RequestInit);
      const result = await run(bounded);
      // Framework parsers may catch a stream error and serialize a 500/200.
      // Keep the real 413/408/429 instead of acknowledging an unread payload.
      if (bodyError) throw bodyError;
      return result;
    } finally {
      cancel();
      if (admitted) state.active--;
      state.retained -= held;
    }
  };
}

/** Byte adapter for consumers that need a complete buffer; same resource policy. */
export function createRequestBodyLimiter(policy: BodyPolicy, state?: BodyState) {
  const limited = createRequestStreamLimiter(policy, state);
  return async <T>(
    request: Request,
    limit: number,
    run: (body: ArrayBuffer) => Promise<T>,
  ): Promise<T> => limited(request, limit, async (bounded) => run(await bounded.arrayBuffer()));
}

const globals = globalThis as typeof globalThis & {
  __tyzoBodyState__?: BodyState;
  __tyzoControlBodyState__?: BodyState;
};
globals.__tyzoBodyState__ ??= { active: 0, retained: 0 };
globals.__tyzoControlBodyState__ ??= { active: 0, retained: 0 };
const withBulkBody = createRequestStreamLimiter(
  {
    maxActive: 32,
    maxRetainedBytes: 192 * 1024 * 1024,
    timeoutMs: 90_000,
  },
  globals.__tyzoBodyState__,
);
const withControlBody = createRequestStreamLimiter(
  {
    maxActive: 32,
    maxRetainedBytes: 24 * 1024 * 1024,
    timeoutMs: 90_000,
  },
  globals.__tyzoControlBodyState__,
);

export function withRequestBody<T>(
  request: Request,
  limit: number,
  run: (bounded: Request) => Promise<T>,
): Promise<T> {
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  const declared = request.headers.get("content-length");
  // Long provider calls/uploads cannot consume the slots used by payment
  // acknowledgements, device tickets and small UI/auth/server-function calls.
  const control =
    path.startsWith("/api/pay/") ||
    path === "/api/app-link" ||
    path === "/api/app-ticket" ||
    (path !== "/api/room-groq" &&
      path !== "/api/model-call" &&
      declared !== null &&
      Number(declared) <= 256 * 1024);
  return (control ? withControlBody : withBulkBody)(request, limit, run);
}

export function requestBodyFailure(error: unknown, request?: Request): Response | undefined {
  if (!(error instanceof RequestBodyError)) return;
  const message = error.message;
  const app = request && new URL(request.url).pathname.startsWith("/api/app-");
  return Response.json(app ? { error: message } : { error: { message }, message }, {
    status: error.status,
    headers: {
      "cache-control": "no-store",
      "x-tyzo-room": "1",
      ...(error.status === 429 ? { "retry-after": "2" } : {}),
    },
  });
}
