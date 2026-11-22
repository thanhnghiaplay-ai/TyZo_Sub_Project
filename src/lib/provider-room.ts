import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireRole, writeAudit } from "@/lib/admin-room";
import { parseModelList } from "@/lib/run-desk";
import { isProviderId, keyShapeProblem, PROVIDERS, type ProviderId } from "@/lib/sub/provider";

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
    const shape = keyShapeProblem(provider, key);
    if (shape) throw new Error(shape);
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

/**
 * Số model key PHÒNG của từng nhà (đọc từ danh sách đã lưu lúc Chủ lưu key). Ai đăng nhập cũng hỏi được:
 * chỉ trả số đếm, không trả key, không trả tên model. Nhà chưa lưu key phòng thì null.
 */
export const getRoomModelCounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<Partial<Record<ProviderId, number | null>>> => {
    const sql = await openSql();
    const out: Partial<Record<ProviderId, number | null>> = {};
    const rows = await sql<{ key: string; value: string }>`select key, value from room_settings`;
    const map = new Map(rows.map((row) => [row.key, row.value]));
    for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
      const names = PROVIDERS[id].settings;
      const list = parseModelList(map.get(names.models));
      out[id] = map.get(names.key) && list ? list.length : null;
    }
    return out;
  });

/**
 * Tên model key PHÒNG của từng nhà, để app chọn đúng model phòng có khi khách trả theo lượt
 * (dịch, nhận dạng, đọc… đều đi qua danh mục chung `model-catalog.ts`). Chỉ trả tên model, không trả key.
 * Nhà chưa lưu key phòng thì null. Groq vốn đã công khai danh sách này qua getRunDoor.
 */
export const getRoomOffer = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<Partial<Record<ProviderId, string[] | null>>> => {
    const sql = await openSql();
    const out: Partial<Record<ProviderId, string[] | null>> = {};
    const rows = await sql<{ key: string; value: string }>`select key, value from room_settings`;
    const map = new Map(rows.map((row) => [row.key, row.value]));
    for (const id of Object.keys(PROVIDERS) as ProviderId[]) {
      const names = PROVIDERS[id].settings;
      out[id] = map.get(names.key) ? parseModelList(map.get(names.models)) : null;
    }
    return out;
  });
