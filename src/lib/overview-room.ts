import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseRange, parseTicketFilter, type Overview, type TicketFilter, type TicketRow } from "@/lib/overview-data";

/** Trang Tổng quan. Hỗ trợ trở lên xem được; tiền, top chi tiêu và chất lượng chỉ Chủ. */
export const getOverview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((range: unknown) => parseRange(range))
  .handler(async ({ context, data }): Promise<Overview> => {
    const { requireRole } = await import("@/lib/admin-room");
    const place = await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const { overviewWith } = await import("@/lib/overview-data");
    return overviewWith(await getSql(), data, place.role === "chu");
  });

/** Phiếu trả theo lượt, lọc theo trạng thái và tìm theo email hoặc tên tệp. */
export const searchRunTickets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { status?: unknown; q?: unknown }) => ({
    status: parseTicketFilter(input?.status) as TicketFilter,
    q: typeof input?.q === "string" ? input.q.trim().slice(0, 80) : "",
  }))
  .handler(async ({ context, data }): Promise<TicketRow[]> => {
    const { requireRole } = await import("@/lib/admin-room");
    const place = await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const { searchTicketsWith } = await import("@/lib/overview-data");
    return searchTicketsWith(await getSql(), data, { owner: place.role === "chu" });
  });

/**
 * Xem tên tệp đầy đủ của một phiếu. Chỉ Chủ. Mỗi lần xem ghi một dòng nhật ký thao tác
 * (ai, phiếu nào, lúc nào); dòng nhật ký không chứa tên tệp. Tên tệp không cho thấy video: phòng không lưu video.
 */
export const revealTicketFileName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: unknown) => {
    const ticket = typeof id === "string" ? id.trim().slice(0, 80) : "";
    if (!ticket) throw new Error("Thiếu phiếu.");
    return ticket;
  })
  .handler(async ({ context, data }): Promise<{ fileName: string }> => {
    const { requireRole, writeAudit } = await import("@/lib/admin-room");
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ user_id: string; file_name: string }>`select user_id, file_name from run_tickets where id = ${data}`;
    const row = rows[0];
    if (!row) throw new Error("Không có phiếu này.");
    await writeAudit(context.userId, "xem-ten-tep", row.user_id, `Phiếu ${data}`);
    return { fileName: row.file_name };
  });

export type DoorChange = { id: number; at: string; actorEmail: string; actorRole: string; action: string; note: string };

/** Lịch sử bật/tắt bảo trì và đổi giá của cửa trả theo lượt: ai làm, lúc nào, đổi gì. */
export const listDoorHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DoorChange[]> => {
    const { requireRole } = await import("@/lib/admin-room");
    await requireRole(context.userId, "ho-tro");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ id: number; created_at: unknown; actor_email: string; actor_role: string; action: string; note: string }>`
      select id, created_at, actor_email, actor_role, action, note
      from room_audit
      where action in ('dong-cua-luot', 'mo-cua-luot', 'gia-luot')
      order by id desc
      limit 12
    `;
    return rows.map((row) => ({
      id: row.id,
      at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
      actorEmail: row.actor_email || "",
      actorRole: row.actor_role || "user",
      action: row.action,
      note: row.note || "",
    }));
  });
