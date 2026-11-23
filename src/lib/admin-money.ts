import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseCategory } from "@/lib/money-extra";
import { parseSpan } from "@/lib/money-extra-data";
import { isStaffRole, type StaffRole } from "@/lib/staff-role";
import { legacyMarkupOf } from "@/lib/run-desk";

import { clip, requireRole, writeAudit } from "@/lib/admin-room";
import { profitOf, tokenCostVnd } from "@/lib/money-profit";

/** Công ty (đối tác, tên gợi nhớ), doanh thu, chi phí, xóa số liệu thử. Tách từ admin-room.ts (23/11/2026); kiểm quyền và nhật ký dùng chung ở admin-room.ts. */

export type OrgCard = {
  id: string;
  email: string;
  name: string;
  nickname: string;
  role: StaffRole | "user";
  actions: number;
};

export type OrgPartner = {
  id: string;
  email: string;
  name: string;
  code: string;
  status: string;
};

export const getOrg = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ cards: OrgCard[]; users: number; partners: OrgPartner[] }> => {
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const people = await sql<{ id: string; email: string; name: string; role: string | null; nickname: string | null }>`
      select u.id, u.email, u.name, s.role, s.nickname
      from "user" u
      left join room_staff s on s.user_id = u.id
    `;
    const counts = await sql<{ actor_id: string; n: number }>`
      select actor_id, count(*)::int as n from room_audit
      where created_at > date_trunc('month', now())
      group by actor_id
    `;
    const byActor = new Map(counts.map((row) => [row.actor_id, row.n]));
    const cards = people
      .filter((person) => isStaffRole(person.role))
      .map((person) => ({
        id: person.id,
        email: person.email,
        name: person.name,
        nickname: person.nickname || "",
        role: (isStaffRole(person.role) ? person.role : "user") as OrgCard["role"],
        actions: byActor.get(person.id) ?? 0,
      }));
    let partners: OrgPartner[] = [];
    try {
      partners = await sql<OrgPartner>`
        select u.id, u.email, u.name, a.code, a.status
        from affiliates a
        join "user" u on u.id = a.user_id
        order by a.created_at desc
        limit 80
      `;
    } catch {
      partners = [];
    }
    return { cards, users: Math.max(0, people.length - cards.length), partners };
  });

export const setNickname = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; nickname: string }) => ({
    userId: input.userId?.trim(),
    nickname: clip(input.nickname ?? "", 40),
  }))
  .handler(async ({ context, data }) => {
    if (!data.userId) throw new Error("Thiếu tài khoản.");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    // Chỉ đặt tên cho nhân viên đã có. Không bao giờ tạo dòng quyền mới ở đây (trước đây tạo nhầm Chủ).
    const updated = await sql<{ user_id: string }>`
      update room_staff set nickname = ${data.nickname} where user_id = ${data.userId} returning user_id
    `;
    if (!updated.length) throw new Error("Chỉ đặt tên gợi nhớ cho nhân viên. Hãy cấp quyền trước.");
    await writeAudit(context.userId, "ten-goi-nho", data.userId, data.nickname || "Xóa tên gợi nhớ");
    return { ok: true };
  });

export type MoneyPoint = { bucket: string; revenue: number; cost: number };
export type CostRow = { id: number; day: string; label: string; amount: number; category: string };
export type MoneyBreakdown = {
  nap: number;
  goi: number;
  luot: number;
  hoan: number;
  nha: number;
  chi: number;
  von: number;
  /** Lãi gộp = tiền vào − giá vốn. */
  lai: number;
  /** Lời lỗ = lãi gộp − hoa hồng − chi phí ghi tay. Tính ở máy chủ, màn hình chỉ hiện. */
  loi: number;
  hoa: number;
  /** Phần giá vốn là ước tính cho phiếu cũ, nằm trong von. */
  vonUoc: number;
  /** Phần giá vốn của lượt trừ Token dịch, quy ra đồng theo giá gốc Turbo hiện hành, nằm trong von. */
  vonToken: number;
  /** Có lượt Token dịch nhưng chưa có giá Turbo để quy ra đồng: giá vốn đang thiếu. */
  tokenChuaGia: boolean;
  /** Số phiếu cũ đã trừ tiền mà chưa có giá vốn, toàn thời gian. */
  chuaVon: number;
};

export const getMoney = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((span: string) => (span === "week" || span === "month" || span === "year" ? span : "day"))
  .handler(async ({ context, data }): Promise<{ points: MoneyPoint[]; revenue: number; cost: number; breakdown: MoneyBreakdown; costs: CostRow[] }> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const window = data === "year" ? "5 years" : data === "month" ? "12 months" : data === "week" ? "8 weeks" : "14 days";
    // Doanh thu = mọi tiền nạp đã vào ví, kể cả Chủ xác nhận tay khi cổng chưa tự cộng. Không tính tiền thử.
    const revenue = await sql<{ bucket: string; amount: number }>`
      select to_char(date_trunc(${data}::text, created_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') as bucket, coalesce(sum(amount), 0)::int as amount
      from room_ledger
      where kind = 'nap' and created_at > now() - ${window}::interval
      group by 1 order by 1
    `;
    const savedCosts = await sql<CostRow>`
      select id, to_char(spent_on, 'YYYY-MM-DD') as day, label, amount, category
      from room_costs
      where spent_on::timestamp > now() - ${window}::interval
      order by spent_on desc, id desc
      limit 80
    `;
    const costs = await sql<{ bucket: string; amount: number }>`
      select to_char(date_trunc(${data}::text, spent_on::timestamp), 'YYYY-MM-DD') as bucket, coalesce(sum(amount), 0)::int as amount
      from room_costs
      where spent_on::timestamp > now() - ${window}::interval
      group by 1 order by 1
    `;
    const kinds = await sql<{ kind: string; amount: number }>`
      select kind, coalesce(sum(amount), 0)::int as amount
      from room_ledger
      where created_at > now() - ${window}::interval
        and kind in ('nap', 'goi', 'hoan', 'nha')
      group by kind
    `;
    const runSum = await sql<{ charged: number; refunded: number; von: number; uoc: number }>`
      select coalesce(sum(charged), 0)::int as charged, coalesce(sum(refunded), 0)::int as refunded, coalesce(sum(base_cost), 0)::int as von,
        coalesce(sum(base_cost) filter (where base_est), 0)::int as uoc
      from run_tickets
      where created_at > now() - ${window}::interval and unit = 'vnd'
    `;
    const hoaRows = await sql<{ hoa: number }>`
      select coalesce(sum(amount), 0)::int as hoa from commission_events
      where status <> 'huy' and created_at > now() - ${window}::interval
    `;
    const byKind = Object.fromEntries(kinds.map((row) => [row.kind, row.amount]));
    const buckets = new Map<string, MoneyPoint>();
    for (const row of revenue) buckets.set(row.bucket, { bucket: row.bucket, revenue: row.amount, cost: 0 });
    for (const row of costs) {
      const point = buckets.get(row.bucket) ?? { bucket: row.bucket, revenue: 0, cost: 0 };
      point.cost = row.amount;
      buckets.set(row.bucket, point);
    }
    const points = [...buckets.values()];
    const costTotal = points.reduce((sum, point) => sum + point.cost, 0);
    const charged = Number(runSum[0]?.charged ?? 0);
    const refundedRun = Number(runSum[0]?.refunded ?? 0);
    const { tokenUsageWith, WINDOW } = await import("@/lib/money-extra-data");
    const { turboBasePerSecond } = await import("@/lib/token-cost.server");
    const turbo = await turboBasePerSecond(sql);
    const used = await tokenUsageWith(sql, WINDOW[data]);
    const vonToken = tokenCostVnd(used.tokens, turbo);
    const von = Number(runSum[0]?.von ?? 0) + vonToken;
    const vonUoc = Number(runSum[0]?.uoc ?? 0);
    const { countUncosted } = await import("@/lib/cost-estimate");
    const chuaVon = await countUncosted(sql);
    const hoa = Number(hoaRows[0]?.hoa ?? 0);
    const luot = Math.max(0, charged - refundedRun);
    const goi = Math.abs(Number(byKind.goi ?? 0));
    const nap = Number(byKind.nap ?? 0);
    const { lai, loi } = profitOf({ revenue: nap, von, hoa, chi: costTotal });
    return {
      points,
      revenue: points.reduce((sum, point) => sum + point.revenue, 0),
      cost: costTotal,
      breakdown: {
        nap,
        goi,
        luot,
        hoan: Number(byKind.hoan ?? 0),
        nha: Number(byKind.nha ?? 0),
        chi: costTotal,
        von,
        lai,
        loi,
        hoa,
        vonUoc,
        vonToken,
        tokenChuaGia: used.tokens > 0 && turbo === null,
        chuaVon,
      },
      costs: savedCosts,
    };
  });

export type { MoneyExtra } from "@/lib/money-extra-data";

/** Số liệu mới cho trang Doanh thu. Chỉ Chủ. */
export const getMoneyExtra = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((span: string) => parseSpan(span))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const { moneyExtraWith } = await import("@/lib/money-extra-data");
    const sql = await getSql();
    const { turboBasePerSecond } = await import("@/lib/token-cost.server");
    return moneyExtraWith(sql, data, await turboBasePerSecond(sql));
  });

/** Chủ bấm: điền giá vốn ước tính cho phiếu cũ. Dùng phần chênh Groq hiện tại, nên chỉ là ước tính. */
export const estimateOldCost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ count: number; markup: number }> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const saved = await sql<{ value: string }>`select value from room_settings where key = 'run_desk'`;
    const markup = legacyMarkupOf(saved[0]?.value);
    const { estimateOldCostWith } = await import("@/lib/cost-estimate");
    const count = await estimateOldCostWith(sql, markup);
    await writeAudit(context.userId, "uoc-gia-von", null, `${count} phiếu, chênh ${markup}%`);
    return { count, markup };
  });

export const addCost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { day: string; label: string; amount: number; category?: string }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day || "")) throw new Error("Ngày không đúng.");
    const label = clip(input.label ?? "", 80);
    if (label.length < 2) throw new Error("Hãy ghi khoản chi.");
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 1) throw new Error("Số tiền không đúng.");
    return { day: input.day, label, amount, category: parseCategory(input.category) };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into room_costs (spent_on, label, amount, category) values (${data.day}, ${data.label}, ${data.amount}, ${data.category})`;
    await writeAudit(context.userId, "chi-phi", null, `${data.day} ${data.label} ${data.amount} [${data.category}]`);
    return { ok: true };
  });

export const updateCost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; day: string; label: string; amount: number; category?: string }) => {
    const id = Math.round(Number(input.id));
    if (!Number.isFinite(id) || id < 1) throw new Error("Thiếu khoản chi.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day || "")) throw new Error("Ngày không đúng.");
    const label = clip(input.label ?? "", 80);
    if (label.length < 2) throw new Error("Hãy ghi khoản chi.");
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount < 1) throw new Error("Số tiền không đúng.");
    return { id, day: input.day, label, amount, category: parseCategory(input.category) };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const updated = await sql<{ id: number }>`
      update room_costs set spent_on = ${data.day}, label = ${data.label}, amount = ${data.amount}, category = ${data.category}
      where id = ${data.id}
      returning id
    `;
    if (!updated.length) throw new Error("Không thấy khoản chi.");
    await writeAudit(context.userId, "sua-chi-phi", null, `${data.id} ${data.day} ${data.label} ${data.amount} [${data.category}]`);
    return { ok: true };
  });

export const deleteCost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => {
    const value = Math.round(Number(id));
    if (!Number.isFinite(value) || value < 1) throw new Error("Thiếu khoản chi.");
    return value;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const removed = await sql<{ label: string }>`delete from room_costs where id = ${data} returning label`;
    if (!removed.length) throw new Error("Không thấy khoản chi.");
    await writeAudit(context.userId, "xoa-chi-phi", null, `${data} ${removed[0].label}`);
    return { ok: true };
  });

export const resetTestMoney = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((code: string) => {
    const value = code?.trim().toUpperCase() ?? "";
    if (!/^[A-Z2-9]{6}$/.test(value)) throw new Error("Hãy nhập đúng mã xác nhận 6 ký tự.");
    return value;
  })
  .handler(async ({ context }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const { wipeTestData } = await import("@/lib/pay-flow");
    const sql = await getSql();
    await wipeTestData(sql);
    await writeAudit(context.userId, "reset-tien-test", null, "Xóa số liệu thử: Token dịch, đơn, phiếu, chuông, nhật ký, gói thuê. Giữ tài khoản.");
    return { ok: true as const };
  });
