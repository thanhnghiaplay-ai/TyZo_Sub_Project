import { createServerFn } from "@tanstack/react-start";
import { maskFileName } from "@/lib/mask-file-name";
import { authMiddleware } from "@/lib/auth/middleware";
import { checkRunDesk, dayStartIso, parseModelList, parseRunDesk, type PriceOverride, type RunDesk } from "@/lib/run-desk";

import { assertLower, clip, placeOf, requireRole, stamp, writeAudit } from "@/lib/admin/admin-room";

/** Lượt dịch trả theo lượt: bàn giữ tiền, lượt của khách, nhả giữ, hoàn, cửa trả theo lượt. Tách từ admin-room.ts (23/11/2026); kiểm quyền và nhật ký dùng chung ở admin-room.ts. */

export type RunTicket = {
  id: string;
  userId: string;
  email: string;
  fileName: string;
  seconds: number;
  rate: number;
  held: number;
  charged: number;
  released: number;
  refunded: number;
  status: string;
  unit: string;
  createdAt: string;
};

export type RunDeskView = {
  desk: RunDesk;
  models: string[] | null;
  keyTail: string;
  /** Token dịch đang giữ trên các phiếu mở hôm nay (phiếu Token; phiếu đồng không còn tạo từ v5.0.0). */
  holding: number;
  /** Token dịch đã trừ hôm nay. */
  charged: number;
  errors: number;
  recent: RunTicket[];
};

function ticketOf(row: {
  id: string;
  user_id: string;
  email: string | null;
  file_name: string;
  seconds: number;
  rate: number;
  held: number;
  charged: number;
  released: number;
  refunded: number;
  status: string;
  unit: string;
  created_at: unknown;
}): RunTicket {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email ?? "",
    fileName: maskFileName(row.file_name),
    seconds: row.seconds,
    rate: row.rate,
    held: row.held,
    charged: row.charged,
    released: row.released,
    refunded: row.refunded,
    status: row.status,
    unit: row.unit || "vnd",
    createdAt: stamp(row.created_at),
  };
}

export const getRunDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RunDeskView> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const models = await sql<{ value: string }>`select value from room_settings where key = 'run_models'`;
    const storedKey = await sql<{ value: string }>`select value from room_settings where key = 'run_key'`;
    const place = await placeOf(context.userId);
    const start = dayStartIso();
    const totals = await sql<{ holding: number; charged: number; errors: number }>`
      select
        coalesce(sum(case when status = 'dang-giu' and unit = 'token' then held else 0 end), 0)::int as holding,
        coalesce(sum(case when unit = 'token' then charged else 0 end), 0)::int as charged,
        coalesce(sum(case when status = 'loi' then 1 else 0 end), 0)::int as errors
      from run_tickets
      where created_at >= ${start}
    `;
    const recent = await sql<{
      id: string;
      user_id: string;
      email: string | null;
      file_name: string;
      seconds: number;
      rate: number;
      held: number;
      charged: number;
      released: number;
      refunded: number;
      status: string;
      unit: string;
      created_at: unknown;
    }>`
      select t.id, t.user_id, u.email, t.file_name, t.seconds, t.rate, t.held, t.charged, t.released, t.refunded, t.status, t.unit, t.created_at
      from run_tickets t
      left join "user" u on u.id = t.user_id
      order by t.created_at desc
      limit 20
    `;
    const owner = place.role === "chu";
    const row = totals[0];
    const desk = parseRunDesk(saved[0]?.value);
    return {
      desk: owner ? desk : { maintenance: desk.maintenance, note: desk.note, cap: 0, markup: 0, custom: {} },
      models: owner ? parseModelList(models[0]?.value) : [],
      keyTail: owner && storedKey[0]?.value ? storedKey[0].value.slice(-4) : "",
      holding: owner ? Number(row?.holding ?? 0) : 0,
      charged: owner ? Number(row?.charged ?? 0) : 0,
      errors: Number(row?.errors ?? 0),
      recent: recent.map(ticketOf),
    };
  });

export const saveRunDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: RunDesk) => checkRunDesk(input))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    const prev = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const before = parseRunDesk(prev[0]?.value);
    await sql`
      insert into room_settings (key, value) values ('run_desk', ${value})
      on conflict (key) do update set value = ${value}
    `;
    const { describeRunDesk } = await import("@/lib/audit-note");
    const action = before.maintenance !== data.maintenance ? (data.maintenance ? "dong-cua-luot" : "mo-cua-luot") : "gia-luot";
    await writeAudit(context.userId, action, null, describeRunDesk(before, data));
    return data;
  });

export const listUserRuns = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => {
    const id = userId?.trim();
    if (!id) throw new Error("Thiếu tài khoản.");
    return id;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      user_id: string;
      email: string | null;
      file_name: string;
      seconds: number;
      rate: number;
      held: number;
      charged: number;
      released: number;
      refunded: number;
      status: string;
      unit: string;
      created_at: unknown;
    }>`
      select t.id, t.user_id, u.email, t.file_name, t.seconds, t.rate, t.held, t.charged, t.released, t.refunded, t.status, t.unit, t.created_at
      from run_tickets t
      left join "user" u on u.id = t.user_id
      where t.user_id = ${data}
      order by t.created_at desc
      limit 20
    `;
    return rows.map(ticketOf);
  });

export const releaseRunHold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const ticket = id?.trim();
    if (!ticket) throw new Error("Thiếu phiếu.");
    return ticket;
  })
  .handler(async ({ context, data }) => {
    const place = await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ user_id: string }>`select user_id from run_tickets where id = ${data}`;
    const ticket = rows[0];
    if (!ticket) throw new Error("Không có phiếu này.");
    await assertLower(context.userId, ticket.user_id);
    const { releaseHoldWith } = await import("@/lib/payment/pay-flow");
    await releaseHoldWith(sql, data, `Nhả khoản giữ phiếu ${data} bởi ${place.email}`);
    await writeAudit(context.userId, "nha-giu", ticket.user_id, data);
    return { ok: true };
  });

export const refundRun = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; amount: number; reason: string }) => {
    const id = input.id?.trim();
    if (!id) throw new Error("Thiếu phiếu.");
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 1) throw new Error("Số hoàn không đúng.");
    const reason = clip(input.reason ?? "", 180);
    if (reason.length < 8) throw new Error("Hãy ghi lý do, ít nhất 8 ký tự.");
    return { id, amount, reason };
  })
  .handler(async ({ context, data }) => {
    const place = await requireRole(context.userId, "quan-ly");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ user_id: string; charged: number; refunded: number }>`
      select user_id, charged, refunded from run_tickets where id = ${data.id}
    `;
    const ticket = rows[0];
    if (!ticket) throw new Error("Không có phiếu này.");
    await assertLower(context.userId, ticket.user_id);
    const { refundRunWith } = await import("@/lib/payment/pay-flow");
    await refundRunWith(sql, data.id, data.amount, `Admin ${place.email}: ${data.reason}`);
    await writeAudit(context.userId, "hoan-vi", ticket.user_id, `${data.id} ${data.amount} ${data.reason}`);
    return { ok: true };
  });

export type RunDoorView = { open: boolean; note: string; markup: number; custom: Record<string, PriceOverride>; offered: string[] | null };

export const getRunDoor = createServerFn({ method: "GET" }).handler(async (): Promise<RunDoorView> => {
  const closed = { open: true, note: "", markup: 0, custom: {} as Record<string, PriceOverride>, offered: null };
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const models = await sql<{ value: string }>`select value from room_settings where key = 'run_models'`;
    const desk = parseRunDesk(saved[0]?.value);
    return {
      open: !desk.maintenance,
      note: desk.maintenance ? desk.note : "",
      markup: desk.markup,
      custom: desk.custom,
      offered: parseModelList(models[0]?.value),
    };
  } catch {
    return closed;
  }
});
