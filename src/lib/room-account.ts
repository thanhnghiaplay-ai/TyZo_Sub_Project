import * as rightsShape from "@/lib/rights-consent";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { roomPlan, type RoomPlanId } from "@/lib/room-plans";

export type RoomState = {
  balance: number;
  holding: number;
  units: number;
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
  const { releaseStaleWith } = await import("@/lib/run-ticket");
  await releaseStaleWith(sql, userId);
  const { repairMissedTokens } = await import("@/lib/pay-flow");
  await repairMissedTokens(sql, userId);
  const rows = await sql<{ balance: number; plan: string | null; plan_until: unknown; trial_left: number }>`
    select balance, plan, plan_until, trial_left from room_accounts where user_id = ${userId}
  `;
  const held = await sql<{ n: number }>`
    select coalesce(sum(held), 0)::int as n from run_tickets where user_id = ${userId} and status = 'dang-giu' and unit = 'vnd'
  `;
  const units = await sql<{ n: number }>`
    select coalesce(sum(left_tokens), 0)::int as n from token_grants
    where user_id = ${userId} and expires_at > now() and left_tokens > 0
  `;
  const ledger = await sql<{ id: number; kind: string; amount: number; note: string; created_at: unknown }>`
    select id, kind, amount, note, created_at from room_ledger
    where user_id = ${userId} order by id desc limit 20
  `;
  const row = rows[0];
  return {
    balance: row?.balance ?? 0,
    holding: Number(held[0]?.n ?? 0),
    units: Number(units[0]?.n ?? 0),
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

export const orderRoomPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const plan = roomPlan(id);
    if (!plan) throw new Error("Gói không có.");
    return plan.id;
  })
  .handler(async ({ context, data }) => {
    const { requireOpenAccount } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    // Giá lấy từ giá Admin đã lưu LÚC ĐẶT ĐƠN; đơn giữ số tiền này dù sau đó đổi giá. Chưa lưu thì dùng giá mặc định.
    const { readPlanPrices } = await import("@/lib/room-plans-room");
    const { pricedPlan } = await import("@/lib/room-plan-prices");
    const plan = pricedPlan(await readPlanPrices(), data);
    if (!plan) throw new Error("Gói không có.");
    const { placeSale } = await import("@/lib/pay-store");
    return placeSale(context.userId, {
      amount: plan.price,
      purpose: "plan",
      ref: plan.id,
      detail: JSON.stringify({ hours: plan.hours, name: plan.name }),
      title: `Thuê phòng ${plan.name}`,
    });
  });

export const buyRoomPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    const plan = roomPlan(id);
    if (!plan) throw new Error("Gói không có.");
    return plan.id;
  })
  .handler(async () => {
    throw new Error("Không trừ số dư. Hãy chuyển khoản theo mã QR.");
  });

export const spendTrial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RoomState> => {
    const { requireOpenAccount } = await import("@/lib/guard.server");
    await requireOpenAccount(context.userId);
    // Đang bảo trì thì không trừ lượt dùng thử của khách vào một lượt chạy sẽ bị chặn.
    const { requireServiceOpen } = await import("@/lib/service-status.server");
    await requireServiceOpen("normal");
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
    {
      const { noteEvent } = await import("@/lib/risk-log.server");
      await noteEvent(context.userId, "dung-thu", { device: data, dedupeMinutes: 60 });
    }
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

/** Ghi bằng chứng khách đã xác nhận quyền với một tệp (mã băm, không tên tệp). Gọi lại cùng tệp thì giữ lần đầu. */
export const recordRightsConsent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { media: string; terms: string }) => {
    const { isMediaHash } = rightsShape;
    if (!isMediaHash(input?.media)) throw new Error("Mã tệp không đúng.");
    const terms = input?.terms?.trim() ?? "";
    if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(terms)) throw new Error("Phiên bản điều khoản không đúng.");
    return { media: input.media, terms };
  })
  .handler(async ({ context, data }) => {
    const { takeRate } = await import("@/lib/guard.server");
    await takeRate(`rights:${context.userId}`, 60, 60);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into rights_consents (user_id, media_hash, terms_version) values (${context.userId}, ${data.media}, ${data.terms})
      on conflict (user_id, media_hash) do nothing
    `;
    return { ok: true as const };
  });

export type { RoomPlanId };
