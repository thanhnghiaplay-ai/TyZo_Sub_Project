import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { checkRunDesk, parseModelList, parseRunDesk } from "@/lib/run-desk";
import { isProviderId, PROVIDERS, type ProviderId } from "@/lib/sub/provider";

/**
 * Key phòng theo từng nhà cung cấp, dùng chung cho mọi nhà trong `PROVIDERS` (xem PROVIDERS.md bước 6).
 * Tên dòng trong `room_settings` lấy từ `PROVIDERS[id].settings`, không viết tay.
 */
export type ProviderKeyView = { keyTail: string; models: string[] | null };

function checkProviderId(input: unknown): ProviderId {
  const id = typeof input === "string" ? input : "";
  if (!isProviderId(id)) throw new Error("Nhà cung cấp không đúng.");
  return id;
}

async function openSql() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

export const getProviderKey = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: ProviderId) => checkProviderId(input))
  .handler(async ({ context, data }): Promise<ProviderKeyView> => {
    await requireRole(context.userId, "chu");
    const names = PROVIDERS[data].settings;
    const sql = await openSql();
    const rows = await sql<{ key: string; value: string }>`
      select key, value from room_settings where key in (${names.key}, ${names.models})
    `;
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const key = map.get(names.key) || "";
    return { keyTail: key ? key.slice(-4) : "", models: parseModelList(map.get(names.models)) };
  });

export const saveProviderKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider: ProviderId; key: string }) => {
    const provider = checkProviderId(input?.provider);
    const key = input?.key?.trim() ?? "";
    if (key.length < 20 || key.length > 200 || /\s/.test(key)) throw new Error("Key không đúng.");
    return { provider, key };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { listModelIds } = await import("@/lib/sub/groq");
    const ids = await listModelIds(data.key, undefined, data.provider);
    const names = PROVIDERS[data.provider].settings;
    const sql = await openSql();
    const models = JSON.stringify(ids);
    await sql`
      insert into room_settings (key, value) values (${names.key}, ${data.key})
      on conflict (key) do update set value = ${data.key}
    `;
    await sql`
      insert into room_settings (key, value) values (${names.models}, ${models})
      on conflict (key) do update set value = ${models}
    `;
    await writeAudit(context.userId, `key-${data.provider}`, null, `${ids.length} model`);
    return ids;
  });

/** Phần trăm chênh của một nhà (khóa `settings.desk`). Chỉ nhà ngoài Groq và Alibaba, vì hai nhà đó đã có bàn giá riêng. */
export const getProviderMarkup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: ProviderId) => checkProviderId(input))
  .handler(async ({ context, data }): Promise<number> => {
    await requireRole(context.userId, "chu");
    const sql = await openSql();
    const rows = await sql<{ value: string }>`select value from room_settings where key = ${PROVIDERS[data].settings.desk}`;
    return parseRunDesk(rows[0]?.value).markup;
  });

export const saveProviderMarkup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider: ProviderId; markup: number }) => {
    const provider = checkProviderId(input?.provider);
    const markup = Math.round(Number(input?.markup));
    if (!Number.isFinite(markup) || markup < 0 || markup > 1000) throw new Error("Phần trăm chênh từ 0 đến 1000.");
    if (provider === "groq" || provider === "alibaba") throw new Error("Nhà này có bàn giá riêng.");
    return { provider, markup };
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const name = PROVIDERS[data.provider].settings.desk;
    const sql = await openSql();
    const prev = await sql<{ value: string }>`select value from room_settings where key = ${name}`;
    const next = JSON.stringify(checkRunDesk({ ...parseRunDesk(prev[0]?.value), maintenance: false, markup: data.markup }));
    await sql`insert into room_settings (key, value) values (${name}, ${next}) on conflict (key) do update set value = ${next}`;
    await writeAudit(context.userId, `gia-${data.provider}`, null, `Phần trăm chênh ${PROVIDERS[data.provider].label}: ${data.markup}%`);
    return data.markup;
  });
