import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { checkRunDesk, parseModelList, parseRunDesk, type RunDesk } from "@/lib/run-desk";
import { checkServicePacks, parseServicePacks, type ServicePack } from "@/lib/service-pack";
import type { PriceOverride } from "@/lib/run-desk";

export type AlibabaDeskView = {
  desk: RunDesk;
  models: string[] | null;
  keyTail: string;
  packs: ServicePack[];
  groqModels: string[] | null;
};

export type ServiceMenu = {
  packs: ServicePack[];
  alibaba: { markup: number; custom: Record<string, PriceOverride>; models: string[] | null };
};

async function readSettings() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ key: string; value: string }>`
    select key, value from room_settings where key in ('service_packs', 'alibaba_desk', 'alibaba_models', 'alibaba_key')
  `;
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return { sql, map };
}

export const getServiceMenu = createServerFn({ method: "GET" }).handler(async (): Promise<ServiceMenu> => {
  const empty: ServiceMenu = { packs: [], alibaba: { markup: 0, custom: {}, models: null } };
  try {
    const { map } = await readSettings();
    const desk = parseRunDesk(map.get("alibaba_desk"));
    return {
      packs: parseServicePacks(map.get("service_packs")).filter((pack) => pack.enabled),
      alibaba: { markup: desk.markup, custom: desk.custom, models: parseModelList(map.get("alibaba_models")) },
    };
  } catch {
    return empty;
  }
});

export const getAlibabaDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AlibabaDeskView> => {
    await requireRole(context.userId, "chu");
    const { sql, map } = await readSettings();
    const groqRows = await sql<{ value: string }>`select value from room_settings where key = 'run_models'`;
    const key = map.get("alibaba_key") || "";
    return {
      desk: parseRunDesk(map.get("alibaba_desk")),
      models: parseModelList(map.get("alibaba_models")),
      keyTail: key ? key.slice(-4) : "",
      packs: parseServicePacks(map.get("service_packs")),
      groqModels: parseModelList(groqRows[0]?.value),
    };
  });

export const saveAlibabaDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: RunDesk) => checkRunDesk({ ...input, maintenance: false, note: input.note || "" }))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { sql } = await readSettings();
    const value = JSON.stringify(data);
    const prev = await sql<{ value: string }>`select value from room_settings where key = 'alibaba_desk'`;
    const before = parseRunDesk(prev[0]?.value);
    await sql`
      insert into room_settings (key, value) values ('alibaba_desk', ${value})
      on conflict (key) do update set value = ${value}
    `;
    const { describeRunDesk } = await import("@/lib/audit-note");
    await writeAudit(context.userId, "gia-alibaba", null, describeRunDesk(before, data));
    return data;
  });

export const saveAlibabaKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: string) => {
    const key = input?.trim() ?? "";
    if (key.length < 20 || key.length > 200 || /\s/.test(key)) throw new Error("Key không đúng.");
    return key;
  })
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { listModelIds } = await import("@/lib/sub/groq");
    const ids = await listModelIds(data, undefined, "alibaba");
    const { sql } = await readSettings();
    const models = JSON.stringify(ids);
    await sql`
      insert into room_settings (key, value) values ('alibaba_key', ${data})
      on conflict (key) do update set value = ${data}
    `;
    await sql`
      insert into room_settings (key, value) values ('alibaba_models', ${models})
      on conflict (key) do update set value = ${models}
    `;
    await writeAudit(context.userId, "key-alibaba", null, `${ids.length} model`);
    return ids;
  });

export const saveServicePacks = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ServicePack[]) => checkServicePacks(input))
  .handler(async ({ context, data }) => {
    await requireRole(context.userId, "chu");
    const { sql } = await readSettings();
    const value = JSON.stringify(data);
    const prev = await sql<{ value: string }>`select value from room_settings where key = 'service_packs'`;
    const before = parseServicePacks(prev[0]?.value);
    await sql`
      insert into room_settings (key, value) values ('service_packs', ${value})
      on conflict (key) do update set value = ${value}
    `;
    const { describePacks } = await import("@/lib/audit-note");
    await writeAudit(context.userId, "goi-dich", null, describePacks(before, data));
    return data;
  });
