import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin/admin-room";
import { parseModelList, parseRunDesk, type PriceOverride, type RunDesk } from "@/lib/run-desk";
import { checkServicePacks, parseServicePacks, type ServicePack } from "@/lib/service-pack";
import type { GroqLiveRow } from "@/lib/sub/groq-board";
import { parseUsdFix, type UsdFix } from "@/lib/usd-fix";

type AlibabaDeskView = {
  desk: RunDesk;
  models: string[] | null;
  keyTail: string;
  packs: ServicePack[];
  groqModels: string[] | null;
  /** Số đô la Chủ sửa tay. Xem trước gói phủ lên giá gốc. */
  usdFix: UsdFix;
  /** Bảng Alibaba đã gộp giá tự kéo (`ali_board`). Chưa phủ `usdFix`. */
  alibabaRows: GroqLiveRow[];
};

type ServiceMenu = {
  packs: ServicePack[];
  alibaba: { markup: number; custom: Record<string, PriceOverride>; models: string[] | null };
};

async function readSettings() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ key: string; value: string }>`
    select key, value from room_settings where key in ('service_packs', 'alibaba_desk', 'alibaba_models', 'alibaba_key', 'usd_fix')
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
    const boards = await sql<{ key: string; value: string }>`select key, value from room_settings where key in ('ali_board')`;
    const boardMap = new Map(boards.map((row) => [row.key, row.value]));
    const { rowsFromStoredAlibaba } = await import("@/lib/sub/alibaba-price");
    const key = map.get("alibaba_key") || "";
    return {
      desk: parseRunDesk(map.get("alibaba_desk")),
      models: parseModelList(map.get("alibaba_models")),
      keyTail: key ? key.slice(-4) : "",
      packs: parseServicePacks(map.get("service_packs")),
      groqModels: parseModelList(groqRows[0]?.value),
      usdFix: parseUsdFix(map.get("usd_fix")),
      alibabaRows: rowsFromStoredAlibaba(boardMap.get("ali_board")),
    };
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
