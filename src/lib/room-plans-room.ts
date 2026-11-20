import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { describePlanPrices, parsePlanPrices, planPricesProblem, type PlanPrices } from "@/lib/room-plan-prices";

const KEY = "room_plans";

/** Giá gói đã lưu; null = Chủ chưa lưu hoặc dữ liệu hỏng (nơi gọi dùng giá mặc định ở room-plans.ts). */
export async function readPlanPrices(): Promise<PlanPrices | null> {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = ${KEY}`;
    return parsePlanPrices(rows[0]?.value);
  } catch {
    return null;
  }
}

/** Ai cũng đọc được: trang gói, điều khoản và ví của khách đều hiện giá này. */
export const getRoomPlanPrices = createServerFn({ method: "GET" }).handler(async (): Promise<PlanPrices | null> => readPlanPrices());

export const saveRoomPlanPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: PlanPrices) => {
    const problem = planPricesProblem(input);
    if (problem) throw new Error(problem);
    // Chỉ giữ đúng các trường cần, bỏ mọi trường lạ khách gửi kèm.
    const parsed = parsePlanPrices(JSON.stringify(input));
    if (!parsed) throw new Error("Giá không đúng.");
    return parsed;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const before = await readPlanPrices();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values (${KEY}, ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "doi-gia-goi", null, describePlanPrices(before, data));
    return data;
  });

/** Về giá mặc định (xóa giá đã lưu). Đơn đang chờ vẫn giữ giá lúc đặt. */
export const resetRoomPlanPrices = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const before = await readPlanPrices();
    await sql`delete from room_settings where key = ${KEY}`;
    const { defaultPlanPrices } = await import("@/lib/room-plan-prices");
    await writeAudit(context.userId, "doi-gia-goi", null, "Về giá mặc định. " + describePlanPrices(before, defaultPlanPrices()));
    return null;
  });
