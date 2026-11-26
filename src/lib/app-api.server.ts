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

/**
 * Đổi lỗi ném từ luật chung (khóa tài khoản, quá tần suất, bảo trì, thiếu Token) sang phản hồi.
 * Kiểm toán AZ-009: chỉ trả nguyên câu cho lỗi có mã HTTP (luật chung) hoặc câu tiếng Việt viết cho khách;
 * lỗi nội bộ (câu tiếng Anh của thư viện, cơ sở dữ liệu) chỉ ghi nhật ký, khách nhận câu chung, mã 500.
 */
export function failFrom(error: unknown) {
  const coded = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : null;
  const retry = (error as { retryAfter?: unknown })?.retryAfter;
  const raw = error instanceof Error && error.message ? error.message : "";
  console.error("[app-api]", raw || String(error));
  const forCustomer = coded !== null || /[^\x00-\x7f]/.test(raw);
  const message = forCustomer && raw ? raw : "Có lỗi, hãy thử lại.";
  const status = coded !== null ? coded : forCustomer ? 400 : 500;
  return fail(status >= 400 && status < 600 ? status : 400, message, typeof retry === "number" ? { "retry-after": String(retry) } : undefined);
}

/**
 * Đọc JSON nhỏ. Kiểm toán AZ-005: dừng đọc ngay khi vượt `limit` byte (không đọc hết thân lớn vào bộ nhớ rồi mới kiểm),
 * kể cả khi máy gửi không khai Content-Length.
 */
export async function readJson(request: Request, limit = 8 * 1024): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limit) return null;
  try {
    const text = await readCapped(request, limit);
    if (text === null) return null;
    const data = JSON.parse(text) as unknown;
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Đọc thân yêu cầu thành chữ, tối đa `limit` byte; vượt thì hủy luồng và trả null. */
export async function readCapped(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.byteLength;
  }
  return new TextDecoder().decode(all);
}
