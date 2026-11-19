import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { checkPolishModels, parsePolishModels, type PolishModels } from "@/lib/polish-models";

/**
 * Danh sách model trau chuốt Chủ đã đặt. Ai đăng nhập cũng đọc được (khách cần để chọn), chỉ Chủ lưu được.
 * null = Chủ chưa lưu: khách chưa trau chuốt được.
 */
export const getPolishModels = createServerFn({ method: "GET" }).handler(async (): Promise<PolishModels | null> => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = 'polish_models'`;
    return parsePolishModels(rows[0]?.value);
  } catch {
    return null;
  }
});

export const savePolishModels = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: PolishModels) => checkPolishModels(input))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    const prev = await sql<{ value: string }>`select value from room_settings where key = 'polish_models'`;
    const before = parsePolishModels(prev[0]?.value);
    await sql`
      insert into room_settings (key, value) values ('polish_models', ${value})
      on conflict (key) do update set value = ${value}
    `;
    const { describePolishModels } = await import("@/lib/audit-note");
    await writeAudit(context.userId, "mo-trau-chuot", null, describePolishModels(before, data));
    return data;
  });
