import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { cleanSupportContact, EMPTY_CONTACT, filledFields, readSupportContact, type SupportContact } from "@/lib/support-contact";

const KEY = "support_contact";

/** Ai cũng đọc được: đây là thông tin liên hệ để khách tìm hỗ trợ, không có bí mật. Lỗi đọc thì trả rỗng, trang hướng dẫn vẫn mở. */
export const getSupportContact = createServerFn({ method: "GET" }).handler(async (): Promise<SupportContact> => {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = ${KEY}`;
    return readSupportContact(rows[0]?.value);
  } catch {
    return { ...EMPTY_CONTACT };
  }
});

/** Chỉ Chủ lưu. Ô để trống nghĩa là không hiện cách liên hệ đó. */
export const saveSupportContact = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => cleanSupportContact(input))
  .handler(async ({ context, data }): Promise<SupportContact> => {
    await requireRole(context.userId, "chu");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const value = JSON.stringify(data);
    await sql`
      insert into room_settings (key, value) values (${KEY}, ${value})
      on conflict (key) do update set value = ${value}
    `;
    await writeAudit(context.userId, "lien-he", null, filledFields(data));
    return data;
  });
