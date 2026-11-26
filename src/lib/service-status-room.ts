import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin/admin-room";
import { cleanServiceStatus, defaultServiceStatus, describeServiceChange, parseServiceStatus, SERVICE_KEY, type ServiceStatus } from "@/lib/service-status";

/** Ai cũng đọc được: trang dịch cần biết nhóm nào đang bảo trì. Lỗi đọc thì coi như Hoạt động, trang vẫn mở. */
export const getServiceStatus = createServerFn({ method: "GET" }).handler(async (): Promise<ServiceStatus> => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = ${SERVICE_KEY}`;
    return parseServiceStatus(rows[0]?.value);
  } catch {
    return defaultServiceStatus();
  }
});

/** Chỉ Chủ đặt. Ghi nhật ký thao tác «bao-tri» nói rõ nhóm nào đổi từ gì sang gì. */
export const saveServiceStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => cleanServiceStatus(input))
  .handler(async ({ context, data }): Promise<ServiceStatus> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const prev = await sql<{ value: string }>`select value from room_settings where key = ${SERVICE_KEY}`;
    const before = parseServiceStatus(prev[0]?.value);
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values (${SERVICE_KEY}, ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "bao-tri", null, describeServiceChange(before, data));
    return data;
  });
