import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "./auth/middleware";
import { requireRole } from "./admin-room";
import { parseModalPrice } from "./sub/tyzo-modal-price";

export const getModalPrice = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  await requireRole(context.userId, "chu");
  const { getSql } = await import("./db");
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from room_settings where key = 'tyzo_modal_price'`;
  return rows[0] ? parseModalPrice(JSON.parse(rows[0].value)) : null;
});

export const saveModalPrice = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parseModalPrice).handler(async ({ data, context }) => {
  await requireRole(context.userId, "chu");
  const { getSql } = await import("./db");
  const sql = await getSql();
  await sql`insert into room_settings (key, value) values ('tyzo_modal_price', ${JSON.stringify(data)})
            on conflict (key) do update set value = excluded.value`;
  return data;
});
