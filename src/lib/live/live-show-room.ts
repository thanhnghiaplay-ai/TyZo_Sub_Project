import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { cleanLiveShow, parseLiveShow } from "@/lib/live/live-show";

/** Model dịch trực tiếp Chủ đã mở. null = chưa lưu (mở hết model làm được). Ai cũng đọc được (khách cần lọc ô chọn). */
export const getLiveShow = createServerFn({ method: "GET" }).handler(async (): Promise<string[] | null> => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = 'live_show'`;
    return parseLiveShow(rows[0]?.value);
  } catch {
    return null;
  }
});

export const saveLiveShow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: string[]) => cleanLiveShow(input))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values ('live_show', ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "mo-live", null, `${data.length} model`);
    return data;
  });
