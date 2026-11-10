import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { mailerName, sendMail } from "@/lib/auth/mailer";
import { deskToEnv, isMailProvider, mailDeskView, readMailStored, type MailDeskView, type MailStored } from "@/lib/mail-desk-shape";

export { MAIL_PROVIDERS, type MailDeskView, type MailProvider } from "@/lib/mail-desk-shape";

const KEY = "mail_desk";

function checkFrom(from: string) {
  const value = from.trim();
  const bare = value.match(/<([^>]+)>/)?.[1] ?? value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bare)) throw new Error("Địa chỉ gửi không đúng.");
  if (value.length > 120) throw new Error("Địa chỉ gửi quá dài.");
  return value;
}

async function loadStored() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from room_settings where key = ${KEY}`;
  return { sql, stored: readMailStored(rows[0]?.value) };
}

export const getMailDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MailDeskView> => {
    const { requireRole } = await import("@/lib/admin-room");
    const place = await requireRole(context.userId, "chu");
    const { stored } = await loadStored();
    return mailDeskView(stored, mailerName(process.env), place.email);
  });

export const saveMailDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider: string; from: string; key: string; domain: string }) => {
    const provider = input.provider?.trim() ?? "";
    if (!isMailProvider(provider)) throw new Error("Hãy chọn nhà gửi thư.");
    const from = checkFrom(input.from ?? "");
    // Mật khẩu ứng dụng Google hiện thành 4 nhóm cách nhau bằng dấu cách, bỏ khoảng trắng khi lưu.
    const key = provider === "smtp" ? (input.key ?? "").replace(/\s+/g, "") : (input.key ?? "").trim();
    if (key && (key.length < 8 || key.length > 200)) throw new Error(provider === "smtp" ? "Mật khẩu ứng dụng không đúng." : "Khóa không đúng.");
    const domain = (input.domain ?? "").trim();
    if (provider === "mailgun" && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error("Tên miền Mailgun không đúng.");
    if (provider === "smtp" && domain && !/^[a-z0-9.-]+\.[a-z]{2,}(:\d{2,5})?$/i.test(domain)) throw new Error("Máy chủ SMTP không đúng. Ví dụ smtp.ten-mien.vn:465.");
    return { provider, from, key, domain };
  })
  .handler(async ({ context, data }) => {
    const { requireRole } = await import("@/lib/admin-room");
    const place = await requireRole(context.userId, "chu");
    const { sql, stored } = await loadStored();
    const key = data.key || stored?.key || "";
    if (!key) throw new Error("Hãy nhập khóa.");
    const next: MailStored = {
      provider: data.provider,
      from: data.from,
      key,
      domain: data.provider === "mailgun" || data.provider === "smtp" ? data.domain : "",
      testedAt: stored?.testedAt ?? 0,
    };
    if (mailerName(deskToEnv(next)) !== next.provider) {
      throw new Error(next.provider === "smtp" ? "Chưa nhận ra máy chủ của email này. Hãy nhập máy chủ SMTP." : "Chưa đủ thông tin để gửi.");
    }
    const value = JSON.stringify(next);
    await sql`
      insert into room_settings (key, value) values (${KEY}, ${value})
      on conflict (key) do update set value = ${value}
    `;
    await sql`
      insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
      values (${context.userId}, 'thu', null, ${"Lưu nhà gửi thư " + next.provider}, ${place.email}, ${place.role ?? "chu"}, '')
    `;
    return mailDeskView(next, mailerName(process.env), place.email);
  });

export const sendTestMail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { requireRole } = await import("@/lib/admin-room");
    const place = await requireRole(context.userId, "chu");
    const { sql, stored } = await loadStored();
    const savedReady = stored ? mailerName(deskToEnv(stored)) === stored.provider : false;
    const env = savedReady && stored ? deskToEnv(stored) : process.env;
    if (!mailerName(env)) throw new Error("Chưa có nhà gửi thư.");
    if (stored && Date.now() - stored.testedAt < 30_000) throw new Error("Hãy đợi một lát rồi gửi lại.");
    await sendMail(
      {
        to: place.email,
        subject: "Thư thử từ TyZo Sub",
        text: "Đây là thư thử.\nNếu bạn nhận được thư này, phòng đã gửi thư được.\nBạn không cần bấm gì thêm.",
        html: "<p>Đây là thư thử.</p><p>Nếu bạn nhận được thư này, phòng đã gửi thư được.</p><p>Bạn không cần bấm gì thêm.</p>",
      },
      env,
    );
    if (stored) {
      const next = { ...stored, testedAt: Date.now() };
      const value = JSON.stringify(next);
      await sql`
        insert into room_settings (key, value) values (${KEY}, ${value})
        on conflict (key) do update set value = ${value}
      `;
    }
    await sql`
      insert into room_audit (actor_id, action, target_id, note, actor_email, actor_role, target_email)
      values (${context.userId}, 'thu-thu', null, ${"Gửi thư thử bằng " + (savedReady ? "khoa da luu" : "may chu")}, ${place.email}, ${place.role ?? "chu"}, ${place.email})
    `;
    return { ok: true as const, email: place.email };
  });
