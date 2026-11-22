/** Phần dùng chung của các đường /api/app-* (ứng dụng Android). Trả JSON, lỗi có câu tiếng Việt. */
export function json(status: number, body: unknown, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

export function fail(status: number, message: string, extra?: Record<string, string>) {
  return json(status, { error: message }, extra);
}

/** Đổi lỗi ném từ luật chung (khóa tài khoản, quá tần suất, bảo trì, thiếu Token) sang phản hồi. */
export function failFrom(error: unknown) {
  const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 400;
  const retry = (error as { retryAfter?: unknown })?.retryAfter;
  const message = error instanceof Error && error.message ? error.message : "Có lỗi, hãy thử lại.";
  console.error("[app-api]", message);
  return fail(status >= 400 && status < 600 ? status : 400, message, typeof retry === "number" ? { "retry-after": String(retry) } : undefined);
}

export async function readJson(request: Request, limit = 8 * 1024): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit) return null;
  try {
    const text = await request.text();
    if (text.length > limit) return null;
    const data = JSON.parse(text) as unknown;
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
