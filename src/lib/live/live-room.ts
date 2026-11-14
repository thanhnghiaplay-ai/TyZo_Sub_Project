import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { validWorkspaceId } from "@/lib/live/live-upstream";

export type LiveSetupView = { workspaceId: string; hasKey: boolean };

/** Workspace ID không phải bí mật nên hiện đủ cho Chủ. Chỉ Chủ đọc và lưu. */
export const getLiveSetup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LiveSetupView> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`
      select key, value from room_settings where key in ('alibaba_workspace', 'alibaba_key')
    `;
    const map = new Map(rows.map((row) => [row.key, row.value]));
    return { workspaceId: map.get("alibaba_workspace")?.trim() ?? "", hasKey: Boolean(map.get("alibaba_key")?.trim()) };
  });

export const saveLiveWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: string) => {
    const id = String(input ?? "").trim().toLowerCase();
    if (!validWorkspaceId(id)) throw new Error("Workspace ID không đúng. Dạng đúng giống ws-3cg8k1b2dzc84cbl.");
    return id;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into room_settings (key, value) values ('alibaba_workspace', ${data})
      on conflict (key) do update set value = ${data}
    `;
    await writeAudit(context.userId, "workspace-live", null, data);
    return data;
  });
