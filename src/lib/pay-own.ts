import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { sameSecret } from "@/lib/pay-match";
import { confirmOwnWith } from "@/lib/pay-flow";

export const ownPayStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireRole } = await import("@/lib/admin-room");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = 'pay_own_secret'`;
    return { open: Boolean(rows[0]?.value) };
  });

export const saveOwnPaySecret = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((secret: string) => {
    const next = secret?.trim() ?? "";
    if (next && next.length < 16) throw new Error("Khóa xác nhận cần ít nhất 16 ký tự.");
    if (next.length > 200) throw new Error("Khóa quá dài.");
    return next;
  })
  .handler(async ({ context, data }) => {
    const { requireRole } = await import("@/lib/admin-room");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into room_settings (key, value) values ('pay_own_secret', ${data})
      on conflict (key) do update set value = ${data}
    `;
    return { open: Boolean(data) };
  });

export async function handleOwnPay(request: Request) {
  let body: { code?: string; amount?: number; ref?: string; secret?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "Sai định dạng." }, { status: 400 });
  }
  const code = body.code?.trim().toUpperCase() ?? "";
  const amount = Math.round(Number(body.amount));
  const ref = body.ref?.trim().slice(0, 80) ?? "";
  const given = request.headers.get("x-tyzo-secret") || body.secret || "";
  if (!/^TZ[A-Z0-9]{4,12}$/.test(code) || !(amount > 0) || ref.length < 4) {
    return Response.json({ ok: false, error: "Thiếu mã, số tiền hoặc mã giao dịch." }, { status: 400 });
  }
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from room_settings where key = 'pay_own_secret'`;
  const expected = rows[0]?.value ?? "";
  if (!expected) return Response.json({ ok: false, error: "Cổng chưa mở." }, { status: 503 });
  if (!sameSecret(given, expected)) return Response.json({ ok: false, error: "Sai khóa." }, { status: 401 });
  const done = await confirmOwnWith(sql, code, amount, ref);
  if (!done) return Response.json({ ok: false, error: "Không khớp đơn đang chờ." }, { status: 404 });
  return Response.json({ ok: true, code: done.code, amount: done.amount });
}
