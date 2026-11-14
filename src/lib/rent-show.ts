import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { parseRentShow, type RentShow } from "@/lib/rent-show-rule";

export { ownKeyAvailable, parseRentShow, rentOpen, rentUseProblem, type RentShow } from "@/lib/rent-show-rule";

export const getRentShow = createServerFn({ method: "GET" }).handler(async (): Promise<RentShow | null> => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = 'rent_show'`;
    return parseRentShow(rows[0]?.value);
  } catch {
    return null;
  }
});

export const saveRentShow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: RentShow) => {
    const parsed = parseRentShow(JSON.stringify(input ?? {}));
    if (!parsed) throw new Error("Danh sách không đúng.");
    return parsed;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    const prev = await sql<{ value: string }>`select value from room_settings where key = 'rent_show'`;
    const before = parseRentShow(prev[0]?.value);
    await sql`
      insert into room_settings (key, value) values ('rent_show', ${value})
      on conflict (key) do update set value = ${value}
    `;
    const { describeRentShow } = await import("@/lib/audit-note");
    await writeAudit(context.userId, "mo-thue", null, describeRentShow(before, data));
    return data;
  });
