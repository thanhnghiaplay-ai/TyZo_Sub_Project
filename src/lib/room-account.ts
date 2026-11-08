import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { roomPlan, type RoomPlanId } from "@/lib/room-plans";

export type RoomState = {
  balance: number;
  plan: string | null;
  planUntil: string | null;
  trialLeft: number;
  ledger: { id: number; kind: string; amount: number; note: string; createdAt: string }[];
};

function stamp(value: unknown) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function readState(userId: string): Promise<RoomState> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`insert into room_accounts (user_id) values (${userId}) on conflict (user_id) do nothing`;
  const rows = await sql<{ balance: number; plan: string | null; plan_until: unknown; trial_left: number }>`
    select balance, plan, plan_until, trial_left from room_accounts where user_id = ${userId}
  `;
  const ledger = await sql<{ id: number; kind: string; amount: number; note: string; created_at: unknown }>`
    select id, kind, amount, note, created_at from room_ledger
    where user_id = ${userId} order by id desc limit 20
  `;
  const row = rows[0];
  return {
    balance: row?.balance ?? 0,
    plan: row?.plan ?? null,
    planUntil: stamp(row?.plan_until),
    trialLeft: row?.trial_left ?? 1,
    ledger: ledger.map((item) => ({
      id: item.id,
      kind: item.kind,
      amount: item.amount,
      note: item.note,
      createdAt: stamp(item.created_at) || "",
    })),
  };
}

export const getRoomAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RoomState> => readState(context.userId));

export const buyRoomPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const plan = roomPlan(id);
    if (!plan) throw new Error("Gói không có.");
    return plan.id;
  })
  .handler(async ({ context, data }): Promise<RoomState> => {
    const plan = roomPlan(data)!;
    const { requireOpenAccount } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const { buyPlanWith } = await import("@/lib/pay-flow");
    await buyPlanWith(sql, context.userId, plan);
    return readState(context.userId);
  });

export const spendTrial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RoomState> => {
    const { requireOpenAccount } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into room_accounts (user_id) values (${context.userId}) on conflict (user_id) do nothing`;
    const updated = await sql<{ user_id: string }>`
      with upd as (
        update room_accounts
        set trial_left = trial_left - 1
        where user_id = ${context.userId}
          and trial_left > 0
          and (plan_until is null or plan_until <= now())
        returning user_id
      )
      insert into room_ledger (user_id, kind, amount, note)
      select user_id, 'thu', 0, 'Dùng 1 lượt thử' from upd
      returning user_id
    `;
    if (!updated.length) {
      const current = await readState(context.userId);
      if (current.planUntil && new Date(current.planUntil).getTime() > Date.now()) {
        throw new Error("Đang có gói, không trừ lượt thử.");
      }
      throw new Error("Hết lượt dùng thử.");
    }
    return readState(context.userId);
  });

export const claimTrialDevice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const clean = id.trim().toLowerCase();
    if (!/^[a-z0-9]{16,64}$/.test(clean)) throw new Error("Thiết bị không hợp lệ.");
    return clean;
  })
  .handler(async ({ context, data }): Promise<RoomState> => {
    const { requireOpenAccount } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into room_accounts (user_id) values (${context.userId}) on conflict (user_id) do nothing`;
    await sql`
      insert into trial_devices (device_id, user_id)
      values (${data}, ${context.userId})
      on conflict (device_id) do nothing
    `;
    const owner = await sql<{ user_id: string }>`select user_id from trial_devices where device_id = ${data}`;
    if (owner[0] && owner[0].user_id !== context.userId) {
      await sql`
        with upd as (
          update room_accounts
          set trial_left = 0
          where user_id = ${context.userId}
            and trial_left > 0
            and (plan_until is null or plan_until <= now())
          returning user_id
        )
        insert into room_ledger (user_id, kind, amount, note)
        select user_id, 'thu', 0, 'Trình duyệt này đã dùng lượt thử' from upd
      `;
    }
    return readState(context.userId);
  });

/** Ghi phiên bản điều khoản người dùng đã đồng ý. Máy khách vẫn lưu bản sao. */
export const recordTermsConsent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((version: string) => {
    const value = version?.trim() ?? "";
    if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(value)) throw new Error("Phiên bản điều khoản không đúng.");
    return value;
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into room_accounts (user_id) values (${context.userId}) on conflict (user_id) do nothing`;
    await sql`update room_accounts set terms_version = ${data} where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export type { RoomPlanId };
